---
title: Architecture
sidebar_position: 1
description: How a self-hosted Hub installation fits together and what you provide.
---

This page explains what a real self-hosted Hub installation looks like, what you
need to provide, and how to choose between the sub-guides in this section.

Unlike [the demo](/getstarted/new-users/controlplanes-quickstart), a self-hosted installation uses an
externally-managed PostgreSQL database, an external OIDC provider, and a real
CA-signed TLS certificate that you will need to supply.

## Architecture

A self-hosted Hub has one cluster running the Hub control-plane components and
one or more observed Kubernetes clusters running a `hub-connector`. The
connector pushes resource state to `hub-api`. Hub does not pull. End users hit
`hub-api` and `hub-webui` through your ingress; machine clients (the connector,
CLI tools) authenticate against `hub-api` via OIDC-style token exchange.

```text
        ┌──────────────────────────────────────────────────────────┐
        │              Hub installation cluster                    │
        │                                                          │
        │   ┌──────────────┐         ┌──────────────┐              │
        │   │   hub-webui  │◀───────▶│   hub-api    │──┐           │
        │   └──────────────┘         │              │  │           │
        │          ▲                 │  :8080 API   │  │           │
        │          │                 │  :8444 token │  │           │
        │          │                 │    exchange  │  │           │
        │          │                 └──────────────┘  │           │
        │          │                        ▲          ▼           │
        │          │                        │   ┌─────────────┐    │
        │          │                        │   │  PostgreSQL │    │
        │          │                        │   │ (external)  │    │
        │          │                        │   └─────────────┘    │
        │   ┌──────┴───────────────┐        │                      │
        │   │ Ingress / Gateway API │       │                      │
        │   │  (your TLS cert)      │       │                      │
        │   └───────────┬───────────┘       │                      │
        └───────────────┼───────────────────┼──────────────────────┘
                        │                   │
                        │ HTTPS             │ OIDC discovery
                        ▼                   ▼
              ┌──────────────────┐  ┌──────────────────┐
              │   Browser /      │  │   OIDC provider  │
              │   CLI clients    │  │   (external)     │
              └──────────────────┘  └──────────────────┘
                                            ▲
                                            │ token exchange
                        ┌───────────────────┴───────────────────┐
                        │                                       │
            ┌───────────┴────────────┐             ┌────────────┴───────────┐
            │ Observed cluster A     │             │ Observed cluster B     │
            │                        │             │                        │
            │   ┌──────────────┐     │             │   ┌──────────────┐     │
            │   │ hub-connector│─────┼─── HTTPS ───┼──▶│ hub-connector│─────┼──▶ hub-api
            │   └──────┬───────┘     │             │   └──────┬───────┘     │
            │          │             │             │          │             │
            │   ┌──────▼───────┐     │             │   ┌──────▼───────┐     │
            │   │  Crossplane  │     │             │   │  Crossplane  │     │
            │   │   resources  │     │             │   │   resources  │     │
            │   └──────────────┘     │             │   └──────────────┘     │
            └────────────────────────┘             └────────────────────────┘
```

For a deeper understanding of the system, see [the architecture
reference](/hub/architecture).

## What You Provide

- **A PostgreSQL database.** `hub-api` requires its own database. A managed
  offering (RDS, Cloud SQL, Azure Database for PostgreSQL) or a self-managed
  instance both work. See [the databases overview](/hub/db-overview) for
  the version, extensions, and authentication modes Hub supports.
- **An OIDC provider.** Any OIDC-compliant provider with a discovery endpoint,
  email claim, and configurable group claim will work. See [the OIDC
  overview](/hub/oidc-configuration) for the contract and the per-provider guides.
- **Ingress with a real TLS certificate.** Provide a Gateway API setup or an
  Ingress controller, plus a CA-signed certificate.
- **DNS.** Pick the hostnames you will use for `hub-api` and `hub-webui`
  (typically `api.<your-domain>` and `ui.<your-domain>`) and create the DNS
  records before install. The OIDC redirect URI is computed from them and must
  match what the provider has registered.
- **Kubernetes RBAC for connectors.** Each observed cluster needs the
  `hub-connector` ServiceAccount to be able to read the Crossplane resources you
  want Hub to see. The connector chart creates the binding from its own values.
  You confirm the cluster role matches your access policy.

The full pre-flight checklist (versions, sizing, network paths) lives in
[prerequisites](/hub/install-prereqs). Read it before you touch the install page.

## What Upbound Supports

Hub is tested and supported when its database and supporting infrastructure run
on Amazon Web Services (AWS), Google Cloud Platform (GCP), or Microsoft Azure.
These are the only environments covered by Upbound support. Running Hub on any
other cloud provider, on-premises, or in a self-hosted environment is possible
but unsupported. In these configurations you are responsible for provisioning,
operating, and troubleshooting the underlying infrastructure. Upbound may
provide best-effort guidance but does not guarantee compatibility, performance,
or issue resolution. Any such deployment is at your own risk.

## What the Chart Provides

The `hub` umbrella chart at `<chart-ref>` installs three subcharts - `hub-api`,
`hub-webui` and `hub-connector`. `hub-api` is the only chart that is required
for an operational API that can accept resources and serve responses.
`hub-webui` is optional (but recommended) to interact with the system without
using the API directly.

- **`hub-api` Deployment.** The API server, plus a Kubernetes Job that runs
  schema migrations on install and upgrade.
- **`hub-webui` Deployment.** The browser UI. Optional, disable it if you only
  want the API.
- **`hub-connector` Deployment.** You install it once per observed control
  plane, typically as a separate Helm release in each observed cluster. The
  [architecture reference](/hub/architecture) describes the
  connector's data and authentication flow, and the [demo
  quickstart](/hub/connect-second-cluster) shows a worked example of
  installing the standalone connector chart against a running Hub.
- **Bootstrap configuration.** A Kubernetes Secret rendered from
  `hub-api.bootstrap.files`. Use it to register your initial Hub objects at
  install time. That covers the first `IdentityProvider`, the first
  `ControlPlane`, plus an `OrganizationRoleBinding` linking your OIDC admin
  group to Hub's admin role. The first login then opens at a usable cluster.

## Next Step

Work through the section in order:

- [Prerequisites](/hub/install-prereqs). The full pre-flight checklist for cluster,
  network, storage, and dependencies.
- [OIDC configuration](/hub/oidc-configuration). Provider contract and per-provider setup.
- [Databases overview](/hub/db-overview). Postgres requirements and the AWS
  RDS guide.
- [Install](/hub/install). `helm install` against externally-managed Postgres and
  OIDC.

Once Hub is serving real traffic, the [production
overview](/hub/production-overview) covers sizing, high availability,
autoscaling, RBAC, and upgrades.
