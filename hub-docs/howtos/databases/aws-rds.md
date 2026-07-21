---
title: AWS RDS
sidebar_position: 2
description: Provision Amazon RDS for PostgreSQL and connect Hub with IAM auth.
---

This page walks you through provisioning Amazon RDS for PostgreSQL. You grant
Hub a database role that authenticates with AWS IAM, then point the chart at the
resulting endpoint.

IAM authentication is the recommended path for self-hosted Hub on AWS. The
`hub-api` Pod mints a short-lived RDS auth token per database connection from
credentials supplied by IAM Roles for Service Accounts (IRSA) or EKS Pod
Identity. Your cluster doesn't store a static database password.


If you can't use IAM in your environment, review the [password-auth
fallback](#password-authentication-fallback) instructions.

## Prerequisites
<!-- vale write-good.Passive = NO -->
Before you begin, have the following ready:

- An AWS account with permissions to create RDS instances, IAM roles, IAM
  policies, and (if you don't already have one) an OIDC provider for your EKS
  cluster.
- A Kubernetes cluster running on AWS with a working AWS workload-identity
  mechanism: either [IAM Roles for Service
  Accounts][iam-roles-for-service-accounts]
  on EKS or [EKS Pod
  Identity][eks-pod-identity].
  Self-managed clusters can use IRSA as long as the API server's
  service-account-issuer is registered as an IAM OIDC provider.
- `psql` (or another PostgreSQL client) installed locally, reachable to the RDS
  instance for the one-time bootstrap. A bastion or VPN is fine.
<!-- vale write-good.Passive = YES -->

:::note
This page assumes you have already read [the self-hosted
overview][architecture] and [the database overview][overview]. It does
not repeat generic Postgres requirements covered there.
:::

<!-- vale Microsoft.HeadingAcronyms = NO -->
<!-- vale Google.Headings = NO -->
## Provision RDS
<!-- vale Google.Headings = YES -->
<!-- vale Microsoft.HeadingAcronyms = YES -->

Provision the database with whichever IaC tool you already use. This section
lists only the settings that matter for Hub.

Read these AWS guides end-to-end before provisioning:

- [Creating a PostgreSQL DB instance][creating-a-postgresql-db-instance]
- [IAM database authentication for MariaDB, MySQL, and PostgreSQL][iam-database-authentication-for-mariadb-mysql-and-postgresql]
- [VPC security groups for RDS][vpc-security-groups-for-rds]

When you create the instance, set the following:

- **Engine**: PostgreSQL 18 or newer.
- **IAM database authentication**: enabled. This setting works as a per-instance
  flag. You must enable it at the instance level before you can use it for any
  single database or role.
 - **Network**: place the instance in private subnets
  and attach a security group that allows inbound TCP 5432 from the security group attached to the worker
  nodes that run `hub-api`.
- **TLS**: RDS terminates TLS by default. Note the CA bundle you need to
  trust, since RDS rotates these on a published schedule.

Record three values once the instance is available:

- the RDS endpoint hostname (for example,`hub.cluster-xxxx.us-east-1.rds.amazonaws.com`).
- the instance's **DbiResourceId** (a string starting with `db-…`). You can find
  it in the RDS console under the instance's **Configuration** tab, or via `aws
  rds describe-db-instances`. An IAM policy you create later targets this ID,
  not the instance name.
- the AWS region (for example, `us-east-1`).

:::warning
Enabling IAM database authentication on an existing instance triggers a reboot.
Schedule it.
:::

## Configure IAM authentication

IAM auth for RDS has three sides that must agree:

1. An IAM role the `hub-api` Pod can assume.
2. A policy on that role granting `rds-db:connect` for the database user Hub
   logs in as.
3. A PostgreSQL role with the same name as the IAM user, granted the `rds_iam`
   role inside the database.

### Create the database role

Connect to the instance as the master user and create the role Hub uses. The
role needs the `rds_iam` grant so RDS accepts IAM-issued tokens for it. It also
needs ownership of the Hub database so migrations can create and alter
objects.

```sql
CREATE DATABASE hub;
CREATE USER hub;
GRANT rds_iam TO hub;
GRANT ALL PRIVILEGES ON DATABASE hub TO hub;
\c hub
GRANT ALL ON SCHEMA public TO hub;
```

Hub's migrations create the `hstore` extension on first run, which requires
database-owner or superuser privileges. You can either grant ownership of the
database to `hub`:

```sql
ALTER DATABASE hub OWNER TO hub;
```

or pre-create the extension as the master user and skip the ownership grant:

```sql
\c hub
CREATE EXTENSION IF NOT EXISTS hstore;
```

:::note
`rds_iam` and password authentication are mutually exclusive on RDS. A role
granted `rds_iam` can't also log in with a password. Don't set a password on
`hub`.
:::

### Create the IAM policy

The policy below grants `rds-db:connect` for the `hub` database role on a
specific RDS instance. Replace `<region>`, `<account-id>`, and
`<dbi-resource-id>` with your values.

Save this as `hub-rds-connect-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "rds-db:connect",
      "Resource": "arn:aws:rds-db:<region>:<account-id>:dbuser:<dbi-resource-id>/hub"
    }
  ]
}
```

Create the policy:

```bash
aws iam create-policy \
  --policy-name HubRDSConnect \
  --policy-document file://hub-rds-connect-policy.json
