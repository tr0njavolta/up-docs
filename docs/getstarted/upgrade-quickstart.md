---
title: Migration quickstart
---

This guide is for existing Crossplane users to see how to upgrade to UXP and see
a subset of some of the added functionality.

In this guide, you'll create a kind cluster, install Crossplane ${version}, and
deploy a single composite resource. Next, you'll begin the upgrade process to
UXP on the cluster and watch as your composite resource is migrated to the new
control plane.

## Prerequisites

- kind installed (for the disposable "before" cluster)
- kubectl
- An Upbound account
- The up CLI installed

## Step 1: Log in to Upbound

- Same as new-user quickstart — `up login`
- [Reuse verbatim; no reason for this to diverge]

## Step 2: Stand up a throwaway Crossplane control plane

- Minimal vanilla install — plain XRD + Composition, no Projects
  tooling, no `up project` anything
- Deploy one small composite resource so there's something real to
  migrate (not zero resources, not a whole platform)
- [Decide: script this with a one-shot install command, or walk
  through it step by step? Probably the former — this cluster is
  scaffolding, not the lesson]

## Step 3: Export your control plane's state

- `up controlplane migration export --kubeconfig <path> --output <file>`
- **Check-in:** confirm the `--kubeconfig` path points at the throwaway
  cluster, not whatever's currently active — this is the first of the
  three risk points we flagged
- Show expected export output (types found, resources exported,
  archive written)

## Step 4: Create your Upbound control plane

- `up controlplane create <name>`
- `up ctx "<org>/<space>/<group>/<name>"`
- **Check-in:** this command silently repoints your active context —
  confirm you're now targeting the new control plane before continuing
  (second risk point)

## Step 5: Import the archive

- `up controlplane migration import --input <file>`
- Note: resources land paused by default — nothing reconciles yet
- Show expected import output

## Step 6: Review before activating

- Spot-check the imported resources/claims look right
- **Check-in:** confirm you're pointed at the *new* control plane, not
  the old source cluster, before running the unpause command — this is
  the highest-stakes moment in the guide (third risk point); getting
  this wrong means two control planes reconciling the same external
  resources at once

## Step 7: Activate

- `kubectl annotate managed --all crossplane.io/paused-`
- Confirm resources move to a synced/ready state

## Step 8: See it in the console

- Same beat as the new-user quickstart's "see it in the console" step —
  same destination, different path to get there
- [Once Hub is wired up, this becomes the same link/step as the
  new-user guide's equivalent moment]

## Step 9: Clean up the throwaway cluster

- Delete the original OSS Crossplane cluster now that migration is
  confirmed working
- [Decide: is this "delete it" or "you can decommission this whenever
  you're satisfied" — tone matters here since a real reader's actual
  source cluster isn't disposable the way the tutorial one is]

## Next steps

- Link to the real migration path for their production cluster
  (this quickstart proved the mechanics; production has real stakes)
- [Once the Projects-coupling and v1→v2 questions from earlier resolve,
  this is also where that guide would get linked, if it still exists
  in this section]
