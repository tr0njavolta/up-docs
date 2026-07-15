---
title: Backup and Restore
description: "Learn how to use the built-in backup and restore controller"
sidebar_position: 15
plan: standard
---

<Standard />

Upbound Crossplane offers a built-in backup and restore feature
that lets you configure automatic schedules for taking snapshots of
your control planes. You can restore data from these backups in-place or in a
new control plane. This guide explains how to use Backup and Restore for disaster
recovery or upgrade scenarios. 

## Prerequisites

Before you begin, make sure you have:

* a running Upbound Crossplane control plane cluster
* a valid **Standard** license applied to your control plane
* resources deployed and managed in the control plane
* Cloud provider credentials

Maintaining a healthy backup cadence is useful to prevent data loss or
operational downtime in the event of accidental deletion, human error, or
upstream failures.


## Backup

A control plane backup object requires:
* a `BackupConfig` that defines your cloud provider object store and secret
* a `Backup` that specifies your backup name and deletion policy

UXP can capture your control plane and stores the backup information in a cloud
object store with a `BackupConfig`. Backup operations export:

* Crossplane core `.crossplane.io` CRDs
* Upbound core `.upbound.io` CRDs
* CRDs owned by Crossplane packages
* CRDs owned by a `CompositeResourceDefinition`
* `Secrets` and `ConfigMaps`

Backups capture schema definitions and configuration needed to recreate your
platform setup, not the actual provisioned resources themselves.

Upbound Crossplane needs a `BackupConfig` object that defines your provider, the
name of your backup bucket and the credentials associated with that cloud
account.

### Create a `BackupConfig`

Create a Kubernetes secret with your cloud provider credentials. The example
below uses AWS, but Backups are compatible with all major cloud providers.

```shell
kubectl create secret generic aws-secret --from-literal=my-aws-secret=<your-credentials>
```

To backup your control plane to your cloud provider object store, you need to
create a `BackupConfig` and apply it to your cluster:

```yaml
apiVersion: admin.uxp.upbound.io/v1beta1
kind: BackupConfig
metadata:
  name: default
spec:
  objectStorage:
    provider: AWS
    bucket: my-bucket
    config:
      endpoint: s3.us-west-1.amazonaws.com
    credentials:
      source: Secret
      secretRef:
        name: aws-secret
        key: my-aws-secret
```

The **required** properties of this object are:

* `spec.objectStorage` to configure the bucket name and object store endpoint
* `spec.objectStorage.credentials` to pass cloud provider secrets

### Create a `ClusterRole`

Your cluster needs permissions to the `upbound-controller-manager` component to
backup. Create a new `ClusterRole` for your backup operations:

```yaml 
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: br-role
  labels:
    rbac.crossplane.io/aggregate-to-crossplane: "true"
rules:
- apiGroups:
  - <your_apiGroups>
  resources:
  - "*"
  verbs:
  - "*"
```

:::note
Your `apiGroups` field expects a list of all `apiVersions` in your Composition.
:::

### Create a manual `Backup`

To capture the control plane state, you need to create a `Backup` and apply it
to your cluster to kick off the actual backup task:

```yaml
apiVersion: admin.uxp.upbound.io/v1beta1
kind: Backup
metadata:
  name: <your_backup_name>
spec:
  configRef:
    name: default
  deletionPolicy: Delete
```

When you apply this `Backup`, UXP creates a compressed archive of Crossplane
resource manifests and stores them in your configured object storage.

```shell
kubectl apply -f my-backup.yaml
```

Verify the backup:

```shell
kubectl get backup
NAME        PHASE       RETRIES   TTL   AGE
my-backup   Completed                   34s
```

### Create a `BackupSchedule`

You can also create a `BackupSchedule` to automatically trigger backups based on your
`BackupConfig`.

```yaml
apiVersion: admin.uxp.upbound.io/v1beta1
kind: BackupSchedule
metadata:
  name: <your_backup_name>
spec:
  configRef:
    name: default
  deletionPolicy: Delete
  schedule: '@weekly'
```

The `spec.schedule` field is a [Cron-formatted][cron] string. Some common examples are below:

