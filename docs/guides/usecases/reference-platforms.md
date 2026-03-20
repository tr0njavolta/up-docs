---
title: Reference platforms
sidebar_position: 150
description: "Use Upbound reference platforms as complete, working examples of internal developer platforms built with Crossplane."
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Reference platforms are full-featured, production-oriented Crossplane configurations that Upbound's solutions team maintains. Each one demonstrates how to build an internal developer platform (IDP) for a specific cloud provider using Upbound DevEx tooling, KCL functions, and official Upbound providers.

You can use a reference platform in two ways:

- **Install and run it as-is** to get a working platform for your team without building from scratch.
- **Fork and customize it** as the starting point for your own platform configuration.

## Available reference platforms

| Platform | Cloud provider | What it provides |
|---|---|---|
| [platform-ref-aws][refAws] | AWS | EKS clusters, RDS databases, load balancer controller, observability, GitOps |
| [platform-ref-azure][refAzure] | Azure | AKS clusters, Azure databases, networking, GitOps |
| [platform-ref-gcp][refGcp] | GCP | GKE clusters, Cloud SQL databases, networking, GitOps |

All three are available on the [Upbound Marketplace][marketplace] and installable with a single `up` CLI command.

## What platform-ref-aws provides

`platform-ref-aws` wires together seven specialized configurations to give development teams a self-service API for provisioning complete AWS infrastructure:

- **Network** — VPCs, subnets, and security groups
- **EKS** — fully configured Kubernetes clusters with IAM roles and node groups
- **AWS Load Balancer Controller** — deployed after EKS is ready, with VPC propagation and webhook management
- **RDS databases** — PostgreSQL and MariaDB instances that connect securely to EKS clusters
- **Observability** — an OSS observability stack (Prometheus, Grafana)
- **GitOps** — Flux with extended timeouts and rollback limits
- **App** — a deployment model for applications that consume the cluster and database

The platform exposes two top-level claims:

- `Cluster` — provisions the full EKS stack (networking, EKS, load balancer controller, Flux, observability) in the correct order
- `XSQLInstance` — provisions an RDS database that connects to a cluster

Resources deploy in dependency order automatically: networking first, then EKS, then controllers, then application components.

## Prerequisites

To install and use a reference platform, you need:

- the [up CLI][upCli] installed
- an Upbound account
- a running Spaces control plane, or access to Upbound Cloud

## Install a reference platform

1. Install the reference platform onto your control plane.

   <Tabs groupId="cloud-provider">
   <TabItem value="aws" label="AWS">

   ```shell
   up ctp configuration install xpkg.upbound.io/upbound/platform-ref-aws:v1.3.0
   ```

   </TabItem>
   <TabItem value="azure" label="Azure">

   ```shell
   up ctp configuration install xpkg.upbound.io/upbound/platform-ref-azure:v0.5.0
   ```

   </TabItem>
   <TabItem value="gcp" label="GCP">

   ```shell
   up ctp configuration install xpkg.upbound.io/upbound/platform-ref-gcp:v0.7.0
   ```

   </TabItem>
   </Tabs>

   The control plane pulls and installs the configuration package and all its dependencies, including the required providers and functions.

2. Verify the configuration installed successfully.

   ```shell
   kubectl get configurations
   ```

   The configuration shows `INSTALLED: True` and `HEALTHY: True` when ready. This can take a few minutes while providers initialize.

## Configure cloud credentials

Before creating any resources, give the control plane credentials to talk to your cloud provider.

<Tabs groupId="cloud-provider">
<TabItem value="aws" label="AWS">

1. Create a Kubernetes secret with your AWS credentials.

   ```shell
   kubectl create secret generic aws-secret \
     -n crossplane-system \
     --from-file=creds=./aws-credentials.ini
   ```

   Your `aws-credentials.ini` file should contain your AWS access key ID and secret access key in the standard INI format.

2. Create a `ProviderConfig` that points to the secret.

   ```yaml
   apiVersion: aws.upbound.io/v1beta1
   kind: ProviderConfig
   metadata:
     name: default
   spec:
     credentials:
       source: Secret
       secretRef:
         namespace: crossplane-system
         name: aws-secret
         key: creds
   ```

   ```shell
   kubectl apply -f providerconfig.yaml
   ```

</TabItem>
<TabItem value="azure" label="Azure">

1. Create a service principal and store its credentials as a Kubernetes secret.

   ```shell
   kubectl create secret generic azure-secret \
     -n crossplane-system \
     --from-file=creds=./azure.json
   ```

