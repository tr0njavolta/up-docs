---
title: Official Providers
description: Upbound creates, maintains and supports a set of Crossplane providers
  called official providers.
---

Upbound Official Providers are Crossplane providers built as OCI images and published into the [Upbound Marketplace][upbound-marketplace]. Upbound publishes, maintains, and supports these listings. They're denoted with a _Verification_ label of **Official**. They're published under the `upbound` organization.

<!-- vale off -->
## Introduction

Official Providers are commercially licensed builds of Crossplane providers. These providers may be closed source, or they may be downstream from open source (such as the case for [provider-family-aws][provider-family-aws]).

Upbound publishes and maintains Official Providers. Some enterprise-grade advantages of Official Providers are:

* Multi-language resource schemas for [KCL][kcl], [Python][python], [Go][go], and [Go Templating][gotemplating] to improve the Crossplane composition authoring experience.
* Backporting of fixes supported during 12 months of mainstream support + 6 months additional access
* An SBOM
* [Signed by Upbound][signed-by-upbound]
* Commercial support available from Upbound

Upbound's Official Providers integrate with the Upbound platform to provide the best provider experience. You need an [account on Upbound][account-on-upbound] to [pull an Official Provider][pull-an-official-provider].
<!-- vale on -->

## Official Providers list

<!-- vale Microsoft.Adverbs = NO -->
Upbound is continually adding new providers to the ever growing list of Official Providers. For a complete list of available Official providers, use [this query][this-query] in the Marketplace.
<!-- vale Microsoft.Adverbs = YES -->

### Major cloud providers

| Provider | Marketplace Link | Description |
|----------|------------------|-------------|
| AWS | [marketplace.upbound.io/providers/upbound/provider-family-aws][marketplace-aws] | Official provider for Amazon Web Services with 1000+ managed resources across 60+ family providers |
| Azure | [marketplace.upbound.io/providers/upbound/provider-family-azure][marketplace-azure] | Official provider for Microsoft Azure with 900+ managed resources across 40+ family providers |
| GCP | [marketplace.upbound.io/providers/upbound/provider-family-gcp][marketplace-gcp] | Official provider for Google Cloud Platform with 500+ managed resources across 30+ family providers |

### Platform providers

| Provider | Marketplace Link | Description |
|----------|------------------|-------------|
| Kubernetes | [marketplace.upbound.io/providers/upbound/provider-kubernetes][marketplace-k8s] | Manage Kubernetes resources from Crossplane |
| Helm | [marketplace.upbound.io/providers/upbound/provider-helm][marketplace-helm] | Deploy and manage Helm charts from Crossplane |
| Terraform | [marketplace.upbound.io/providers/upbound/provider-terraform][marketplace-terraform] | Execute Terraform modules from Crossplane. See [migration guides][migration-guides-tf] for details. |

## Release notes

<!-- vale write-good.Passive = NO -->
Release notes for all Official Providers are published on their respective [Upbound Marketplace][upbound-marketplace] listings. Each provider listing includes:
<!-- vale write-good.Passive = YES -->

- Current and historical release notes
- Version-specific changelogs
- Installation instructions
- API documentation

## Authentication

All Official Providers support multiple authentication methods to accommodate different deployment scenarios and security requirements.

For detailed authentication configuration for each provider, see the [Provider
Authentication guide][authentication-guide].

## Access

The latest versions of the Upbound Official Providers are available for use by anyone in the Crossplane community. For full access and use details, read the [policies page][policies-page] on access, support and more.

[migration-guides-tf]: /manuals/packages/providers/provider-terraform/migrate-provider-tf/
[authentication-guide]: /manuals/packages/providers/authentication/
[kcl]: /manuals/cli/howtos/compositions/kcl/
[python]: /manuals/cli/howtos/compositions/python/
[go]: /manuals/cli/howtos/compositions/go/
[gotemplating]: /manuals/cli/howtos/compositions/go-template/
[signed-by-upbound]: /manuals/packages/providers/signature-verification
[pull-an-official-provider]: /manuals/packages/policies
[policies-page]: /manuals/packages/policies
[upbound-marketplace]: https://marketplace.upbound.io/providers?tier=official
[provider-family-aws]: https://github.com/crossplane-contrib/provider-upjet-aws
[account-on-upbound]: https://www.upbound.io/register/?utm_source=docs&utm_medium=cta&utm_campaign=docs_providers
[this-query]: https://marketplace.upbound.io/providers?tier=official
[marketplace-aws]: https://marketplace.upbound.io/providers/upbound/provider-family-aws/latest
[marketplace-azure]: https://marketplace.upbound.io/providers/upbound/provider-family-azure/latest
[marketplace-gcp]: https://marketplace.upbound.io/providers/upbound/provider-family-gcp/latest
[marketplace-k8s]: https://marketplace.upbound.io/providers/upbound/provider-kubernetes/latest
[marketplace-helm]: https://marketplace.upbound.io/providers/upbound/provider-helm/latest
[marketplace-terraform]: https://marketplace.upbound.io/providers/upbound/provider-terraform/latest
