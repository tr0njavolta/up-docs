---
title: 'Databases-as-a-service'
sidebar_position: 200
description: "Provision managed PostgreSQL, MySQL, and MariaDB instances across AWS, Azure, and GCP using the configuration-dbaas Configuration package."
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

The `configuration-dbaas` package adds a `XSQLInstance` API to your control plane. Development teams use this API to provision managed database instances on AWS, Azure, or GCP without directly managing cloud-specific resources.

This guide assumes you've set up the IDP starter kit. Read the [Get Started][getStarted] guide first if you haven't.

## Supported database engines

Engine availability varies by cloud provider:

| Engine | AWS | Azure | GCP |
|---|---|---|---|
| PostgreSQL | ✅ | ✅ | ✅ |
| MySQL | ❌ | ✅ | ✅ |
| MariaDB | ✅ | ❌ | ❌ |

## Add the configuration

Add the `configuration-dbaas` package to the frontend control plane in your IDP starter kit:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: upbound-configuration-dbaas
spec:
  package: xpkg.upbound.io/upbound/configuration-dbaas:v0.5.0
```

```shell
kubectl apply -f configuration.yaml
```

Verify the configuration is installed and healthy:

```shell
kubectl get configuration upbound-configuration-dbaas
```

The configuration shows `INSTALLED: True` and `HEALTHY: True` when ready.

## Provision a database

Provisioning a database requires two steps: create a Kubernetes secret containing the database password, then create an `XSQLInstance` that references it.

### Create a password secret

Create a Kubernetes secret with the password your database instance will use:

```shell
kubectl create secret generic my-db-password \
  --namespace=default \
  --from-literal=password='your-secure-password'
```

### Create an XSQLInstance

<Tabs groupId="cloud-provider">
<TabItem value="aws" label="AWS">

```yaml
apiVersion: dbaas.upbound.io/v1alpha1
kind: XSQLInstance
metadata:
  name: my-postgres-db
spec:
  parameters:
    provider: aws
    region: us-west-2
    engine: postgres
    engineVersion: "16.3"
    storageGB: 20
    passwordSecretRef:
      namespace: default
      name: my-db-password
      key: password
  writeConnectionSecretToRef:
    name: my-postgres-db-conn
    namespace: default
```

</TabItem>
<TabItem value="azure" label="Azure">

```yaml
apiVersion: dbaas.upbound.io/v1alpha1
kind: XSQLInstance
metadata:
  name: my-postgres-db
spec:
  parameters:
    provider: azure
    region: westus
    engine: postgres
    engineVersion: "16"
    storageGB: 32
    passwordSecretRef:
      namespace: default
      name: my-db-password
      key: password
  writeConnectionSecretToRef:
    name: my-postgres-db-conn
    namespace: default
```

</TabItem>
<TabItem value="gcp" label="GCP">

```yaml
apiVersion: dbaas.upbound.io/v1alpha1
kind: XSQLInstance
metadata:
  name: my-postgres-db
  namespace: default
spec:
  parameters:
    provider: gcp
    region: us-west2
    engine: postgres
    engineVersion: "15"
    storageGB: 10
    passwordSecretRef:
      namespace: default
      name: my-db-password
      key: password
  writeConnectionSecretToRef:
    name: my-postgres-db-conn
    namespace: default
```

</TabItem>
</Tabs>

```shell
kubectl apply -f database.yaml
```

## Verify the database

Check the status of your `XSQLInstance`:

```shell
kubectl get xsqlinstance my-postgres-db
```

```
NAME             CLOUD   ENGINE    VERSION   SYNCED   READY
my-postgres-db   aws     postgres  16.3      True     True
```

Full provisioning typically takes 10–15 minutes. You can trace the complete resource tree with the Crossplane CLI:

```shell
crossplane beta trace xsqlinstance.dbaas.upbound.io/my-postgres-db
```

## Connect your application

When the database is ready, `configuration-dbaas` writes connection details to the secret you specified in `writeConnectionSecretToRef`. The keys in the secret vary by cloud provider:

| Key | AWS | Azure | GCP |
|---|---|---|---|
| `username` | ✅ | ✅ | ✅ |
| `password` | ✅ | ✅ | ✅ |
| `host` | ✅ | ✅ | ✅ |
| `endpoint` | ✅ | ❌ | ❌ |
| `port` | ❌ | ✅ | ❌ |
| `serverCACertificateCert` | ❌ | ❌ | ✅ |

Reference this secret in your application's deployment to inject connection details at runtime.

## XSQLInstance parameters

| Parameter | Required | Description |
|---|---|---|
| `provider` | No | Cloud provider: `aws`, `azure`, or `gcp` |
| `region` | No | Cloud region for the database instance |
| `engine` | Yes | Database engine: `postgres`, `mysql`, or `mariadb` (see support matrix above) |
| `engineVersion` | No | Database engine version |
| `storageGB` | Yes | Storage size in gigabytes |
| `passwordSecretRef` | Yes | Reference to a Kubernetes secret containing the database password |
| `providerConfigName` | No | Name of the `ProviderConfig` to use. Defaults to `default` |
| `deletionPolicy` | No | What happens to the cloud resource when the claim is deleted: `Delete` (default) or `Orphan` |

## Supported AWS regions

The following AWS regions have full availability zone mapping:

`us-east-1`, `us-east-2`, `us-west-1`, `us-west-2`, `eu-west-1`, `eu-west-2`, `eu-central-1`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`

Other regions fall back to `us-west-2` availability zones. To add support for an additional region, update the region-to-AZ mapping in `functions/xsqlinstances/main.k` in the [configuration-dbaas repository][dbaasRepo].

## Next steps

- Connect a database to a cluster provisioned with [clusters-as-a-service][caas]
- Add the [app configuration][app] to deploy workloads that consume the database connection secret

[getStarted]: /guides/solutions/get-started
[caas]: ./caas.md
[app]: ./app.md
[dbaasRepo]: https://github.com/upbound/configuration-dbaas
