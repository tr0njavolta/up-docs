---
title: "Deploy APIs for your platform"
sidebar_position: 40
description: "A guide to use an deploying APIs to your Upbound control planes"
---

Crossplane configurations are the packaging and distribution mechanism for deploying new capabilities exposed as APIs to a control plane. This solution demonstrates deploying two Configuration packages to the frontend control plane:

- An API for Backstage, explained in a previous section
- An API for databases-as-a-service

Control planes support unlimited custom APIs. Add more by declaring additional
Configurations in the Git source.pecifying them in the Git source. Argo CD
detects the new packages and deploy them to the control plane. 

## Use APIs built by others

<!-- vale gitlab.SentenceLength = NO -->
The [Upbound Marketplace][marketplace] has a collection of Upbound-published and user-published Configuration packages that define a variety of APIs, ranging from S3 buckets to app models.
<!-- vale gitlab.SentenceLength = YES -->

## Build your own APIs

You can also build your own APIs by creating a control plane project. Upbound recommends that you create a project in a separate repository, build it into a Configuration package, then add it to your solution instance. Learn about [using control plane project tooling][projectTooling] in the build guides.

[projectTooling]: /manuals/cli/howtos/project
[marketplace]: https://marketplace.upbound.io/configurations
