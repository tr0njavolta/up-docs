---
title: Autoscaling
sidebar_position: 13
description: Scale hub-api with the Horizontal Pod Autoscaler.
---

This page covers how to scale `hub-api` Pods horizontally with the Kubernetes
Horizontal Pod Autoscaler.

## Horizontal Pod Autoscaler

The chart includes an opt-in `HorizontalPodAutoscaler` for `hub-api`. When
enabled, the HPA scales the `hub-api` Deployment based on observed CPU
utilisation against the Pod's CPU request.

Enable it in your `values.yaml`:

```yaml
hub-api:
  api:
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi
    autoscaling:
      enabled: true
      minReplicas: 2
      maxReplicas: 10
      targetCPUUtilizationPercentage: 70
```

The HPA requires the Kubernetes metrics server to be running in the cluster.
Without it, the HPA cannot read CPU metrics and will not scale.

:::note
The HPA needs CPU `requests` set on the `hub-api` container to compute
utilisation. The chart leaves `resources` empty by default. Set requests and
limits explicitly before enabling the HPA, or scaling decisions will be
undefined.
:::

### Custom Metrics

CPU and memory are the only metrics the chart wires today. Hub-specific signals
(query rate against `hub-api`, ingestion backlog from `hub-connector`, Postgres
connection saturation) are exposed via Prometheus but are not yet pre-wired into
the chart's HPA template. If you need to scale on those signals, install a
custom metrics adapter such as the Prometheus Adapter and manage your own
`HorizontalPodAutoscaler` resource alongside the chart. Native chart support for
custom metrics is on the roadmap.

## Next Step

- [Production overview](/hub/production-overview). Review the rest of the hardening
  checklist.
- [High availability](/hub/high-availability). Pair autoscaling with replica
  counts, PodDisruptionBudgets, and anti-affinity.
