---
title: Already using Crossplane?
sidebar_position: 1
pagination_prev: null
pagination_next: null
---

import CardGrid from '@site/src/components/CardGrid';

If you're already using Crossplane in your organization, you understand how
control planes manage your resources. This guide shows you what Upbound
Crossplane and Spaces add on top of that and helps you determine an upgrade
path for your existing control planes.

## What does upgrading to Upbound actually get you?

UXP for observability, dev tooling, IDE integration, etc.

Spaces for scaling, support, hosting, group management.


## Are you on Crossplane v1 or v2?

- Still on v1? → start with **Migrate Crossplane v1 Configurations to v2**
- Already on v2.0.1+? → skip ahead

## Do you want Upbound's distribution of Crossplane, or Upbound's hosting?


- **Upgrade to Upbound Crossplane (UXP)** — swap your OSS Crossplane
  install for Upbound's distribution: same control plane, added
  stability, package management, and observability.
- **Upgrade to Control Plane Projects in UXP** —Manage your compositions like as
  software project (IDE tooling, linting, embedded functions) instead of raw YAML.
- **Upgrade to Spaces** — stop hosting the cluster yourself. Export
  your control plane's state and import it into a managed Space,
  either in Upbound's cloud or self-hosted.

## Which guide should you start with?

- First, try upgrading an example from Crossplane to UXP.
- Want project-based tooling for your compositions → Upgrade to Projects
- Running Crossplane v1 → Migrate to v2 first
- Want to scale your control plane fleet? → Upgrade to Spaces
