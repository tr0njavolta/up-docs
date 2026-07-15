---
title: Functions
sidebar_position: 10
description: Functions extend Crossplane with new ways to configure composition
---

Functions extend Crossplane with new ways to configure
[composition][composition].

You can use different *composition functions* to configure what Crossplane does
when someone creates or updates a
[composite resource (XR)][composite-resources].

:::warning
This page is a work in progress.

Functions are packages, like [Providers][providers] and
[Configurations][configurations]. Their APIs are similar. You
install and configure them the same way as a provider.

Read the [composition][compositions] documentation to
learn how to use functions in a composition.
:::

## Install a function

Install a Function with a Crossplane
`Function` object setting the
`spec.package` value to the
location of the function package.

:::warning
Beginning with Crossplane version 1.20.0 Crossplane uses the [crossplane-contrib](https://github.com/orgs/crossplane-contrib/packages) GitHub Container Registry at `xpkg.crossplane.io` by default for downloading and
installing packages. 

Specify the full domain name with the `package` or change the default Crossplane
registry with the `--registry` flag on the [Crossplane pod][pods]
:::

For example, to install the
[patch and transform function](https://github.com/crossplane-contrib/function-patch-and-transform),

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: crossplane-contrib-function-patch-and-transform
spec:
  package: xpkg.crossplane.io/crossplane-contrib/function-patch-and-transform:v0.8.2
```

By default, the Function pod installs in the same namespace as Crossplane
(`crossplane-system`).

:::note
Functions are part of the 
`pkg.crossplane.io` group.  

The `meta.pkg.crossplane.io`
group is for creating Function packages. 

Instructions on building Functions are outside of the scope of this
document.  

Read the Crossplane contributing 
[Function Development Guide](https://github.com/crossplane/crossplane/blob/main/contributing/guide-provider-development.md)
for more information.

For information on the specification of Function packages read the 
[Crossplane Function Package specification](https://github.com/crossplane/crossplane/blob/main/contributing/specifications/xpkg.md#provider-package-requirements).

```yaml
apiVersion: meta.pkg.crossplane.io/v1
kind: Function
metadata:
  name: provider-aws
spec:
# Removed for brevity
```
:::

[composition]: /manuals/uxp/concepts/composition/overview
[composite-resources]: /manuals/uxp/concepts/composition/composite-resources/
[compositions]: /manuals/uxp/concepts/composition/compositions/
[providers]: /manuals/uxp/concepts/packages/providers/
[configurations]: /manuals/uxp/concepts/packages/configurations/
[pods]: https://docs.crossplane.io/v2.0/guides/pods/ 
