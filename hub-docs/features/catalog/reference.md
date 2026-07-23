---
title: Catalog API overview
sidebar_position: 5
description: How the Catalog API is structured — its resources, the flags that gate them, and how access is scoped.
---

This page describes the Catalog API surface: the API group, its resources and
subresources, the feature flags that gate them, and how access is scoped. Catalog
is an alpha feature, so this API may change in incompatible ways between releases.
See the [feature lifecycle](../../reference/feature-releases.md).

## API group

Catalog serves the `catalog.hub.upbound.io/v1alpha1` API group. Its endpoints sit
under:

```text
/apis/catalog.hub.upbound.io/v1alpha1/
```

The endpoints exist only when the read API is enabled. When
`hub-core.api.features.catalog.enabled` is `false`, every Catalog endpoint returns
`404`. See [Enable and configure Catalog](./configuration.md).

## Resources

| Resource | Endpoint | Operations | Description |
| --- | --- | --- | --- |
| `Image` | `images` | list, get | The package images Hub has indexed. |
| `ImageSearch` | `imagesearches` | search | Search across the indexed images. |

### Image subresources

`Image` exposes three subresources:

| Subresource | Description |
| --- | --- |
| `usage` | Where the image runs across connected control planes. |
| `curated` | Curated package data for the image such as labels and notes. |
| OpenAPI | Schemas and API documentation for resources declared in the package. |

## Feature flags

Catalog runs as three independently toggled stages. Only the read API affects the
endpoints above; ingest and enrichment control the pipeline that populates them.

| Stage | Helm value | Default |
| --- | --- | --- |
| Read API | `hub-core.api.features.catalog.enabled` | `false` |
| Ingest | `hub-core.api.features.catalog.ingestEnabled` | `false` |
| Enrichment | `hub-core.api.features.catalog.enrichmentEnabled` | `false` |

For the full flag catalog and how to toggle flags, see [Feature
flags](../../reference/feature-flags.md).

## Access and authorization

Catalog entries are agnostic to Hub concepts such as
realms and control planes. They are discoverable to
the entire organization. Usage footprint data such as
the list of control planes where the image is running
or the number of resources deployed are authorization
scoped to the realms where the subject has
been granted the relevant access.

## See also

- [Catalog overview](./overview.md)
- [Enable and configure Catalog](./configuration.md)
- [Feature flags](../../reference/feature-flags.md)
- [Feature lifecycle](../../reference/feature-releases.md)
