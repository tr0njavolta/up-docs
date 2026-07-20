---
title: Catalog
sidebar_position: 1
description: Index and search the package images running across your fleet through Hub's Catalog API.
---

Catalog is a Hub feature that indexes the package images running across your
connected control planes and makes them queryable through a dedicated API.
Instead of inspecting each control plane on its own, you query one Catalog API to
look up images, see how the resources they declare are used, and search across
everything Hub has indexed. This page explains what Catalog is, how its stages
fit together, and where to go next to turn it on.

:::note
Catalog is an alpha feature. It is disabled by default, and its API may change in
incompatible ways between releases. See the [feature
lifecycle](../../reference/feature-releases.md) for what the alpha stage
guarantees, and avoid relying on Catalog for production workloads.
:::

## What Catalog does

The Catalog API lives at `catalog.hub.upbound.io/v1alpha1` and serves package
data through two resources:

- `Image` — list and get the package images Hub has indexed. `Image` exposes
  `usage` and OpenAPI subresources for the footprint of an image
  and resource schema information.
- `ImageSearch` — search across the indexed images and their descriptions.

All catalog image data is visible to the organization, to aid in the discovery
and adoption of their APIs and resources. An image's usage footprint
data is authorization-scoped. You only see resource counts and control planes
in realms where you are authorized.

## How Catalog works

Catalog runs as three stages, each behind its own feature flag. The stages are
independent, so you enable the ones your deployment needs.

| Stage | Helm value | What it does |
| --- | --- | --- |
| Read API | `hub-core.api.features.catalog.enabled` | Serves the `catalog.hub.upbound.io/v1alpha1` endpoints. |
| Ingest | `hub-core.api.features.catalog.ingestEnabled` | Derives catalog records from package resource events and writes them to the catalog. |
| Enrichment | `hub-core.api.features.catalog.enrichmentEnabled` | Fetches OCI manifests and package layers from upstream registries to enrich catalog records. |

Ingest populates the catalog from the packages Hub already observes in connected
control planes.
Enrichment adds in-package API documentation on top of those records. The read API serves
whatever is in the catalog, so enabling it alone returns an empty catalog until
ingest runs. A complete Catalog runs all three stages.

## Use cases

- Inventory package images running across every connected control plane, from
  one API.
- Find where a specific image or its resources run through the `usage` subresource.
- Search the indexed images with `ImageSearch` instead of querying each control
  plane.

## Related resources

To start using Catalog, see:

**How-to guides**
- [Enable and configure Catalog](./configuration.md)

**Reference**
- [Catalog API overview](./reference.md)
- [Feature flags](../../reference/feature-flags.md)
- [Feature lifecycle](../../reference/feature-releases.md)
