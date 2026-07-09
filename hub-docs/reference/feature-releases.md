---
title: Feature lifecycle
sidebar_position: 3
description: Alpha, beta, and GA feature stages and the Hub release cycle.
---

## Feature Stages

A feature in Hub follows the same lifecycle as [upstream
Kubernetes](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/#feature-stages).

An _Alpha_ feature represents a brand new feature that is still under active
development and has no commitment from the project to be completed. This means:

- Disabled by default (behind a feature flag)
- Might be buggy or have reduced performance
- Support for the feature may be dropped at any time without notice
- The API may change in incompatible ways in a later release without notice
- Recommended for use only in short-lived testing clusters

A _Beta_ feature represents a feature that has been promoted from _Alpha_, but
is still under active development. The project has committed to completing the
feature in some form. This means:

- Usually enabled by default (can be disabled with a feature flag)
- The feature is well tested and generally considered safe
- Support for the feature will not be dropped, details and exact API may
  change
- The schema and/or semantics may change in incompatible ways in subsequent beta
  or stable release. Instructions will be provided for migrating to the next
  version but may require deleting, editing or re-creating objects which may
  require downtime for applications relying on the feature.
- Recommended for only non-business-critical uses because of incompatibile
  changes.

A _General Availability (GA)_ feature represents a stable feature. This means:

- The feature is always enabled (and cannot be disabled)
- The corresponding feature flag has been removed
- Stable versions of features will appear in released software for many
  subsequent versions

For a more detailed breakdown of reliability, upgradeability and completeness
see the [Kubernetes SIG Architecture
document](https://github.com/kubernetes/community/blob/main/contributors/devel/sig-architecture/api_changes.md#alpha-beta-and-stable-versions).
Please note that Upbound does not commit to the same support guarantees and/or
release cycles of upstream Kubernetes.

## Release Cycle

Hub currently releases updates on a quarterly (13 week) cadence. Upbound
maintains support the past 12 months of releases.
