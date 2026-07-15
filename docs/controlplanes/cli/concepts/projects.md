---
title: Control Plane Projects
description: "What are Control Plane Projects?"
sidebar_position: 2
---

This document explains the basics of control plane projects and how they work
with UXP local development tools. Projects provide a structured way to define,
develop, and test your control plane configurations.

## Requirements

To use local control plane development tools, make sure you have:

* [up][up] CLI installed
* A Docker-compatible container runtime installed and running on your system

<!-- vale Microsoft.Contractions = NO -->
<!-- vale Microsoft.HeadingPunctuation = NO -->
## What is a control plane project?
<!-- vale Microsoft.HeadingPunctuation = YES -->
<!-- vale Microsoft.Contractions = YES -->

A control plane project is the source-level code representation of your control
plane.

Projects require an `upbound.yaml` file. The command `up project init` uses an
Upbound-provided template by default, which creates a predefined `upbound.yaml`.
If you choose to override the default template with your own, make sure your
template contains an `upbound.yaml` in the root directory.

Project files define the constraints and dependencies of your control plane. The
project file also contains metadata about your project, such as the maintainers
and which template it derives from.

Inside your control plane project, you can define:

- Your platform API schemas as a collection of `CompositeResourceDefinitions (XRDs)`
- The implementation of those schemas as Crossplane `compositions`
- Any dependencies your control plane has on providers, functions, or configuration packages
- Composition functions, which are modules that your compositions reference to define how to compose resources
- Test suites for your API to conduct testing as part of your development workflow

UXP supports local development with the `up` CLI to run and test your control
plane projects.

[up]: /manuals/cli/overview
