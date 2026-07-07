---
title: Upbound Insights
sidebar_label: Overview
sidebar_position: 1
description: See, search, and query every control plane across your estate through one API.
---

## Why Insights

The answers you need live across many `kubectl` contexts. You can't easily ask
which control planes run an old provider version, what changed in the last day,
or how many claims are `Ready`. A connector in each control plane streams
state to a central store, and Insights re-exposes it through one Kubernetes-style
API and the Console. Insights is read-only. It gives you visibility, not
lifecycle management.

## How it works

Insights runs three components.

| Component | Role |
|---|---|
| `hub-api` | The API server. It owns the aggregated store and handles OIDC login and token exchange. |
| `hub-connector` | Runs in each connected control plane and pushes state out. `hub-api` never dials back into your clusters. |
| `hub-webui` | The Console web UI, an optional static app. |

To bring a control plane in, see [connect a control plane][connections].

## What you can query

Query the `hub.upbound.io/v1alpha1` API group with `GET` and `LIST` requests. The
`/resources` endpoint returns resource instances filtered by group, kind, API
version, control plane, or label. `/controlplanes` lists connected control planes,
and the relationship endpoints show how resources connect.

A separate Catalog API (`catalog.hub.upbound.io/v1alpha1`) indexes package images
through the `images` and `imagesearches` endpoints. It sits behind a feature flag,
so its endpoints return `404` when the flag is off.

Query results are authorization-scoped. You see a resource through Insights only
if you could see it with `kubectl`.

Open: confirm which endpoints are public in Beta.

## The Console

The Console gives operators four resource-centric views. A global summary rolls
up resource health across the fleet. Resource exploration filters and groups
resources by type, control plane, or team. Definitions surface package-version
drift, and the infrastructure view shows reconciliation health per control plane.

TODO: add UI captures. See [navigate the Console][navigating].

## Identity and access

Insights authenticates users through OIDC and hands the session lifecycle to your
identity provider. It supports Microsoft Entra ID and Keycloak, along with any
generic OIDC provider. Authorization mirrors `kubectl` visibility.

Realms are in active development. Today, access maps to the control planes a user
can already reach.

## Deployment

Insights installs from Helm in two ways. The demo runs a single KIND cluster with
`global.demo.enabled=true`. The self-hosted path uses an external database, OIDC
provider, ingress, and TLS certificate that you provide. An Upbound Cloud mode is
in design and isn't a supported install path yet.

Every UXP instance includes Insights scoped to one control plane, which is the
community tier. To connect more control planes, upgrade to Standard.

Open: verify the tier gating.

<Standard />

## Next steps

- [Install Insights][install]
- [Connect a control plane][connections]
- [Navigate the Console][navigating]
- [Query API][queryApi]
- [Insights for AI assistants and agents][ai]
- [Use cases][useCases]
- [Insights in production][prod]
- [Public preview and alpha features][flags]
- [Reference][reference]

## Open questions

- The 3.0 spec names `/apis/controlplane/v1`, a `Connection` kind, and Catalog
    `Package`, `API`, and `Utilization`. None exist in the current API. This
    session documents what the code does today. Revisit if the rename happens.
- Engineering docs contradict themselves twice. The catalog group appears as both
    `catalog.hub.upbound.io` and `catalog.upbound.io`, and the org role as both
    `org-admin` and `admin`. Resolve with engineering.

[connections]: ./connections.md
[navigating]: ./navigating.md
[queryApi]: ./query-api.md
[install]: ./install/overview.md
[ai]: ./ai.md
[useCases]: ./use-cases.md
[prod]: ./production/overview.md
[flags]: ./feature-flags.md
[reference]: ./reference.md
