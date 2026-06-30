---
title: Rotate etcd nodes
sidebar_position: 6
description: How to safely rotate the etcd node pool in a self-hosted Space without losing control plane data or availability
---
The `etcd` pods in each control plane contain the control plane's state. When
upgrading, replacing, or draining nodes with `etcd` pods, an unplanned eviction
can leave control planes unavailable or stuck.

This guide covers the safe procedure for rotating `etcd` nodes, what to check
before and after, and how to recover if a control plane gets stuck.

## Prerequisites

Before starting, confirm:

- You have cluster admin access to the host cluster
- You know whether your Space runs in HA mode (`controlPlanes.etcd.replicas` set to `3`)

:::warning
If your Space is **not** in HA mode (`controlPlanes.etcd.replicas` is `1`),
draining the `etcd` node evicts the pod with no replacement ready. This causes a
control plane outage until the pod reschedules. Enable HA mode before rotating
nodes in a production environment. 
:::

## `etcd` pod protection

When `controlPlanes.etcd.replicas` is greater than `1`, Spaces creates a
`PodDisruptionBudget` named `vcluster-etcd` in each control plane's namespace.
The PDB sets `maxUnavailable: 1`, which limits evictions to one `etcd` replica
at a time and keeps the cluster at quorum during a drain.

When `controlPlanes.etcd.replicas` is `1`, no PDB is created. `kubectl drain`
evicts the `etcd` pod immediately and the control plane is unavailable until it
reschedules on a new node.

# Before you start

1. Verify that `etcd` is running with three replicas.

   Check the PodDisruptionBudgets — they're only created when `replicas > 1`:

   ```shell
   kubectl get pdb -A -l app=vcluster-etcd
   ```

   Each control plane namespace (`mxp-<uuid>-system`) should have a `vcluster-etcd` PDB with `ALLOWED DISRUPTIONS: 1`. If no PDBs appear, your Space is running single-replica `etcd`. Enable HA before continuing.

2. Verify all `etcd` pods are healthy.

   ```shell
   kubectl get pods -A -l app=vcluster-etcd
   ```

   All pods should show `Running` with a stable restart count. Do not proceed if any pod is in `Pending`, `CrashLoopBackOff`, or `Error`.

3. Suspend the `etcd` defrag CronJob.

   Each control plane runs a scheduled `etcdctl defrag --cluster` job. Suspend it during the rotation to avoid adding load:

   ```shell
   kubectl get cronjobs -A -l app=etcd-defrag -o name | \
     xargs -I{} kubectl patch {} -p '{"spec":{"suspend":true}}'
   ```

   Re-enable it after the rotation completes.

## Rotate the nodes

Rotate one node at a time. Kubernetes enforces the PDB to prevent more than one `etcd` replica from going unavailable simultaneously.

1. Cordon the node to stop new pods from scheduling on it.

   ```shell
   kubectl cordon <node-name>
   ```

2. Drain the node.

   ```shell
   kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
   ```

   The drain may take several minutes. If the `etcd` pod eviction is blocked by the PDB, Kubernetes retries until it's safe to proceed. This is expected — don't force the drain.

3. Perform your node replacement or upgrade, then wait for the new node to show `Ready`.

   ```shell
   kubectl get nodes --watch
   ```

4. Uncordon the new node.

   ```shell
   kubectl uncordon <new-node-name>
   ```

5. Verify `etcd` pods reschedule and reach `Running` state before moving to the next node.

   ```shell
   kubectl get pods -A -l app=vcluster-etcd --watch
   ```

   Wait for all pods to show `Running` with a stable restart count.

6. Repeat for each remaining node in the pool.

## After the rotation

1. Re-enable the `etcd` defrag CronJob.

   ```shell
   kubectl get cronjobs -A -l app=etcd-defrag -o name | \
     xargs -I{} kubectl patch {} -p '{"spec":{"suspend":false}}'
   ```

2. Verify all control planes return to a healthy state.

   ```shell
   kubectl get controlplanes -A
   ```

   All control planes should show `READY: True` and `SYNCED: True`.

3. Check for control planes stuck in a non-`Ready` state.

   After a node rotation, `spaces-controller` and `mxp-controller` may fail to reconnect to a control plane's API server and require a manual restart. If control planes remain in a non-`Ready` state 10 minutes after the rotation completes, restart the controllers:

   ```shell
   # Restart the Space-level controller
   kubectl rollout restart deployment/spaces-controller -n upbound-system

   # Restart the control plane controller for each affected control plane
   kubectl rollout restart deployment -n mxp-<uuid>-system -l app=mxp-controller
   ```

   To find the namespace UUID for a given control plane:

   ```shell
   kubectl get controlplane <control-plane-name> -n <group> \
     -o jsonpath='{.status.controlPlaneID}'
   ```

## Troubleshooting

### `kubectl drain` is stuck

The drain is waiting for the PDB — draining would violate `etcd` quorum. Check which pods aren't yet ready:

```shell
kubectl get pods -A -l app=vcluster-etcd
```

If a pod is stuck in `Pending`, the most common causes are:
- Target nodes are full — check `kubectl describe node` for resource pressure
- Affinity or toleration rules don't match any available node — verify your `etcd` node taint and toleration configuration matches what's described in [Production scaling and high availability][ha]

### Control plane stuck after rotation

If a control plane remains unhealthy and restarting controllers doesn't resolve it, collect diagnostics before restarting any pods. The reconnection failure is transient and logs disappear after a restart:

```shell
# spaces-controller logs
kubectl logs -n upbound-system deployment/spaces-controller --tail=200

# mxp-controller logs for the affected control plane
kubectl logs -n mxp-<uuid>-system -l app=mxp-controller --tail=200

# vCluster pod events
kubectl describe pod -n mxp-<uuid>-system -l app=vcluster

# etcd pod events
kubectl describe pod -n mxp-<uuid>-system -l app=vcluster-etcd
```

Capture and retain these logs, then contact [Upbound support][support] with the output.

## See also

- [Production scaling and high availability][ha]
- [Scaling vCluster and etcd resources][scaling]
- [Troubleshooting][troubleshooting]

[ha]: ./configure-ha.md
[scaling]: ./scaling-resources.md
[troubleshooting]: ./troubleshooting.md
[support]: https://support.upbound.io
