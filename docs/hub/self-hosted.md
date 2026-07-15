---
title: Self-hosted quickstart
sidebar_label: Self-hosted quickstart
description: Install Hub on your own AWS, GCP, or Azure Kubernetes cluster.
---


## What you provide

Self-hosted replaces the demo's bundled services with ones you operate:

- A Kubernetes cluster (AWS, GCP, or Azure).
- A PostgreSQL database.
- An OIDC provider ([Entra ID, Keycloak, or generic][oidc]).
- An ingress/gateway with a CA-signed TLS certificate and DNS.

## Prerequisites by cloud

<Tabs>
<TabItem value="aws" label="AWS">

- EKS cluster, Amazon RDS for PostgreSQL (password or IAM auth), ingress and TLS,
    and DNS. Port from eng repo `self-hosted/databases/aws-rds.md`.

</TabItem>
<TabItem value="gcp" label="GCP">

- GKE cluster, Cloud SQL for PostgreSQL, ingress and TLS, and DNS. **Open:**
    GCP-specific database steps not in eng repo yet.

</TabItem>
<TabItem value="azure" label="Azure">

- AKS cluster, Azure Database for PostgreSQL, ingress and TLS, and DNS.
    **Open:** the Azure-specific database steps aren't in the eng repo yet.

</TabItem>
</Tabs>

## Install

1. Prepare `values.yaml` (database, OIDC, external URL, TLS).
2. Install the `hub` chart (up CLI recommended, or Helm. See [install
    overview][install]).
3. Bootstrap access (org/realm role bindings). Open: confirm role names.
4. Verify components are ready and open the Console.

## Next steps

- [Set up OIDC][oidc]
- [Connect a control plane][connect]
- [Production guidelines][prod]

[oidc]: /hub/oidc-configuration
[install]: /hub/install
[connect]: /hub/connections
[prod]: /hub/production-overview