```

Record the resulting policy ARN.

### Bind the policy to the hub-api ServiceAccount

Pick one of the two binding mechanisms below. IRSA is older and works on any EKS
cluster with an OIDC provider. Pod Identity is simpler to manage when available.

#### Option A: IAM roles for service accounts (IRSA)

Confirm your EKS cluster has an IAM OIDC provider:

```bash
aws eks describe-cluster --name <cluster-name> \
  --query "cluster.identity.oidc.issuer" --output text
```

If the issuer URL isn't yet registered with IAM, follow [Create an IAM OIDC
provider][create-an-iam-oidc-provider]
before continuing.

Save this as `hub-api-trust-policy.json`, substituting your account ID, region,
and the OIDC provider hostname returned above. The ServiceAccount name `hub-api`
and namespace `hub` must match what the chart creates.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<account-id>:oidc-provider/<oidc-provider-host>"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "<oidc-provider-host>:sub": "system:serviceaccount:hub:hub-api",
          "<oidc-provider-host>:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
```

Create the role and attach the policy:

```bash
aws iam create-role \
  --role-name hub-api \
  --assume-role-policy-document file://hub-api-trust-policy.json

aws iam attach-role-policy \
  --role-name hub-api \
  --policy-arn <hub-rds-connect-policy-arn>
```

When you install Hub, the chart creates the `hub-api` ServiceAccount. You
annotate it with the role ARN through Helm values (shown in the next
section).

#### Option B: EKS pod identity

[EKS Pod
Identity][eks-pod-identity]
replaces the OIDC trust policy with a simpler ServiceAccount-to-role association
managed by EKS.

Create a role whose trust policy lets the Pod Identity agent assume it:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "pods.eks.amazonaws.com" },
      "Action": ["sts:AssumeRole", "sts:TagSession"]
    }
  ]
}
```

Attach the RDS connect policy as in Option A, then create the association after
you install hub:

```bash
aws eks create-pod-identity-association \
  --cluster-name <cluster-name> \
  --namespace hub \
  --service-account hub-api \
  --role-arn arn:aws:iam::<account-id>:role/hub-api
