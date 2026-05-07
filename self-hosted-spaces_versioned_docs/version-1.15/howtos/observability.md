---
title: Observability
sidebar_position: 50
description: A guide for how to use the integrated observability pipeline feature
  in a Space.
plan: "enterprise"
---

<Enterprise />

This guide explains how to configure observability in Upbound Spaces. Upbound
provides integrated observability features built on
[OpenTelemetry][opentelemetry] to collect, process, and export logs, metrics,
and traces.

Upbound Spaces offers two levels of observability:

1. **Space-level observability** - Observes the cluster infrastructure where Spaces software is installed (Self-Hosted only)
2. **Control plane observability** - Observes workloads running within individual control planes

<!-- vale Google.Headings = NO -->
<!-- vale write-good.TooWordy = NO -->
<!-- vale Google.WordList = NO -->


:::important
**Space-level observability** (available since v1.6.0, GA in v1.14.0):
- Disabled by default
- Requires manual enablement and configuration
- Self-Hosted Spaces only

**Control plane observability** (available since v1.13.0, GA in v1.14.0):
- Enabled by default
- No additional configuration required
:::
<!-- vale Google.WordList = YES -->
<!-- vale write-good.TooWordy = YES -->


## Prerequisites
<!-- vale write-good.Passive = NO -->
<!-- vale write-good.TooWordy = NO -->
**Control plane observability** is enabled by default. No additional setup is
required.
<!-- vale write-good.TooWordy = YES -->
<!-- vale write-good.Passive = YES -->

### Self-hosted Spaces

1. **Enable the observability feature** when installing Spaces:
   ```bash
   up space init --token-file="${SPACES_TOKEN_PATH}" "v${SPACES_VERSION}" \
     ...
     --set "observability.enabled=true"
   ```

Set `features.alpha.observability.enabled=true` instead if using Spaces version
before `v1.14.0`.

2. **Install OpenTelemetry Operator** (required for Space-level observability):
   ```bash
   kubectl apply -f https://github.com/open-telemetry/opentelemetry-operator/releases/download/v0.139.0/opentelemetry-operator.yaml
   ```

   :::important
   If running Spaces `v1.15` or later, use OpenTelemetry Operator `v0.139.0` or later due to breaking changes.
   :::


## Space-level Observability

Space-level observability is only available for self-hosted Spaces and allows
administrators to observe the cluster infrastructure.

### Configuration

Configure Space-level observability using the `spacesCollector` value in your
Spaces Helm chart:

```yaml
observability:
  spacesCollector:
    config:
      exporters:
        otlphttp:
          endpoint: "<your-endpoint>"
          headers:
            api-key: YOUR_API_KEY
      exportPipeline:
        logs:
          - otlphttp
        metrics:
          - otlphttp
```

This configuration exports metrics and logs from:

- Crossplane installation
- Spaces infrastructure (controller, API, router, etc.)

### Router metrics

The Spaces router uses Envoy as a reverse proxy and automatically exposes
metrics when you enable Space-level observability. These metrics provide
visibility into:

- Traffic routing to control planes and services
- Request status codes, timeouts, and retries
- Circuit breaker state preventing cascading failures
- Client connection patterns and request volume
- Request latency (P50, P95, P99)

For more information about available metrics, example queries, and how to enable
this feature, see the [Space-level observability guide][space-level-o11y].

## Control plane observability

Control plane observability collects telemetry data from workloads running
within individual control planes using `SharedTelemetryConfig` resources.

The pipeline deploys [OpenTelemetry Collectors][opentelemetry-collectors] per
control plane, defined by a `SharedTelemetryConfig` at the group level.
Collectors pass data to external observability backends.

:::important
From Spaces `v1.13` and beyond, telemetry only includes user-facing control
plane workloads (Crossplane, providers, functions).

Self-hosted users can include system workloads (`api-server`, `etcd`) by setting
`observability.collectors.includeSystemTelemetry=true` in Helm.
:::

:::important
Spaces validates `SharedTelemetryConfig` resources before applying them by
sending telemetry to configured exporters. self-hosted Spaces, ensure that
`spaces-controller` can reach the exporter endpoints.
:::

### `SharedTelemetryConfig`

`SharedTelemetryConfig` is a group-scoped custom resource that defines telemetry
configuration for control planes.

#### New Relic example

```yaml
apiVersion: observability.spaces.upbound.io/v1alpha1
kind: SharedTelemetryConfig
metadata:
  name: newrelic
  namespace: default
spec:
  controlPlaneSelector:
    labelSelectors:
      - matchLabels:
          org: foo
  exporters:
    otlphttp:
      endpoint: https://otlp.nr-data.net
      headers:
        api-key: YOUR_API_KEY
  exportPipeline:
    metrics: [otlphttp]
    traces: [otlphttp]
    logs: [otlphttp]
```

#### Datadog Example

