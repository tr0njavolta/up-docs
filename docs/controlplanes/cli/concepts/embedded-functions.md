---
title: Embedded Functions
description: "Learn about Embedded Functions"
sidebar_position: 6
---

This document explains the basics of embedded functions and how they work in
control plane projects. Embedded functions provide a lightweight way to
customize composition behavior without the complexity of managing separate
containerized functions.

An **embedded function** is a lightweight, self-contained unit of logic that
runs inside your control plane as part of a function pipeline. Embedded
functions allow you to customize how your compositions behave by injecting
defaults, transforming data, validating inputs, generating outputs, or reacting
to external signals.

## Embedded functions vs traditional Crossplane functions

Both embedded functions and upstream Crossplane functions extend your control
plane with custom logic, they differ in how you author, deploy, and manage them.

<!-- vale write-good.Weasel = NO -->
<!-- vale Microsoft.Adverbs = NO -->
You design embedded functions to be lightweight and tightly integrated into your
control plane project. In contrast, upstream Crossplane functions follow a more
traditional Kubernetes model, requiring containerized deployments and additional
Kubernetes resources.
<!-- vale Microsoft.Adverbs = YES -->
<!-- vale write-good.Weasel = YES -->

### Key differences

<!-- vale Microsoft.Adverbs = NO -->
**Deployment and Management**: You bundle embedded functions directly into your
control plane project. You don't need to deploy additional Function custom
resources or manage sidecar containers. You typically containerize upstream
functions as workloads that you must deploy into the cluster and manage
separately.
<!-- vale Microsoft.Adverbs = YES -->

**Performance and Overhead**: Embedded functions run in-memory as part of the
control plane's reconciliation loop. This makes them faster and more efficient,
with less runtime overhead compared to containerized upstream functions that
operate as external processes.

**Portability and Versioning**: Because embedded functions live inside your
control plane project package, you version them alongside your infrastructure
definitions. This ensures that your logic and configuration evolve together,
making control planes fully portable across environments. You version upstream
functions independently and require separate coordination to ensure
compatibility.

**Developer Experience**: Embedded functions support multiple languages
including Go, KCL, Python, and Go-templating, offering greater flexibility for
teams with diverse skill sets. You typically author upstream functions in Go and
require container build and deployment pipelines, which can be a heavier lift
for platform teams.

<!-- vale gitlab.HeadingContent = NO -->
## Use cases
<!-- vale gitlab.HeadingContent = YES -->

Use embedded functions when you want:

- Fast, low-overhead customization for compositions
- A fully declarative control plane project with all logic embedded and versioned
- Simpler developer workflows without managing containers
- Reusable, language-flexible logic that travels with your platform configuration