```

<!-- vale write-good.Passive = NO -->
With Pod Identity, the ServiceAccount itself needs no annotations. The
association is keyed by namespace and ServiceAccount name on the EKS side.

## Configure hub

The IAM-auth Helm values omit any password Secret. `hub-api` reads the auth mode
and cloud from environment variables emitted by the chart. It then builds an RDS
auth token from the Pod's IAM credentials. It uses that token as the PostgreSQL
password on every new pool connection. TLS is required: the chart forces
`sslmode=require` whenever IAM mode is selected, even if you leave
`postgresql.sslmode` unset.
<!-- vale write-good.Passive = YES -->

Save this as `values.yaml`, filling in the placeholders:

```yaml
hub-api:
  api:
    serviceAccount:
      create: true
      # Only needed for IRSA. Pod Identity does not use ServiceAccount annotations.
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::<account-id>:role/hub-api

  postgresql:
    host: <rds-endpoint>
    port: 5432
    database: hub
    user: hub
    sslmode: require

    auth:
      mode: iam
      cloud: aws
      aws:
        region: <region>
```

Install or upgrade Hub with the rest of your self-hosted values composed in:

```bash
helm upgrade --install hub <chart-ref> \
  --namespace hub --create-namespace \
  -f values.yaml
```

If you reached this page from [the self-hosted install
guide][install], merge the snippet above into the `values.yaml` you're
already building. Don't run a separate install.

:::note
The chart ignores its `postgresql.connectionString` value when `auth.mode=iam`.
Use the discrete `host`, `port`, `database`, and `user` fields.
:::

## Verify

Watch the `hub-api` Pods roll out:

```bash
kubectl -n hub rollout status deployment/hub-api
```

The Pod runs the schema migrator as an init container before the API server
starts. Both use the same IAM auth path, so a successful rollout means both the
migrator and the server authenticated against RDS.

If the Pod is crash-looping, check its logs for one of these:
<!-- vale write-good.Passive = NO -->
- `IAM database auth requires TLS`. `postgresql.sslmode` was set to `disable`.
  Remove the override or set it to `require`.
- `database auth aws region is required`. `postgresql.auth.aws.region` is empty
  and the Pod has no `AWS_REGION` environment variable. Set the value in
  `values.yaml`.
- `PAM authentication failed` (in the RDS log). The IAM role is missing
  `rds-db:connect` for the resource, the DbiResourceId in the policy is wrong,
  or the database role wasn't granted `rds_iam`.

Log in to Hub and confirm at least one ControlPlane has been registered
or can be created. Schema is in place when the UI lists resources without
errors.
<!-- vale write-good.Passive = YES -->

## Password authentication (fallback)

Use this section only if you can't use IAM authentication, such as when running
outside AWS or on a Kubernetes cluster without workload identity. Password mode
stores a long-lived credential in a Secret. Rotate it through whatever
secret-management tool your organisation already uses.

Create the Secret in the Hub namespace:

```bash
kubectl create namespace hub
kubectl -n hub create secret generic hub-postgres \
  --from-literal=password='<your-password>'
```

Set these values instead of the IAM block:

```yaml
hub-api:
  postgresql:
    host: <rds-endpoint>
    port: 5432
    database: hub
    user: hub
    sslmode: require

    auth:
      mode: password
      passwordSecretRef:
        name: hub-postgres
        key: password
```

Create the database role with a password rather than the `rds_iam`
grant:

```sql
CREATE USER hub WITH PASSWORD '<your-password>';
GRANT ALL PRIVILEGES ON DATABASE hub TO hub;
```

Everything else (TLS, security groups, schema bootstrap) works the same as the
IAM path.

## Next step

Return to [the self-hosted install guide][install] to finish wiring Hub
against the database you just provisioned.

[architecture]: /hub/concepts/architecture
[create-an-iam-oidc-provider]: https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
[creating-a-postgresql-db-instance]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_GettingStarted.CreatingConnecting.PostgreSQL.html
[eks-pod-identity]: https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html
[iam-database-authentication-for-mariadb-mysql-and-postgresql]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html
[iam-roles-for-service-accounts]: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
[install]: /hub/howtos/install
[overview]: /hub/howtos/databases/overview
[vpc-security-groups-for-rds]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.RDSSecurityGroups.html