```yaml
apiVersion: observability.spaces.upbound.io/v1alpha1
kind: SharedTelemetryConfig
metadata:
  name: datadog
  namespace: default
spec:
  controlPlaneSelector:
    labelSelectors:
      - matchLabels:
          org: foo
  exporters:
    datadog:
      api:
        site: ${DATADOG_SITE}
        key: ${DATADOG_API_KEY}
  exportPipeline:
    metrics: [datadog]
    traces: [datadog]
    logs: [datadog]
```

### Control plane selection

Use `spec.controlPlaneSelector` to specify which control planes should use the
telemetry configuration.

#### Label-based selection

```yaml
spec:
  controlPlaneSelector:
    labelSelectors:
      - matchLabels:
          environment: production
```

#### Expression-based selection

```yaml
spec:
  controlPlaneSelector:
    labelSelectors:
      - matchExpressions:
        - { key: environment, operator: In, values: [production,staging] }
```

#### Name-based selection

```yaml
spec:
  controlPlaneSelector:
    names:
    - controlplane-dev
    - controlplane-staging
    - controlplane-prod
```

### Manage sensitive data

:::important
Available from Spaces `v1.10`
:::

Store sensitive data in Kubernetes secrets and reference them in your
`SharedTelemetryConfig`:

1. **Create the secret:**
   ```bash
   kubectl create secret generic sensitive -n <STC_NAMESPACE> \
       --from-literal=apiKey='YOUR_API_KEY'
   ```

2. **Reference in SharedTelemetryConfig:**
   ```yaml
   apiVersion: observability.spaces.upbound.io/v1alpha1
   kind: SharedTelemetryConfig
   metadata:
     name: newrelic
   spec:
     configPatchSecretRefs:
       - name: sensitive
         key: apiKey
         path: exporters.otlphttp.headers.api-key
     controlPlaneSelector:
       labelSelectors:
         - matchLabels:
             org: foo
     exporters:
       otlphttp:
         endpoint: https://otlp.nr-data.net
         headers:
           api-key: dummy # Replaced by secret value
     exportPipeline:
       metrics: [otlphttp]
       traces: [otlphttp]
       logs: [otlphttp]
   ```

### Telemetry processing

:::important
Available from Spaces `v1.11`
:::

Configure processing pipelines to transform telemetry data using the [transform
processor][transform-processor].

#### Add labels to metrics

```yaml
spec:
  processors:
    transform:
      error_mode: ignore
      metric_statements:
        - context: datapoint
          statements:
            - set(attributes["newLabel"], "someLabel")
  processorPipeline:
    metrics: [transform]
```

#### Remove labels

From metrics:
```yaml
processors:
  transform:
    metric_statements:
      - context: datapoint
        statements:
          - delete_key(attributes, "kubernetes_namespace")
```

From logs:
```yaml
processors:
  transform:
    log_statements:
      - context: log
        statements:
          - delete_key(attributes, "log.file.name")
```

#### Modify log messages

```yaml
processors:
  transform:
    log_statements:
      - context: log
        statements:
          - set(attributes["original"], body)
          - set(body, Concat(["log message:", body], " "))
```

### Monitor status

Check the status of your `SharedTelemetryConfig`:

```bash
kubectl get stc
NAME       SELECTED   FAILED   PROVISIONED   AGE
datadog    1          0        1             63s
```

- `SELECTED`: Number of control planes selected
- `FAILED`: Number of control planes that failed provisioning
- `PROVISIONED`: Number of successfully running collectors

For detailed status information:

```bash
kubectl describe stc <name>
```

## Supported exporters

Both Space-level and control plane observability support:
- `datadog` -. Datadog integration
- `otlphttp` - General-purpose exporter (used by New Relic, among others)
- `debug` -. troubleshooting

## Considerations

- **Control plane conflicts**: Each control plane can only use one `SharedTelemetryConfig`. Multiple configs selecting the same control plane conflict.
- **Custom collector image**: Both Space-level and control plane observability use the same custom OpenTelemetry Collector image with supported exporters.
- **Resource scope**: `SharedTelemetryConfig` resources are group-scoped, allowing different telemetry configurations per group.

For more advanced configuration options, review the [Helm chart
reference][helm-chart-reference] and [OpenTelemetry Transformation Language
documentation][opentelemetry-transformation-language].

<!-- vale Google.Headings = YES -->
[opentelemetry]: https://opentelemetry.io/
[opentelemetry-collectors]: https://opentelemetry.io/docs/collector/
[opentelemetry-collector-configuration]: https://opentelemetry.io/docs/collector/configuration/#exporters
[opentelemetry-operator]: https://opentelemetry.io/docs/kubernetes/operator/
[transform-processor]: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
[opentelemetry-transformation-language]: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl
[space-level-o11y]: /self-hosted-spaces/howtos/space-observability
[helm-chart-reference]: /reference/spaces-helm-reference/
[opentelemetry-transformation-language-functions]: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
[opentelemetry-transformation-language-contexts]: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/contexts
[guide-on-ottl]: https://betterstack.com/community/guides/observability/ottl/#a-brief-overview-of-the-ottl-grammar
