---
title: Feature flags
sidebar_position: 2
description: Enable optional Hub features through Helm values.
---

Hub keeps several features behind feature flags. Each flagged feature is at
either the alpha or beta stage of the [feature lifecycle][feature-releases],
which sets its default state:
<!-- vale write-good.Passive = NO -->
- **Alpha** features are disabled by default. You opt in explicitly.
- **Beta** features are enabled by default. The flag stays available so you can
  turn the feature off.

Once a feature reaches general availability its flag is removed and the feature
is always on, so GA features don't appear here. See the [feature
lifecycle][feature-releases] for the stability, support, and
API-compatibility expectations at each stage.

## How feature flags work

`hub-api` embeds a flag server that speaks
[OFREP][ofrep] and reads its flag
definitions from a JSON file. The chart generates that file as a ConfigMap from
the `hub-core.api.features.*` values and mounts it into the `hub-api` Pod, so you
toggle features through Helm values rather than editing flag definitions by
hand.

The flag server itself is controlled by `hub-core.api.featureFlags.enabled`,
which defaults to `true`. Leave it on. When it is `false`, `hub-api` starts with
no flag client and every gated feature is forced off regardless of the
`features.*` values.

## Available feature flags

The values below are the umbrella-chart paths; drop the leading `hub-core.` if
you install the `hub-api` subchart on its own. The **Default** column follows
each feature's maturity: alpha features default to `false`, beta features to
`true`. The **Underlying flag** column is the name that appears in the generated
`flags.json` and in the `hub-api` startup logs.

<!-- vale Google.WordList = NO -->
| Helm value | Underlying flag | Default | What it enables |
|------------|-----------------|---------|-----------------|
| `hub-core.api.features.agentSessions.enabled` | `enable-agent-sessions` | `false` | The `agent.hub.upbound.io/v1alpha1` API group, adding chat and session endpoints under `/apis/agent.hub.upbound.io/v1alpha1/` for Crossplane troubleshooting. Requires an Anthropic API key (see below). |
| `hub-core.api.features.catalog.enabled` | `hub-core.catalog.enabled` | `false` | The catalog read API (`catalog.hub.upbound.io/v1alpha1`), covering Image list and get, usage, curated, OpenAPI subresources, and ImageSearch. |
| `hub-core.api.features.catalog.ingestEnabled` | `hub-core.catalog.ingest.enabled` | `false` | The catalog ingest pipeline that derives catalog records from package resource events and writes them to the catalog tables. |
| `hub-core.api.features.catalog.enrichmentEnabled` | `hub-core.catalog.enrichment.enabled` | `false` | The catalog enrichment handler that fetches OCI manifests and package layers from registries. |
| `hub-core.api.features.registryAPI.enabled` | `hub-core.registry.api.enabled` | `false` | The `registry.hub.upbound.io` API group, providing the `Connection` resource (with its `verify` subresource) and the `Repository` resource. |
| `hub-core.api.features.resourcesCELFiltering.enabled` | `hub-core.resources-cel-filtering.enabled` | `false` | CEL-based filtering on resource-list endpoints. |

### Agent sessions require an Anthropic API key

The agent feature calls the Anthropic API and doesn't start without a key.
Provide it through a Kubernetes Secret and point the chart at it:

```yaml
hub-core:
  api:
    features:
      agentSessions:
        enabled: true
        anthropicApiKey:
          existingSecretRef:
            name: hub-agent-anthropic
            key: ANTHROPIC_API_KEY
```

### Catalog stages

`catalog.enabled` turns on the read API. `ingestEnabled` and `enrichmentEnabled`
control the background pipeline that populates and enriches what the read API
serves. They are independent toggles, so enable the stages your deployment
needs. See [Catalog](../features/catalog/overview.md) for what the feature does
and [Enable and configure Catalog](../features/catalog/configuration.md) for the
full setup.

## Enabling a feature flag

Add the feature to your `values.yaml`:

```yaml
hub-api:
  api:
    features:
      catalog:
        enabled: true
      resourcesCELFiltering:
        enabled: true
```

Apply it with a normal install or upgrade:

```bash
helm upgrade --install hub <chart-ref> \
  --namespace hub \
  --values values.yaml
```

To flip a single flag inline:

```bash
helm upgrade --install hub <chart-ref> \
  --namespace hub \
  --reuse-values \
  --set hub-core.api.features.resourcesCELFiltering.enabled=true
```

The upgrade rolls the `hub-api` Pods, and the feature becomes active once they
are `Ready`. The `hub-api` startup logs list every flag it evaluates, so
you can confirm the running binary picked up your change.

Disabling a beta feature works the same way in reverse. Set its value to `false`
to turn off a feature that defaults to on.

## Managing flags outside the chart

Two escape hatches exist for teams that manage flag definitions themselves:

- **External ConfigMap.** Set `hub-core.api.featureFlags.configMapRef.name` to a
  ConfigMap you maintain (it must contain a `flags.json` key). The chart then
  skips generating one from `features.*`, and you own the flag definitions.
- **OFREP endpoint.** The flag server serves OFREP on port `8016` for
  client-side evaluation. It's not exposed publicly by default. To route it
  through the public HTTPRoute, set
  `hub-core.api.featureFlags.httpRoute.enabled=true`, which mounts it at
  `/ofrep`.

<!-- vale write-good.Passive = YES -->

[feature-releases]: /hub/reference/feature-releases
[ofrep]: https://openfeature.dev/specification/appendix-c/
