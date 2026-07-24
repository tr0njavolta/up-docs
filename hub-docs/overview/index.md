---
title: Hub
slug: /
sidebar_position: 0
description: Hub is the central cluster in an Upbound Platform deployment, where the platform's central components install.
---

Hub is the central cluster in an Upbound Platform deployment. The hub is where
you install the platform components, and it manages the hub API server, the
indexer, search, and console. You can connect your Space, UXP instance, or
generic Kubernetes clusters to push their state to the hub. From there, you can
query your whole fleet.

<!-- vale Microsoft.HeadingPunctuation = NO -->
## Why hub?
<!-- vale Microsoft.HeadingPunctuation = YES -->

Upbound hub is the central location for the services which make up the
Upbound Platform. Through the Hub, users can manage the access to each of these
features and operate them securely and at scale. Hub includes a web interface
to manage and interact with these features. By default, Hub includes the
following features:

- Insights
- Control Plane Management
- IAM

### Insights

Insights is a single pane of glass for managing your distributed
Kubernetes clusters at scale. Through Insights, Hub exposes one live view of all
resources with a unified search and filtering system. Saving these views as
"Lenses" gives a reproducible slice of your resources that you can share with coworkers.

### Control plane management

`<TODO>`

### IAM

`<TODO>`
