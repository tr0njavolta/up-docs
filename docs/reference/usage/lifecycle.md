---
title: Product Lifecycle
sidebar_position: 10
description: Information on Upbound software versions, support windows, and release
  policies.
---

## Software list

Upbound provides support and software maintenance to paid customers. Supported software products include:
* [Spaces][spaces]
* [UXP][uxp]
* [Official Providers][official-providers]

## Maintenance and updates

<!-- vale Microsoft.Adverbs = NO -->
<!-- allow "Generally" -->
Upbound supports Generally Available releases for a defined time span, depending on the release cycle of the respective
component. See below for details. All software follows semantic versioning of `X.Y.Z`.
<!-- vale Microsoft.Adverbs = NO -->

* A **major release** changes the first digit and indicates breaking API changes or for 1.0.0 indicates the first
  release where the API is complete and stable.
* A **minor release** changes the second digit and indicates the addition of new features. It may also include
  new bug fixes that weren't included in a previous patch release.
* A **patch release** changes the third digit and only contains bug fixes, no new features.

### Spaces schedule

Spaces has a minor release cadence of every two months. Upbound releases minor patches as needed. Upbound provides 6 months of
mainstream support and 6 months of maintenance support for each minor release. Only critical security issues (for example, High or Critical CVEs) and
functional bugs deemed critical qualify under maintenance support.

<!-- vale write-good.Passive = NO -->
You must upgrade to newer versions sequentially according to the minor
release.
<!-- vale write-good.Passive = YES -->

For example, if you are on `v1.4.x` you must update to `v1.5.x` before `v1.6.x`. 
Upbound strongly recommends using the latest patch release of a minor version in the upgrade process.

### UXP schedule

<!-- vale write-good.Weasel = NO -->
UXP follows the [Crossplane Release Cycle][crossplane-release-cycle]. UXP has a
minor release roughly every 3 months following the upstream Crossplane release. 

Upbound releases a new minor version of UXP roughly two weeks after Crossplane releases the upstream version.

Upbound releases minor patches as needed and provides support for the current and 2 previous minor releases of UXP.
<!-- vale write-good.Weasel = YES -->

Upbound fixes bugs in supported releases. Upbound backports only critical bugs (both
functional and security) to older minor releases.

## Feature launch stages

<!-- vale Microsoft.Adverbs = NO -->
<!-- allow "Generally" -->
Upbound offers features in one of three stages: Public Preview, Generally Available, or Deprecated.
<!-- vale Microsoft.Adverbs = NO -->

### Public preview

Upbound makes Public Preview features available for customer testing. Upbound often publicly announces these features, but they may not be
feature-complete. Preview features don't have an SLA and Upbound provides technical support only during business hours. Unless Upbound states otherwise,
you should use preview features in test environments only.

Often times, [alpha features][alpha-features] in
Crossplane manifest as Preview features in Upbound. You must opt-in to use Preview features as they aren't enabled by default, unless stated
otherwise.

### Generally Available

Generally Available features are ready for production use by all customers and covered by Upbound's SLA.

### Deprecated

Upbound plans to remove Deprecated features from the product at some point in the future. Upbound
provides customers 12 months notice before discontinuing a feature, unless Upbound replaces it with a feature having
materially similar use.

## Pre-releases

Customers with paid support contracts can receive pre-release cuts on an as-needed basis for all covered software.


[spaces]: /self-hosted-spaces/overview
[uxp]: /manuals/uxp/overview
[official-providers]: /manuals/packages/policies

[crossplane-release-cycle]: https://docs.crossplane.io/knowledge-base/guides/release-cycle/
[alpha-features]: https://docs.crossplane.io/knowledge-base/guides/feature-lifecycle/#alpha-features
