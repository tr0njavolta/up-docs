---
title: Sizing
sidebar_position: 11
description: Pick replica counts, resources, and a Postgres tier for your workload.
---

This page helps you pick replica counts, resource requests, and a Postgres tier
based on the workload your Hub installation handles.

:::note
Hub is a new product. The numbers below are starting points derived from the
chart's defaults and reasoned estimates. They're not yet load-tested at scale.
Treat them as a sensible place to begin, then watch the three workload metrics below
and adjust. Workloads that exceed the `large` tier are beyond what's currently
validated. Contact Upbound for guidance.
:::

## Workload metrics that matter

Three numbers drive every sizing decision for Hub. Measure or estimate yours
before reading the tiers below.

**Connectors connected.** One `hub-connector` runs in each observed control
plane and pushes resource state to `hub-api`. The connector count is the upper
bound on how many concurrent writers `hub-api` sees, and it grows linearly
with the control planes you operate.

**Resources tracked per connector.** Each connector watches Crossplane-managed
resources in its host cluster and reports them to `hub-api`, which persists them
in PostgreSQL. The total resource count across all connectors is the primary
driver of database size, query latency, and connector memory. A small platform
team running a handful of managed resources per cluster sits at one end. A fleet
replicating thousands of provider resources per control plane sits at the other.

<!-- vale write-good.Weasel = NO -->
**Query RPS against `hub-api`.** Every Hub UI page load, every CLI call, and
every external automation client that lists or watches resources lands as HTTP
traffic on `hub-api`. Sustained read RPS (not peak) determines how many
`hub-api` replicas you need and how much headroom Postgres needs for read
queries. A small team browsing the UI generates a few requests per second. Broad
automation or many concurrent UI users push it higher.
<!-- vale write-good.Weasel = YES -->

Plug your numbers into the tiers below.

## Sizing tiers

The tiers describe `hub-api` replica count, `hub-api` per-pod resource requests
and limits, `hub-connector` per-pod resources, and a recommended Postgres tier.
The chart includes empty `resources: {}` for `hub-api` and `hub-connector` by
default. Set the values shown here explicitly via your `values.yaml`.

### Small

<!-- vale write-good.Weasel = NO -->
For evaluation installs, internal platform teams, and early production with a
handful of clusters.
<!-- vale write-good.Weasel = YES -->

- **Workload envelope:** up to 5 connectors, up to 50,000 resources total, under
  50 query RPS sustained.
- **`hub-api` replicas:** 2, for redundancy across nodes. See [high
  availability][high-availability].
- **`hub-api` resources per pod:** requests `cpu: 250m`, `memory: 512Mi`. Limits
  `memory: 1Gi`.
- **`hub-connector` resources per pod:** requests `cpu: 100m`, `memory: 128Mi`.
  Limits `memory: 256Mi`.
- **Postgres:** one small managed instance. AWS RDS `db.t4g.medium` (2 vCPU, 4
  GiB) with 50 GiB gp3 storage works well. No read replica needed.

```yaml
hub-api:
  replicaCount: 2
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      memory: 1Gi

hub-connector:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      memory: 256Mi
```

### Medium

For production installs serving a platform organisation with a moderate fleet.

- **Workload envelope:** up to 25 connectors, up to 500,000 resources total, 50
  to 250 query RPS sustained.
- **`hub-api` replicas:** 3.
- **`hub-api` resources per pod:** requests `cpu: 500m`, `memory: 1Gi`. Limits
  `memory: 2Gi`.
- **`hub-connector` resources per pod:** requests `cpu: 200m`, `memory: 256Mi`.
  Limits `memory: 512Mi`.
- **Postgres:** one memory-optimised managed instance. AWS RDS `db.r6g.large` (2
  vCPU, 16 GiB) with 200 GiB gp3 storage and IAM authentication fits this tier.
  Enable storage autoscaling.

```yaml
hub-api:
  replicaCount: 3
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      memory: 2Gi

hub-connector:
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      memory: 512Mi
```

### Large

For broad fleets and heavy automation traffic.

- **Workload envelope:** up to 100 connectors, up to 2,500,000 resources total,
  250 to 1,000 query RPS sustained.
- **`hub-api` replicas:** 5, with the [Horizontal Pod
  Autoscaler][autoscaling] enabled to absorb bursts.
- **`hub-api` resources per pod:** requests `cpu: 1`, `memory: 2Gi`. Limits
  `memory: 4Gi`.
- **`hub-connector` resources per pod:** requests `cpu: 500m`, `memory: 512Mi`.
  Limits `memory: 1Gi`. Consider scoping `connector.controlPlane.apiGroups` to
  only the provider groups you care about. Every group adds informers that
  consume connector memory.
- **Postgres:** a larger memory-optimised instance. AWS RDS `db.r6g.xlarge` (4
  vCPU, 32 GiB) with 500 GiB gp3 storage and IAM authentication fits this tier.
  Add a read replica if you observe contention between connector writes and UI
  reads.

```yaml
hub-api:
  replicaCount: 5
  resources:
    requests:
      cpu: 1
      memory: 2Gi
    limits:
      memory: 4Gi
  autoscaling:
    enabled: true
    minReplicas: 5
    maxReplicas: 15
    targetCPUUtilizationPercentage: 70

hub-connector:
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      memory: 1Gi
```

## Pick your tier

Walk these three questions in order. The first envelope you exceed bumps you up
a tier.

1. **How many control planes register with Hub?** 1 to 5 → consider
   `small`. 6 to 25 → consider `medium`. 26 to 100 → consider `large`. More than
   100 → start at `large` and contact Upbound. That scale is beyond what's
   currently validated.
2. **How many resources does the largest connector track?** Under 10,000 per
   connector → the tier from question 1 stands. 10,000 to 50,000 per connector →
   move up one tier. More than 50,000 per connector → move up two tiers and
   scope `connector.controlPlane.apiGroups` so you only watch the provider
   groups you actually use.
3. **What sustained query RPS does `hub-api` see?** Under 50 → the tier so far
   stands. 50 to 250 → at least `medium`. Above 250 → at least `large`, with the
   Horizontal Pod Autoscaler enabled.

The tier you settle on after all three questions is your starting point. Roll
out to a non-production install first, watch CPU, memory, and PostgreSQL
connection saturation under realistic load, and adjust before promoting to
production.

## Next step

- [Run Hub with redundancy][high-availability]. Set replica counts, pod
  disruption budgets, and anti-affinity for the tier you picked.
- [Configure autoscaling][autoscaling]. Enable the Horizontal Pod Autoscaler
  for `hub-api` and turn on storage autoscaling on your Postgres tier.

[autoscaling]: /hub/howtos/autoscaling
[high-availability]: /hub/howtos/high-availability
