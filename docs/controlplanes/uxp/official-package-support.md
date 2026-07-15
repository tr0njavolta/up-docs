---
title: Official Package support
description: "Learn how to use the Official Packages on UXP"
sidebar_position: 2
---

Upbound Crossplane supports running [Official Packages][official-packages]
released by Upbound. These packages extend your Upbound Crossplane cluster with
new capabilities, user-defined logic, and add-ons. 

## Package availability

Patch version releases of Official Packages require a
commercial license, available for users on a Standard plan or greater.

## Learn about packages

Read the [package concept][package-concept] documentation to learn how packages
work in Upbound Crossplane. Read the Official Package [policies][policies]
documentation to learn about how to access different packages and versions on
Upbound Crossplane.


## Migrate from Crossplane

To move your packages from the Crossplane GithHub container registry to Upbound
Crossplane official providers, you can change the image reference in your
install manifest.

For example:
```diff
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
-  name: provider-family-aws
+ name: upbound-provider-family-aws
spec:
-  package: xpkg.crossplane.io/crossplane-contrib/provider-family-aws:v1.23.0
+  package: xpkg.upbound.io/upbound/provider-family-aws:v1.23.0
```

[official-packages]: /manuals/packages/overview
[package-concept]: /manuals/uxp/concepts/packages/providers
[policies]: /manuals/packages/policies
