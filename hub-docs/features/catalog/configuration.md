---
title: Enable and configure Catalog
sidebar_position: 2
description: Turn on Catalog's read API, ingest, and enrichment stages through Helm values.
---

This guide explains how to enable Catalog on a self-hosted Hub and turn on its
ingest and enrichment stages. Catalog is an alpha feature, so every stage is off
until you opt in through Helm values. For what each stage does, see the [Catalog
overview](./overview.md).

## Prerequisites

Before you enable Catalog, ensure:

- A running Hub installation. See [Install Hub](../../howtos/install.md).
- Helm access to the Hub release, so you can run `helm upgrade`.
- The feature flag server is enabled. It is on by default through
  `hub-core.api.featureFlags.enabled`. When it is `false`, every gated feature,
  including Catalog, is forced off. See [Feature
  flags](../../reference/feature-flags.md).
- For enrichment, network egress from the `hub-core` namespace to the registries
  that host your package images.

## Enable Catalog

Turn on all three stages for a complete catalog. Ingest fills the tables,
enrichment adds registry detail, and the read API serves the result.

1. Add the Catalog values to your `values.yaml`.

   ```yaml
   hub-core:
     api:
       features:
         catalog:
           enabled: true          # read API
           ingestEnabled: true    # populate the catalog tables
           enrichmentEnabled: true # enrich records from registries
   ```

   Similarly, set the stages to `false` to disable.

2. Apply the values with an install or upgrade.

   ```shell
   helm upgrade --install oci://xpkg.upbound.io/upbound/hub --create-namespace \
     --namespace hub \
     --values values.yaml
   ```

   The upgrade rolls the `hub-core` Pods. Catalog becomes active once they are
   `Ready`.

3. Confirm `hub-core` picked up the flags.

   The `hub-core` startup logs enumerate every flag it evaluates. Check that the
   Catalog flags read `true`:

   ```shell
   kubectl logs -n hub deployment/hub-core | grep -i catalog
   ```

## Configure registry access for enrichment

Enrichment fetches OCI manifests and package layers from the registries that host
your images. Public registries need no extra configuration. Private registries
require credentials, which you supply as `Connection` resources in the
`registry.hub.upbound.io` API group. See [External
registries](./external-registry.md) for the full setup, including credential
scoping and verification.

## Verify

Query the API group to confirm the read API responds. With the read API on, the
endpoint `/apis/catalog.hub.upbound.io/v1alpha1` should return the following:

```json
{
  "kind": "APIResourceList",
  "apiVersion": "v1",
  "groupVersion": "catalog.hub.upbound.io/v1alpha1",
  "resources": [
    {
      "name": "images",
      "singularName": "",
      "namespaced": false,
      "kind": "Image",
      "verbs": [
        "get",
        "list"
      ]
    },
    {
      "name": "images/curated",
      "singularName": "",
      "namespaced": false,
      "kind": "ImageCurated",
      "verbs": [
        "update"
      ]
    },
    {
      "name": "images/openapi",
      "singularName": "",
      "namespaced": false,
      "kind": "DeclaredAPIOpenAPI",
      "verbs": [
        "get"
      ]
    },
    {
      "name": "images/usage",
      "singularName": "",
      "namespaced": false,
      "kind": "ImageUsageList",
      "verbs": [
        "get"
      ]
    },
    {
      "name": "imagesearches",
      "singularName": "",
      "namespaced": false,
      "kind": "ImageSearch",
      "verbs": [
        "create"
      ]
    }
  ]
}
```


## See also

- [Catalog overview](./overview.md)
- [Catalog API overview](./reference.md)
- [External registries](./external-registry.md)
- [Feature flags](../../reference/feature-flags.md)
