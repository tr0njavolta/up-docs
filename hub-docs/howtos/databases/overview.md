---
title: Database setup
sidebar_position: 1
description: PostgreSQL Requirements and authentication modes for Hub.
---

This page describes hub requirements for the PostgreSQL database you provide.
You learn about the authentication modes supported in the hub Helm chart and
how to choose a provisioning path for your cloud.

The hub requires an externally managed PostgreSQL instance that you provision,
create `hub-api` roles for, and give connection details through Helm values.

<!-- vale Google.Headings = NO -->
## PostgreSQL requirements
<!-- vale Google.Headings = YES -->

`hub-api` is a PostgreSQL client that holds long-lived connections and runs
schema migrations on startup. 

Your database must have:

- **PostgreSQL version**: 18 or newer. Hub's schema uses Postgres 18's native
  `uuidv7()` function as the default for primary keys, so earlier major versions
  can't run the migrations. Any actively supported 18.x release is acceptable,
  including managed offerings (AWS RDS, GCP Cloud SQL, Azure Database for
  PostgreSQL) on PostgreSQL 18 engine versions.
- **Required extensions**: `hub-api` runs `CREATE EXTENSION IF NOT EXISTS
  hstore` from its first migration. The role that runs migrations needs
  privileges to create that extension, or a database administrator must create
  it once before install:

  ```sql
  CREATE EXTENSION IF NOT EXISTS hstore;
  ```

  `hstore` comes with PostgreSQL's `contrib` modules and is available on every
  mainstream managed Postgres service.
- **A dedicated database and role**: provision a database for Hub (the default
  name is `postgres`, but any name works) and a role with full privileges on it.
  Hub doesn't share schemas with other applications.
- **TLS**: required for any production deployment. IAM authentication (see
  below) forces TLS regardless of the `sslmode` Helm value.
- **Network reachability**: the database must be reachable from the namespace
  where `hub-api` runs. For cloud-managed databases, this usually means the
  cluster's nodes (or the workload's egress NAT) sit in a network that the
  database's security group or firewall allows.

:::note
Hub holds a small connection pool per `hub-api` Pod. Plan for `replicas x
pool_size` connections from the application tier, plus the migration job that
runs on every `helm upgrade`. The pool size is conservative by default. The
[sizing guide][sizing] covers tuning it.
:::

## Authentication modes

The chart exposes two authentication modes through
`hub-api.postgresql.auth.mode`. Pick one before you provision the database role.

### Password authentication

Set `hub-api.postgresql.auth.mode=password` (the default). `hub-api` connects
using a static username and password.

You can supply the password two ways:

- **Kubernetes Secret reference (recommended).** Create a Secret in the Hub
  namespace containing the password under a key, then point the chart at it:

  ```yaml
  hub-api:
    postgresql:
      host: <db-host>
      port: 5432
      database: <db-name>
      user: <db-user>
      sslmode: require
      auth:
        mode: password
        passwordSecretRef:
          name: hub-postgres-credentials
          key: password
  ```

- **Inline value (not recommended).** Pass the password directly via
  `hub-api.postgresql.auth.password`. The chart writes the value into the rendered
  manifest, which means it appears in `helm get values`, in any CD tool's
  manifest cache, and in cluster audit logs. Use this only for quick
  experiments.

Password mode works against any PostgreSQL, whether self-managed, AWS RDS, GCP
Cloud SQL, or Azure Database for PostgreSQL.

### Cloud IAM authentication
<!-- vale write-good.Passive = NO -->
Set `hub-api.postgresql.auth.mode=iam` and `hub-api.postgresql.auth.cloud=aws`
to authenticate using short-lived IAM tokens minted per connection. No static
password is stored anywhere, and the hub forces `sslmode=require` at minimum, since
cloud Postgres providers reject IAM auth over plaintext.
<!-- vale write-good.Passive = YES -->

```yaml
hub-api:
  postgresql:
    host: <rds-endpoint>
    port: 5432
    database: <db-name>
    user: <iam-db-user>
    sslmode: require
    auth:
      mode: iam
      cloud: aws
      aws:
        region: <aws-region>
```

The chart wires the IAM credentials through the `hub-api` ServiceAccount. The
underlying credential source is whatever the cluster provides (for AWS: IRSA or
EKS Pod Identity). The provider-specific sub-page covers the exact setup.

:::note
IAM auth requires you link the database role to the IAM identity at the
PostgreSQL side (such as `GRANT rds_iam TO hub;` on AWS RDS). The provider
sub-page walks through this.
:::

## Choose your provider
<!-- vale write-good.Passive = NO -->
The chart's auth seam is provider-neutral, but only **AWS RDS** is wired
end-to-end today. See the provider page for full provisioning and IAM setup
steps:

- [AWS RDS][aws-rds], which covers provisioning PostgreSQL on Amazon RDS and
  connecting Hub using either password or IAM authentication.

**GCP Cloud SQL** and **Azure Database for PostgreSQL** are both supported today
through the password authentication path described above. Point Hub at the
instance's connection endpoint, provide the password via a Kubernetes Secret,
and Hub treats them like any other PostgreSQL. Their managed IAM-authentication
paths (Cloud SQL IAM database authentication and Azure AD authentication for
PostgreSQL) are on the roadmap but not yet implemented. The values
`hub-api.postgresql.auth.cloud=gcp` and `=azure` are reserved for that work and
aren't accepted today.
<!-- vale write-good.Passive = YES -->

If you self-manage Postgres, treat it the same way. Provision the role and
password yourself, then point Hub at the host with password mode.

## Next step

Pick your provider and provision the database, then return to the install
procedure:

- [Provision PostgreSQL on AWS RDS][aws-rds]
- [Install Hub against your provisioned database][install]

[aws-rds]: /hub/howtos/databases/aws-rds
[install]: /hub/howtos/install
[sizing]: /hub/howtos/sizing
