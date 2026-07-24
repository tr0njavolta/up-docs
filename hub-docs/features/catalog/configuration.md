---
title: Enable and configure Catalog
sidebar_position: 2
description: Turn on the Catalog and Registry feature gates through Helm values.
---

Catalog is controlled by a single feature gate. A related feature to
configure image registry connections is enabled separately.

Catalog is an alpha feature, so both gates are off until you opt in.
For what Catalog does, see the [Catalog overview](./overview.md).

For more information on configuring external registries,
see [External registries.](./external-registry.md)

| Gate | Turns on |
| --- | --- |
| `Catalog` | The catalog read API and Crossplane package indexing. |
| `Registry` | The API for connecting private or self-hosted image registries. |

## Prerequisites

Before you enable Catalog, ensure:

- A running Hub installation. See [Install Hub](../../howtos/install.md).
- Helm access to the Hub release, so you can run `helm upgrade`.
- The feature flag server is enabled. It is on by default. See [Feature
  flags](../../reference/feature-flags.md).
- Network egress from the `hub-core` namespace to the registries
  that host your package images.

## Enable Catalog

1. Add the `Catalog` gate to your `values.yaml`.

   ```yaml
   hub-core:
     api:
       featureFlags:
         gates:
           Catalog: true
   ```

   Set it to `false` to disable Catalog.

2. Apply the values with an upgrade.

   ```shell
   helm upgrade hub oci://xpkg.upbound.io/upbound/hub \
     --namespace hub \
     --values values.yaml
   ```

   Or flip the gate inline without a values file. Pass `--reuse-values` so the
   upgrade keeps the rest of your release's configuration and changes only this
   gate:

   ```shell
   helm upgrade hub oci://xpkg.upbound.io/upbound/hub \
     --namespace hub --reuse-values \
     --set hub-core.api.featureFlags.gates.Catalog=true
   ```

   The upgrade rolls the `hub-core` Pods. Catalog becomes active once they are
   `Ready`.

3. Confirm `hub-core` picked up the gate.

   The `hub-core` startup logs enumerate every gate it evaluates. Check that
   `Catalog` reads `true`:

   ```shell
   kubectl logs -n hub deployment/hub-core | grep -i catalog
   ```

## Enable the Registry gate for private registries

Public registries need no extra configuration once Catalog is on.
Private or bring-your-own registries also require the `Registry` gate, which
serves API group where you declare the credentials Hub uses to pull.

Enable both gates together:

```yaml
hub-core:
  api:
    featureFlags:
      gates:
        Catalog: true
        Registry: true
```

Or set the `Registry` gate inline:

```shell
helm upgrade hub oci://xpkg.upbound.io/upbound/hub \
  --namespace hub --reuse-values \
  --set hub-core.api.featureFlags.gates.Registry=true
```

With the gate on, supply credentials as `Connection` resources in the
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
