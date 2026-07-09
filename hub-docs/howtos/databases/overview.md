---
title: Database setup
sidebar_position: 1
description: PostgreSQL requirements and authentication modes for Hub.
---

This page describes what Hub requires from its PostgreSQL database, the
authentication modes the chart supports, and how to pick a provisioning path for
your cloud.

Unlike the demo, a self-hosted Hub points at an externally managed PostgreSQL
instance that you provide. Because the chart does not deploy Postgres for you in
this path, you provision the database, create a role for `hub-api`, and supply
the connection details through Helm values.

## Postgres Requirements

`hub-api` is a PostgreSQL client that holds long-lived connections and runs
schema migrations on startup. The database you provide must satisfy the
following:

- **PostgreSQL version**: 18 or newer. Hub's schema uses Postgres 18's native
  `uuidv7()` function as the default for primary keys, so earlier major versions
  cannot run the migrations. Any actively-supported 18.x release is acceptable,
  including managed offerings (AWS RDS, GCP Cloud SQL, Azure Database for
  PostgreSQL) on Postgres 18 engine versions.
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
  Hub does not share schemas with other applications.
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
[sizing guide](../sizing.md) covers tuning it.
:::

## Authentication Modes

The chart exposes two authentication modes through
`hub-api.postgresql.auth.mode`. Pick one before you provision the database role.

### Password Authentication

Set `hub-api.postgresql.auth.mode=password` (the default). `hub-api` connects
using a static username and password.

The password may be supplied two ways:

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
  `hub-api.postgresql.auth.password`. The value is written into the rendered
  manifest, which means it appears in `helm get values`, in any CD tool's
  manifest cache, and in cluster audit logs. Use this only for quick
  experiments.

Password mode works against any PostgreSQL, whether self-managed, AWS RDS, GCP
Cloud SQL, or Azure Database for PostgreSQL.

### Cloud IAM Authentication

Set `hub-api.postgresql.auth.mode=iam` and `hub-api.postgresql.auth.cloud=aws`
to authenticate using short-lived IAM tokens minted per connection. No static
password is stored anywhere, and Hub forces `sslmode=require` at minimum, since
cloud Postgres providers reject IAM auth over plaintext.

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

The chart wires the IAM credentials through the `hub-api` ServiceAccount, so the
underlying credential source is whatever the cluster provides (for AWS: IRSA or
EKS Pod Identity). The provider-specific sub-page covers the exact setup.

:::note
IAM auth requires the database role to be linked to the IAM identity at the
Postgres side (such as `GRANT rds_iam TO hub;` on AWS RDS). The provider
sub-page walks through this.
:::

## Choose Your Provider

The chart's auth seam is provider-neutral, but only **AWS RDS** is wired
end-to-end today. See the provider page for full provisioning and IAM setup
steps:

- [AWS RDS](./aws-rds.md), which covers provisioning PostgreSQL on Amazon RDS and
  connecting Hub using either password or IAM authentication.

**GCP Cloud SQL** and **Azure Database for PostgreSQL** are both supported today
through the password authentication path described above. Point Hub at the
instance's connection endpoint, provide the password via a Kubernetes Secret,
and Hub treats them like any other PostgreSQL. Their managed IAM-authentication
paths (Cloud SQL IAM database authentication and Azure AD authentication for
PostgreSQL) are on the roadmap but not yet implemented. The values
`hub-api.postgresql.auth.cloud=gcp` and `=azure` are reserved for that work and
are not accepted today.

If you self-manage Postgres, treat it the same way. Provision the role and
password yourself, then point Hub at the host with password mode.

## Next Step

Pick your provider and provision the database, then return to the install
procedure:

- [Provision PostgreSQL on AWS RDS](./aws-rds.md)
- [Install Hub against your provisioned database](../install.md)
