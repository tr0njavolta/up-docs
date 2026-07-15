---
title: Marketplace Overview
sidebar_position: 1
sidebar_label: Overview
description: How to use the Upbound Marketplace to discover Crossplane providers and
  packages.
---

[Upbound Marketplace][upbound-marketplace] simplifies your control plane journey
with the largest registry for storing, managing, and sharing control plane
extensions. It integrates seamlessly with Upbound's control plane project
tooling. It also provides platform engineers with pre-built Configurations and
Functions to speed up control plane development workflows.

The Upbound Marketplace is the main source for publicly available Crossplane packages.

## Extensions in the Marketplace

The Marketplace supports the following control plane extensions:
<!-- vale write-good.TooWordy = NO -->
- [Crossplane providers][crossplane-providers] are packages that enable Upbound control planes to interact with external APIs.
- [Configurations][control-plane-configurations] are packages that define one or more resource types, called Composite Resources.
- [Functions][composition-functions] are packages that define reusable logic, either for use in a composition or operation pipeline.
- [Add-Ons][add-ons] are packages that extend Upbound control planes with additional capabilities.
<!-- vale write-good.TooWordy = YES -->

All extensions in the Marketplace are OCI images served from repositories.

## Features of the Marketplace

Key features of the Upbound Marketplace include:

- Upbound Official Packages ([Providers][providers], Configurations, Functions)
- Verified and community content
- Unlimited public repositories
- Private repositories
- API docs
- Image vulnerability and provenance data

## Verified publishers

<!-- vale write-good.Passive = NO -->
Extensions in the Marketplace are published and maintained by a variety of sources. The Marketplace assigns different badges to packages to denote the source of an extension. You can also see the name of the organization responsible for the extension.
<!-- vale write-good.Passive = YES -->

<!-- vale Upbound.Spelling = NO -->

| Verification      | Description                                | Organization |
| --------- | ------------------------------------------ | ------------ |
| Official  | Extensions owned and maintained by Upbound | Upbound      |
| Partner   | Extensions owned, maintained, validated, and published by third-party companies | Third-party organization      |
| Community | Extensions owned and maintained by an individual or other members in the community | Third-party organization      |

<!-- vale Upbound.Spelling = YES -->


[providers]: /manuals/uxp/concepts/packages/providers/

[upbound-marketplace]: https://marketplace.upbound.io
[crossplane-providers]: https://marketplace.upbound.io/providers
[control-plane-configurations]: https://marketplace.upbound.io/configurations
[composition-functions]: https://marketplace.upbound.io/functions
[add-ons]: https://marketplace.upbound.io/addons
