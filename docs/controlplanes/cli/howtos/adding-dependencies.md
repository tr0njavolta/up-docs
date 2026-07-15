---
title: Add project dependencies 
sidebar_position: 5
description: How to add providers, functions, and API dependencies to your control plane project
---

This guide explains how to add cloud providers, functions and configurations as
dependencies to connect your control plane to external systems.

You add dependencies when you need to manage resources in
specific cloud platforms (like AWS buckets) or to use
pre-built packages from the community.

## Prerequisites

Before you begin, make sure you have:

* The `up` CLI installed
* Set up a control plane project
* Cloud provider access

## Choose your dependencies

Dependencies connect your control plane to external systems. Choose the type
based on what you want your control plane to do.

Examples of dependencies include:

1. **Providers** to connect to cloud platforms and manage their resources:
   * `xpkg.upbound.io/upbound/provider-aws-s3` - Provider for AWS S3 buckets
   * `xpkg.upbound.io/upbound/provider-azure-storage` - Provider for Azure blob
       storage
   * `xpkg.upbound.io/upbound/provider-gcp-storage` - Provider for GCP storage
2. **Functions** to add logic and transformations to your compositions:
   * `xpkg.upbound.io/crossplane-contrib/function-go-templating` - Language
       function example
3. **Configurations** that provide pre-built setups:
   * `xpkg.upbound.io/upbound/platform-ref-aws` - AWS reference platform
   * `xpkg.upbound.io/upbound/platform-ref-gcp` - GCP reference platform
4. **API dependencies** for any external APIs that aren't part of the Crossplane package.

## Add provider dependencies

Add providers to connect your control plane to your cloud platform. Find your
cloud provider dependencies in the [Upbound Marketplace][marketplace]. The
Marketplace groups AWS, Azure, and GCP resources into `family` providers.

```shell
up dependency add xpkg.upbound.io/upbound/provider-aws-s3:v1.16.0
```

This command adds your provider to the `upbound.yaml` project file:

```yaml
spec:
  dependsOn:
  - provider: xpkg.upbound.io/upbound/provider-aws-s3
    version: v1.16.0
  - function: xpkg.upbound.io/crossplane-contrib/function-auto-ready
    version: '>=v0.0.0'
```

## Add functions

Add functions to your project to use custom logic in your compositions:

```shell
up dependency add xpkg.upbound.io/crossplane-contrib/function-status-transformer:v0.4.0
```


For more information on functions, check out the Upbound Crossplane
[Function][function] documentation.

## Add configurations

Add configurations to use pre-built control plane setups as building blocks:

```shell
up dependency add xpkg.upbound.io/upbound/platform-ref-aws:v1.4.0
```

For more information about configurations and platform references, check out the
[Configuration][configuration] documentation.

## Add external API dependencies
In your `upbound.yaml` file, you can define the external API you wish to reference in your project under the `spec.apiDependencies` field.

The example below defines an external API dependency to the Kubernetes API and
an arbitrary CRD living in a Git repository.

```yaml
spec:
    apiDependencies:
    - k8s:
        version: v1.33.0
      type: k8s
    - git:
        path: cluster/crds
        ref: release-1.20
        repository: https://github.com/crossplane/crossplane
      type: crd
```

## Manage dependency versions

You can append the dependency version to your `up dependency add` command in the
examples above.

You can always use the latest version of the provider by removing the dependency
version:

```shell
up dependency add xpkg.upbound.io/upbound/provider-aws-s3 && up dependency clean-cache
```
Your `upbound.yaml` project file shows the version as `>= v0.0.0`:
```yaml
spec:
  dependsOn:
  - provider: xpkg.upbound.io/upbound/provider-aws-s3
    version: '>=v0.0.0'
  - function: xpkg.upbound.io/crossplane-contrib/function-auto-ready
    version: '>=v0.0.0'
```

To upgrade your provider versions, you can re-run `up dependency add` with the
later version:

```shell
up dependency add xpkg.upbound.io/upbound/provider-aws-s3:v1.17.0
```

You can also update the `upbound.yaml` provider with the new version and run:


```shell
up dependency update-cache && up dependency clean-cache
```

This forces a fresh download of the dependencies on the next build.

## Configure dependencies for private registries

If you use private container registries like AWS `ECR`, Azure `ACR` or Google
`GCR` you need to configure image rewriting.

Add an `imageConfig` to your `upbound.yaml` project file:

<EditCode language="yaml">
{`
...
spec:
  dependsOn:
  - function: xpkg.upbound.io/crossplane-contrib/function-auto-ready
    version: '>=v0.0.0'
  imageConfig:
  - matchImages:
    - prefix: xpkg.upbound.io
      type: Prefix
    rewriteImage:
      prefix: $@YOUR_REGISTRY_URL$@
...
`}
</EditCode>

Next, add your dependencies:

```shell
up dependency add xpkg.upbound.io/upbound/provider-aws-s3:v1.17.0
```

Now, Upbound rewrites your dependencies to your private registry while
maintaining the original reference in the configuration.

[configuration]: /manuals/packages/configurations/
[marketplace]: https://marketplace.upbound.io/providers
[function]: /manuals/packages/functions
[composition]: /manuals/uxp/concepts/composition/overview
[up-dependency-add]: /reference/cli-reference
[up-dependency-update-cache]: /reference/cli-reference
[up-dependency-clean-cache]: /reference/cli-reference
[authoring-a-composition-resource-definition-xrd]: /guides/projects/authoring-xrds
[installed]: /manuals/cli/overview