2. Create a `ProviderConfig` that references the secret.

   ```yaml
   apiVersion: azure.upbound.io/v1beta1
   kind: ProviderConfig
   metadata:
     name: default
   spec:
     credentials:
       source: Secret
       secretRef:
         namespace: crossplane-system
         name: azure-secret
         key: creds
   ```

   ```shell
   kubectl apply -f providerconfig.yaml
   ```

</TabItem>
<TabItem value="gcp" label="GCP">

1. Create a Kubernetes secret from your GCP service account key file.

   ```shell
   kubectl create secret generic gcp-secret \
     -n crossplane-system \
     --from-file=creds=./gcp-credentials.json
   ```

2. Create a `ProviderConfig` that references the secret.

   ```yaml
   apiVersion: gcp.upbound.io/v1beta1
   kind: ProviderConfig
   metadata:
     name: default
   spec:
     projectID: {your-gcp-project-id}
     credentials:
       source: Secret
       secretRef:
         namespace: crossplane-system
         name: gcp-secret
         key: creds
   ```

   ```shell
   kubectl apply -f providerconfig.yaml
   ```

</TabItem>
</Tabs>

## Provision resources

With the platform installed and credentials configured, you can provision infrastructure through the platform's self-service API.

### Create a cluster

1. Create a `Cluster` claim. This provisions the full EKS stack — networking, the EKS cluster, load balancer controller, observability, and GitOps.

   ```yaml
   apiVersion: aws.platformref.upbound.io/v1alpha1
   kind: Cluster
   metadata:
     name: my-cluster
     namespace: default
   spec:
     parameters:
       nodes:
         count: 3
         size: medium
       services:
         operators:
           flux:
             version: "2.1.0"
   ```

   ```shell
   kubectl apply -f cluster-claim.yaml
   ```

2. Watch the cluster come up. Full provisioning takes 15–20 minutes.

   ```shell
   kubectl get cluster my-cluster
   ```

   You can also trace the full resource tree with the Crossplane CLI:

   ```shell
   crossplane beta trace cluster.aws.platformref.upbound.io/my-cluster
   ```

### Create a database

Once your cluster is ready, create an RDS database. The database claim connects the instance securely to your cluster's network.

1. Create an `XSQLInstance` claim.

   ```yaml
   apiVersion: aws.platformref.upbound.io/v1alpha1
   kind: XSQLInstance
   metadata:
     name: my-db
     namespace: default
   spec:
     parameters:
       storageGB: 20
       engine: postgresql
       engineVersion: "16.4"
       clusterRef:
         name: my-cluster
   ```

   ```shell
   kubectl apply -f db-claim.yaml
   ```

2. Check the database status.

   ```shell
   kubectl get xsqlinstance my-db
   ```

### Deploy an application

After the cluster and database are ready, deploy an application that consumes them.

1. Apply an `App` claim.

   ```shell
   kubectl apply -f examples/app-xr.yaml
   ```

2. List all managed resources to confirm everything is running.

   ```shell
   kubectl get managed
   ```

## Use a reference platform as a starting point

Reference platforms are designed to be forked and adapted. The repository structure gives you clear separation between the API layer (`apis/`), the composition logic (`functions/`), examples (`examples/`), and tests (`tests/`).

To build your own platform from a reference platform:

1. Fork the reference platform repository on GitHub.

2. Clone your fork and initialize it as an Upbound project.

   ```shell
   git clone https://github.com/{your-org}/platform-ref-aws
   cd platform-ref-aws
   ```

3. Run the project locally to confirm it builds.

   ```shell
   up project run --local
   ```

4. Modify the API definitions in `apis/` to match your organization's requirements — add fields, remove capabilities you don't need, or change defaults.

5. Update the KCL composition logic in `functions/` to implement your changes.

6. Run the tests to verify your changes don't break existing behavior.

   ```shell
   up test run tests/*
   ```

7. Build and publish your customized platform to your own Marketplace organization.

   ```shell
   up project build
   ```

The reference platforms use [Upbound DevEx][devex] conventions throughout, so the tooling — `up project build`, `up test run`, `up composition render` — works the same in your fork.

## Clean up

To remove the resources you created:

```shell
kubectl delete -f app-claim.yaml
kubectl delete -f db-claim.yaml
kubectl delete -f cluster-claim.yaml
```

Wait for all managed resources to be deleted before removing the configuration:

```shell
kubectl get managed
kubectl delete configuration platform-ref-aws
```

[refAws]: https://github.com/upbound/platform-ref-aws
[refAzure]: https://github.com/upbound/platform-ref-azure
[refGcp]: https://github.com/upbound/platform-ref-gcp
[marketplace]: https://marketplace.upbound.io/configurations
[upCli]: /manuals/cli/overview
[devex]: /devex/overview