| Entry             | Description                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `@hourly`         | Run once an hour.                                                                                 |
| `@daily`          | Run once a day.                                                                                   |
| `@weekly`         | Run once a week.                                                                                  |
| `0 0/4 * * *`     | Run every 4 hours.                                                                                |
| `0/15 * * * 1-5`  | Run every fifteenth minute on Monday through Friday.                                              |
| `@every 1h30m10s` | Run every 1 hour, 30 minutes, and 10 seconds. Hour is the largest measurement of time for @every. |



### Backup archive storage structure

UXP stores completed backups in the following format:

```shell-noCopy
s3://<bucket>/<prefix>/<backupName or scheduleName>/<timestampedName>/
├── resources.tar.gz – compressed archive of Crossplane resource manifests
└── uxp-backup.yaml – serialized Backup CR manifest for traceability
```

## Restore

A control plane restore operation requires:

* a `Restore` object to kick off the restore operation

### Restoration modes

The two modes for restoring your control plane from a backup are:

1. **In-place**: Restores your resources into the same control plane cluster.
   This mode is suitable for disaster recovery or rollback scenarios. All
   existing resources in the control plane are overwritten by a restore
   operation.
2. **Cross-control plane**: Restores your resources into a different control
   plane cluster. Requires matching versions of UXP.

### Create a `Restore` object

Your `Restore` object specifies the backup name you specified in the previous
step:

```yaml

apiVersion: admin.uxp.upbound.io/v1beta1
kind: Restore
metadata:
  name: my-restore
spec:
  configRef:
    name: default
  backupName: <your_backup_name>-backup
```

Verify the restore:

```shell
kubectl get restore
NAME         PHASE       RETRIES   AGE
my-restore   Completed   2        19s
```

To verify your resources:

```shell
kubectl get composite
NAME       SYNCED   READY   COMPOSITION   AGE
my-app     True     True    app-yaml      94s
```

## Advanced options

<!-- vale Google.Headings = NO -->
### Set Time-To-Live
<!-- vale Google.Headings = YES -->

You can set your backup Time-To-Live (TTL) to automate cleanup. In both `Backup`
and `BackupSchedule` objects, you can add `spec.ttl`. For example:

```yaml
apiVersion: admin.uxp.upbound.io/v1beta1
kind: Backup
metadata:
  name: <your_backup_name>
spec:
  configRef:
    name: default
  deletionPolicy: Delete
  ttl: 168h # Backup deleted after 7 days
```

**TTL Best Practices**

<!-- vale Upbound.Spelling = NO -->
<!-- ignore ttl -->
| Environment | Recommended TTL | Example Values |
|-------------|----------------|----------------|
| Development/Test | Short TTLs | 24 to 72 hours |
| Production | Longer TTLs | 7 to 30 days |
<!-- vale Upbound.Spelling = YES -->

### Resource exclusion 

You can customize resources in the backup scope with `spec.excludedResources`. For
example:

```yaml
apiVersion: admin.uxp.upbound.io/v1beta1
kind: Backup
metadata:
  name: <your_backup_name>
spec:
  excludedResources:
  - "xclusters.aws.platformref.upbound.io"
  - "xdatabase.aws.platformref.upbound.io"
  - "xrolepolicyattachment.iam.aws.crossplane.io"
```

:::warning
You must specify resource names in lowercase "resource.group" format (for example, `xclusters.aws.platformref.upbound.io`). Using only the resource kind (for example, `XCluster`) isn't supported.
:::

### Deletion policy

You can automate how your backups behave when you delete resources with the
`deletionPolicy` field in your `Backup` or `BackupSchedule` objects. For
example:

```yaml
apiVersion: admin.uxp.upbound.io/v1beta1
kind: Backup
metadata:
  name: <your_backup_name>
spec:
  configRef:
    name: default
  deletionPolicy: Orphan # Retains the backup in resource deletion
```

**Deletion Policy Best Practices**
<!-- vale write-good.Passive = NO -->
| Deletion Policy | Environment | Use Case | Behavior |
|-----------------|-------------|----------|----------|
| `Delete` | Development/Test | Auto cleanup | Backups deleted when the resource is deleted |
| `Orphan` | Production | Long-term archival | Backups retained even if the resource is deleted |
<!-- vale write-good.Passive = YES -->



[cron]: https://en.wikipedia.org/wiki/Cron
