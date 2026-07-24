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
the `hub-core.api.featureFlags.gates.*` values and mounts it into the `hub-api`
Pod, so you toggle features through Helm values rather than editing flag
definitions by hand. Each gate is named after the capability it controls, as a
single PascalCase token such as `Catalog` or `Registry`.

The flag server itself is controlled by `hub-core.api.featureFlags.enabled`,
which defaults to `true`. Leave it on. When it is `false`, `hub-api` starts with
no flag client and every gated feature is forced off regardless of the
`gates.*` values.

## Available feature flags

Set a gate with `hub-core.api.featureFlags.gates.<Gate>`; drop the leading
`hub-core.` if you install the `hub-api` subchart on its own. The gate name is
also the name that appears in the generated `flags.json` and in the `hub-api`
startup logs. The **Default** column follows each feature's maturity: alpha
features default to `false`, beta features to `true`.

<!-- vale Google.WordList = NO -->
| Gate | Default | What it enables |
|------|---------|-----------------|
| `AgentSessions` | `false` | The `agent.hub.upbound.io/v1alpha1` API group, adding chat and session endpoints under `/apis/agent.hub.upbound.io/v1alpha1/` for Crossplane troubleshooting. Requires an Anthropic API key (see below). |
| `Catalog` | `false` | The Catalog feature as a unit: the read API (`catalog.hub.upbound.io/v1alpha1`) covering Image list and get, usage, curated, OpenAPI subresources, and ImageSearch, plus the ingest and enrichment pipeline that populates it. |
| `Registry` | `false` | The `registry.hub.upbound.io` API group, providing the `Connection` resource (with its `verify` subresource) and the `Repository` resource. |
| `ResourceFilterExpression` | `false` | CEL-based filtering on resource-list endpoints. |

### Agent sessions require an Anthropic API key

The agent feature calls the Anthropic API and doesn't start without a key.
Enable the gate, then provide the key through a Kubernetes Secret and point the
chart at it:

```yaml
hub-core:
  api:
    featureFlags:
      gates:
        AgentSessions: true
    features:
      agentSessions:
        anthropicApiKey:
          existingSecretRef:
            name: hub-agent-anthropic
            key: ANTHROPIC_API_KEY
```

### Catalog

The `Catalog` gate turns the feature on as a unit: the read API and the ingest
and enrichment pipeline that populates it move together behind the one gate. See
[Catalog](../features/catalog/overview.md) for what the feature does and [Enable
and configure Catalog](../features/catalog/configuration.md) for the full setup,
including the `Registry` gate for private registries.

## Enabling a feature gate

Add the gates to your `values.yaml`:

```yaml
hub-core:
  api:
    featureFlags:
      gates:
        Catalog: true
        ResourceFilterExpression: true
```

Apply it with a normal install or upgrade:

```bash
helm upgrade --install hub <chart-ref> \
  --namespace hub \
  --values values.yaml
```

To flip a single gate inline:

```bash
helm upgrade --install hub <chart-ref> \
  --namespace hub \
  --reuse-values \
  --set hub-core.api.featureFlags.gates.ResourceFilterExpression=true
```

The upgrade rolls the `hub-api` Pods, and the feature becomes active once they
are `Ready`. The `hub-api` startup logs list every gate it evaluates, so
you can confirm the running binary picked up your change.

Disabling a beta feature works the same way in reverse. Set its gate to `false`
to turn off a feature that defaults to on.

## Managing flags outside the chart

Two escape hatches exist for teams that manage flag definitions themselves:

- **External ConfigMap.** Set `hub-core.api.featureFlags.configMapRef.name` to a
  ConfigMap you maintain (it must contain a `flags.json` key). The chart then
  skips generating one from `gates.*`, and you own the flag definitions.
- **OFREP endpoint.** The flag server serves OFREP on port `8016` for
  client-side evaluation. It's not exposed publicly by default. To route it
  through the public HTTPRoute, set
  `hub-core.api.featureFlags.httpRoute.enabled=true`, which mounts it at
  `/ofrep`.

<!-- vale write-good.Passive = YES -->

[feature-releases]: /hub/reference/feature-releases
[ofrep]: https://openfeature.dev/specification/appendix-c/
