---
title: High availability
sidebar_position: 12
description: Run Hub with redundancy across nodes and zones.
---

This page walks you through running Hub with enough redundancy that a single
Pod, node, or zone failure does not interrupt service.

## Prerequisites

- A self-hosted Hub install per [the self-hosted install
  guide](/hub/install).
- A worker pool with at least three nodes spread across separate failure
  domains. Node labels for `topology.kubernetes.io/zone` (or an equivalent label
  your cluster sets) are required for zone-level anti-affinity.
- An externally-managed PostgreSQL with its own HA story. Hub itself goes
  stateless across replicas, so cluster availability is bounded by the database
  tier. See [the database overview](/hub/db-overview).
- Sized resource requests for `hub-api`. Pick a tier in [sizing](/hub/sizing)
  before scaling out. Replicas without requests will not pack onto separate
  nodes reliably.

HA applies to `hub-api` and `hub-webui`. The `hub-connector` runs as a singleton
in each observed control plane by design and is not horizontally scaled.

## Configure Replicas

Set the replica count for `hub-api` (and, if you installed the UI, for
`hub-webui`):

```yaml
hub-api:
  api:
    replicaCount: 3

hub-webui:
  replicas: 2
```

Three `hub-api` replicas is the smallest count that survives a node drain while
keeping a quorum of Ready Pods serving traffic. `hub-api` is stateless (every
replica reads and writes the same PostgreSQL backend), so you can scale up
further without coordination. The UI is a static asset server. Two replicas are
enough for redundancy.

## Configure Pod Disruption Budgets

The chart renders a PodDisruptionBudget for `hub-api`, but leaves it off by
default. Enable it once you run more than one replica so voluntary disruptions
(node drains, cluster upgrades) cannot evict every replica at once:

```yaml
hub-api:
  api:
    pdb:
      create: true
      minAvailable: 2
```

The `hub-webui` chart carries the same budget. Enable it if you scaled the UI:

```yaml
hub-webui:
  pdb:
    create: true
    minAvailable: 1
```

See the [Kubernetes PodDisruptionBudget
docs](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/) for the
full field reference.

## Configure Anti-Affinity

Spread replicas across nodes and zones so a single failure domain cannot take
down every Pod:

```yaml
hub-api:
  api:
    affinity:
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app.kubernetes.io/name: hub-api
                app.kubernetes.io/instance: hub
            topologyKey: kubernetes.io/hostname
        preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app.kubernetes.io/name: hub-api
                  app.kubernetes.io/instance: hub
              topologyKey: topology.kubernetes.io/zone
```

The required term keeps two `hub-api` Pods off the same node. The preferred term
steers the scheduler toward different zones when capacity allows, without making
the Pods unschedulable if a zone is full. If you operate in a single zone, drop
the preferred term. See the [Kubernetes affinity and anti-affinity
docs](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity)
for alternative topology keys.

## Next Step

- [Autoscaling](/hub/autoscaling). Let `hub-api` grow and shrink with load instead
  of running a fixed replica count.
