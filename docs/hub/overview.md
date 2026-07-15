---
title: Upbound Hub 
sidebar_label: Overview
sidebar_position: 1
description: See, search, and query every control plane across your estate through one API.
---

## Why Hub

## How it works

| Component | Role |
|---|---|
| `hub-api` | The API server. It owns the aggregated store and handles OIDC login and token exchange. |
| `hub-connector` | Runs in each connected control plane and pushes state out. `hub-api` never dials back into your clusters. |
| `hub-webui` | The Console web UI, an optional static app. |

To bring a control plane in, see [connect a control plane][connections].

## Insights
## The Console
## Identity and access

## Deployment
<Standard />

## Next steps

- [Install the Hub][install]
- [Connect a control plane][connections]
- [Navigate the Console][navigating]
- [Query API][queryApi]
- [Hub for AI assistants and agents][ai]
- [Use cases][useCases]
- [Hub in production][prod]
- [Public preview and alpha features][flags]
- [Reference][reference]

## Open questions

- The 3.0 spec names `/apis/controlplane/v1`, a `Connection` kind, and Catalog
    `Package`, `API`, and `Utilization`. None exist in the current API. This
    session documents what the code does today. Revisit if the rename happens.
- Engineering docs contradict themselves twice. The catalog group appears as both
    `catalog.hub.upbound.io` and `catalog.upbound.io`, and the org role as both
    `org-admin` and `admin`. Resolve with engineering.

[connections]: /hub/connections
[navigating]: /hub/navigating
[queryApi]: /hub/query-api
[install]: /hub/install
[ai]: /hub/ai
[useCases]: /hub/use-cases
[prod]: /hub/production-overview
[flags]: /hub/feature-flags
[reference]: /hub/reference
