---
title: Reference
sidebar_label: Reference
description: FAQ, debugging, and glossary for Insights.
---

:::note
**Skeleton.** Structure only, content pending. Bundles FAQ, debugging, and the
glossary on one page. Seed the FAQ and debugging sections with real support
questions and failure modes before publishing.
:::

## FAQ

- Is Insights read-only? Yes. It doesn't manage control plane lifecycle.
- Do I need an `up` account for the demo? No. The demo runs fully local.
- Why don't my resources appear? Usually a connector sync delay or an unhealthy
    connection.
- What's the difference between the demo and self-hosted installs?
- _…add real questions._

## Debugging

- **A control plane doesn't appear.** Check the connector is running and can
    reach `hub-api`. Inspect connector logs with
    `kubectl -n hub logs deployment/hub-connector`.
- **A control plane appears but reports no resources.** The initial inventory pass
    is slow. Wait, then re-check. Confirm the connector registered.
- **The connector can't reach `hub-api`.** Check network and DNS between clusters.
    Verify the `hubApiUrl` and `tokenExchangeUrl` values.
- **A query returns nothing.** Check authorization scoping. Confirm the identity
    can see the resource with `kubectl`.
- **Catalog endpoints return `404`.** The feature flag is off. See [feature
    flags][flags].

## Glossary

- **Insights.** The product for seeing, searching, and querying every control
    plane through one API and the Console.
- **Console.** The web UI for Insights. Replaces the retired Upbound Console.
- **`hub-api`.** The Insights API server. A runtime component, not a user-facing
    name.
- **`hub-connector`.** The per-control-plane agent that pushes state to `hub-api`.
- **Control plane connection.** A registered control plane that Insights watches.
- **Registration token.** A one-time bootstrap secret a connector uses to register.
- **Realm.** An access boundary that groups control planes across Spaces. In
    active development.
- **Catalog.** The index of package images discovered across control planes.
- **Query API.** The `hub.upbound.io/v1alpha1` API for querying resources.
- _…add remaining terms._

[flags]: ./feature-flags.md
