---
title: Production hardening
sidebar_position: 10
description: Sizing, HA, autoscaling, RBAC, and upgrades for production Hub.
---

You have a working self-hosted Hub. This section covers how to configure it with
the necessary scaling and security configuration for production traffic.

The pages in this section are not a linear install path. They are independent
topics you apply on top of the [self-hosted install](/hub/install).
Work through them in any order, but treat all five as required reading before
Hub serves production traffic.

## Sizing

Pick replica counts, resource requests, and a Postgres tier that match your
workload before you turn on redundancy or autoscaling. Both depend on a sensible
baseline. Sizing is driven by your connector count, the resources tracked per
connector, and the query rate against `hub-api`. The sizing page defines small,
medium, and large tiers with concrete numbers for each and a short decision tree
for picking a starting tier. See [Sizing](/hub/sizing).

## HA

Once you have a tier, run `hub-api` and `hub-webui` with more than one replica,
spread them across nodes with anti-affinity, and bound voluntary disruptions
with a PodDisruptionBudget. The HA page walks the Helm values for each
(replicas, PDBs, topology spread) and verifies that a node drain no longer takes
the UI offline. See [High availability](/hub/high-availability).

## Autoscaling

Static replica counts cover steady-state load. For traffic that varies (daily
peaks, ad-hoc query bursts, or growth that outruns your sizing tier), enable the
HorizontalPodAutoscaler for `hub-api` so Pod count tracks CPU. See
[Autoscaling](/hub/autoscaling).

## RBAC

The demo bootstraps an organisation-level admin binding for a Keycloak group,
which lets you log in immediately. For production, retarget that binding at a
group from your real OIDC provider and add ControlPlane-scoped bindings for the
rest of your users. The RBAC page documents Hub's role model alongside the
mechanics of reading group claims from an OIDC token, plus the YAML for binding
those groups to organisation-level and ControlPlane-level roles. See
[RBAC](/hub/rbac).

## Upgrades

Hub bundles `hub-api`, `hub-connector`, and `hub-webui` in a single chart on one
release train, and schema migrations run automatically as part of `helm
upgrade`. That means upgrades are simple to perform and easy to get wrong.
Migrations are forward-only, so a chart rollback does not undo a schema change.
The upgrades page covers how to read release notes, stage upgrades in a
non-production install, run the upgrade, and the boundary on rollbacks. See
[Upgrades](/hub/upgrades).

## Next Step

Start with [Sizing](/hub/sizing). The other four topics reference the tier it
produces.
