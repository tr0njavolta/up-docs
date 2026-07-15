---
title: Prerequisites
sidebar_position: 1
description: Cluster, ingress, DNS, Postgres, and OIDC requirements for a self-hosted Hub.
---

This page is the pre-flight checklist your cluster and surrounding
infrastructure must satisfy before you install and manage self-hosted Hub.

Unlike the demo, a self-hosted install relies on externally-managed Postgres, an
external OIDC provider, and a real TLS certificate. You are required to bring
those yourself.

Work through every section below. The [install page](/hub/install) assumes each
item here is already in place.

## Cluster Requirements

You need a Kubernetes cluster that you administer with `cluster-admin`.

- **Kubernetes version**: 1.29 or later. The chart relies on stable Gateway API
  CRDs and on Pod security primitives available in 1.29+. Earlier versions are
  not tested and may render templates that the API server rejects.
- **Cluster-admin access**: the install creates a Namespace, ServiceAccounts,
  RBAC, Deployments, Services, Secrets, and (optionally) Gateway API resources.
  You can scope the install RBAC down after first install. See the chart's
  generated manifests for the bound roles.

:::note
Hub does not require any cluster-scoped operators beyond what you choose to use
for ingress, TLS, or Postgres. The chart installs into a single Namespace.
:::

## Ingress and TLS

`hub-api` and `hub-webui` are served over HTTPS on operator-provided hostnames.
You choose how traffic enters the cluster. Whatever path you pick must route to
both Services and present a TLS certificate that end users' browsers trust.

The chart can render Kubernetes Gateway API resources for you when you set
`global.gateway.enabled=true`. In that mode you supply a pre-existing `Gateway`
(recommended) or have the chart create one. Either way, the chart does not
install a Gateway controller. You install one separately.

You need:

- **A Gateway controller or Ingress controller already installed in the
  cluster.** Any conformant option works (Envoy Gateway, Istio, Cilium, Contour,
  NGINX Ingress, and similar). The chart's Gateway API templates are agnostic,
  targeting whichever controller you nominate via
  `global.gateway.gatewayClassName` or via the `parentRef` of an existing
  `Gateway`.
- **A real TLS certificate** covering the hostnames you publish (see DNS below).
  [cert-manager](https://cert-manager.io/) configured against an ACME issuer
  (Let's Encrypt, ZeroSSL, an internal ACME server) is the common pattern. You
  can also terminate TLS upstream (at an AWS load balancer using ACM, or at a
  cloud provider's Gateway) and leave
  `global.gateway.listeners.https.tls.certificateRefs` empty.
- **A LoadBalancer or external Service IP** that your DNS records can point at.
  The chart does not manage external IP allocation.

For Gateway API documentation, see the upstream [Gateway API
project](https://gateway-api.sigs.k8s.io/). For cert-manager, see the
[cert-manager docs](https://cert-manager.io/docs/).

## DNS

Hub is designed to span multiple subdomains. The defaults the chart composes are
`<subdomain>.<your-domain>` for each. You control the apex domain, and the
subdomain prefixes are configurable.

| Hostname (default) | Serves |
|--------------------|--------|
| `api.<your-domain>` | `hub-api` HTTP API, including the OIDC callback at `/oidc/callback`. |
| `ui.<your-domain>` | `hub-webui` browser UI. |

Substitute `<your-domain>` with the apex domain you control (such as
`hub.example.com`, giving you `api.hub.example.com` and `ui.hub.example.com`).
The subdomain prefixes default to `api` and `ui`. Override them per service via
`global.gateway.subdomains.*` if your conventions differ.

For each hostname you publish, you need:

- A DNS A or CNAME record pointing at the external IP, hostname, or load
  balancer fronting your Gateway / Ingress.
- TLS certificate coverage. A single wildcard certificate (`*.<your-domain>`) is
  the simplest. Per-host certificates also work.

The hostname you choose for `hub-api` is the value you set as
`hub-api.api.externalURL` at install time. `hub-api` uses it to construct the
OIDC callback URI it registers with your provider, so the value must be
reachable from end-user browsers exactly as configured.

## External Postgres

Hub stores all resource state in PostgreSQL. Provision the database before
install. The chart consumes a connection but does not deploy Postgres in the
self-hosted path.

You need a PostgreSQL 18 (or later) instance reachable from the cluster, with a
dedicated database and a role Hub can use. [The databases
overview](/hub/db-overview) and the provider sub-guides it links to cover
the version, required extensions, authentication modes, TLS settings, and
per-cloud provisioning steps. That page is the source of truth.

## External OIDC Provider

Hub does not include its own identity provider in the self-hosted path.
Configure Hub against an OIDC-compliant provider you already operate or
subscribe to.

The provider needs OIDC discovery, plus `email` and group claims. It also has to
accept a redirect URI Hub computes from your `hub-api` hostname. Common
providers (Amazon Cognito, Microsoft Entra ID, Google Workspace, Okta, Auth0,
Keycloak) all qualify. The full contract, the staged setup order, and the
per-provider walkthroughs are on [the OIDC overview](/hub/oidc-configuration). That
page is the source of truth.

## Next Step

With every requirement above understood, set up each dependency before you
install. Start with your identity provider:

- [OIDC configuration](/hub/oidc-configuration). The provider contract and
  per-provider setup.
- [Databases](/hub/db-overview). Postgres requirements and provisioning.

Once your provider and database are ready, [install Hub](/hub/install).
