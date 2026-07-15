---
title: Control Plane Contexts
sidebar_position: 4
description: An introduction to the how contexts work in Upbound
aliases:
    - /reference/contexts
    - /reference/cli/contexts
---

Crossplane and Upbound emerged out of the Kubernetes ecosystem. The up CLI's
command structure and syntax is strongly inspired by Kubernetes contexts and the
conventions of the Kubernetes `kubectl` CLI.

:::tip
Ready to configure your control plane context? Go to the [how-to][howto] guide for
control plane context set up.
:::

## Contexts in Upbound

Upbound's information architecture is a hierarchy consisting of:
<!-- vale off -->
* a set of control planes
* logically grouped into control planes groups
* which are hosted in an environment called a [Space][space].

These contexts nest within each other. A control plane must **always** belong to
a group hosted in a Space--whether Cloud, Connected, or
Disconnected. <!--vale on -->

Every control plane in Upbound has its own API server. Each Space likewise
offers a set of APIs that you can manage things through, exposed as a
[Kubernetes-compatible API][kubernetes-compatible-api]. This means there's two
relevant contextual scopes you interact with often: a **Spaces context** and a
**control plane context**.

In `up`, the commands you can execute are context-sensitive.

[howto]: /manuals/cli/howtos/context-config
[space]: /self-hosted-spaces/overview/
[kubernetes-compatible-api]: https://kubernetes.io/docs/concepts/overview/kubernetes-api/


