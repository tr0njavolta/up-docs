---
title: Project Dependencies
description: "What are project dependencies?"
sidebar_position: 5
---

This document explains the basics of project dependencies and how they work in
control plane projects. Dependencies define the building blocks that make up
your control plane's behavior and ensure consistent deployments across
environments.

A **project dependency** defines the building blocks that make up your control
plane's behavior. This includes the providers, functions, configurations, and
other packages that install automatically when you deploy or initialize the
control plane.

<!-- vale gitlab.HeadingContent = NO -->
## Use cases
<!-- vale gitlab.HeadingContent = YES -->

When working with Crossplane and UXP, you have two ways to bring providers,
functions, and configurations into your control plane:

1. Install them directly into a cluster (using kubectl, up xpkg install, or the Upbound Console)
2. Declare them as dependencies in your control plane project configuration 

Declaring dependencies provides better long-term consistency, maintainability,
and control in environments with multiple clusters or team members. Declaring
dependencies is the Upbound recommended way of adding dependencies to your
project.

Declaring dependencies ensures that every time you install or bootstrap a
control plane, it includes the exact same set of packages. This helps remove 
inconsistencies between environments and prevents situations where something
works on one cluster but not another.

When you declare dependencies in your project configuration, those declarations
live in source control. This allows you to:

* Track which packages and versions you use
* Review and approve changes via pull requests
* Understand when and why something changed
* Roll back to a previous state if needed

Installing packages directly into a cluster bypasses this workflow and makes it
more difficult to track changes or identify when you introduced regressions.

```yaml
apiVersion: meta.dev.upbound.io/v1alpha1
kind: Project
metadata:
  name: configuration-backstage
spec:
  dependsOn:
  - apiVersion: pkg.crossplane.io/v1
    kind: Function
    package: xpkg.upbound.io/crossplane-contrib/function-auto-ready
    version: '>=v0.0.0'
  - apiVersion: pkg.crossplane.io/v1
    kind: Provider
    package: xpkg.upbound.io/upbound/provider-helm
    version: v0
  - apiVersion: pkg.crossplane.io/v1
    kind: Provider
    package: xpkg.upbound.io/upbound/provider-kubernetes
    version: v0
  - apiVersion: pkg.crossplane.io/v1
    kind: Configuration
    package: xpkg.upbound.io/upbound/configuration-aws-eks-pod-identity
    version: v0.7.0
##remainder of file is ommited for brevity
```

A **API Dependency** defines any building blocks of your control plane from
external APIs that aren't part of the Crossplane package. API dependencies can define dependency on any arbitrary CRD or built in Kubernetes APIs.


```yaml
    apiVersion: meta.dev.upbound.io/v2alpha1
    kind: Project
    metadata:
        name: project-template-k8s-webapp
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

## Comparison of dependency management approaches

Declaring dependencies makes your control plane predictable, reproducible, and
easier to manage over time. Manual installation is useful for short-term testing
or local development, but for a real platform or other users, you should always
declare dependencies.
