---
title: Packages Overview
sidebar_position: 1
description: Product documentation for the Official Packages offered by Upbound.
sidebar_label: Overview
---

Crossplane supports these package types: `Configurations`, `Functions` and `Providers`. Upbound Crossplane (UXP) extends this with support for `Add-Ons`.

* **`Add-On`** packages are Upbound Crossplane-only packages that extend your control plane capabilities.
* **`Configuration`** packages combine Crossplane _Composite Resource Definitions_, _Compositions_ and metadata.
* **`Function`** packages include the compiled function code for single or
  multiple processor architectures.
* **`Provider`** packages combine a [Kubernetes controller][kubernetes-controller] container, associated _Custom Resource Definitions_ (`CRDs`) and metadata. The Crossplane open source [AWS provider package][aws-provider-package] is an example a provider's metadata and `CRDs`.

For information on package access, availability, support policies, and licensing, see the [Package Policies][package-policy] documentation.

[aws-provider-package]: https://marketplace.upbound.io/providers/upbound/provider-family-aws/v1.21.0
[package-policy]: /manuals/packages/policies
[kubernetes-controller]: https://kubernetes.io/docs/concepts/architecture/controller/
