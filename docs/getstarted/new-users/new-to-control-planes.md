---
title: What is a control plane?
sidebar_position: 2
pagination_prev: null
pagination_next: null
---
import CardGrid from '@site/src/components/CardGrid';

If you're new to Crossplane and Upbound, you should start by getting familiar
with _control planes_. A control plane in Kubernetes is the layer that makes
scheduling and orchestration decisions for a cluster. In this guide, you'll
learn about how Crossplane has extended the control plane model outside the
cluster. 

## Kubernetes control planes - for cluster control

A Kubernetes control plane is the central management layer for your workloads
and the state of your cluster.

Every component in the cluster communicates with the control plane to read and
write state.

It exposes the Kubernetes API, stores cluster data, schedules pods, and runs the
control loops that keep everything in sync.


## Crossplane control planes - for infrastructure control

Crossplane takes this same idea and applies it to the resources that live
outside the cluster. A Crossplane control plane becomes the central management
layer for your databases, IAM policies, compute resources, and more. If it has
an API, you can manage it in Crossplane with a provider which is a package that
enables Crossplane to provision infrastructure on an external service. 

Crossplane doesn't simply create the infrastructure - like the Kubernetes
control plane, it manages everything in a reconciliation loop. Meaning it checks
the state of its resources through its Provider - like provider-aws - which
calls the underlying services API. If the resources doesn't match the manifest,
Crossplane takes action to fix it.

Those reconciliation loops give resources managed by Crossplane the same
resilience Kubernetes gives your workloads. If a pod fails, the control plane
notices the drift and creates a replacement. If someone manually updates a
security group in a cloud console, Crossplane notices the drift and works to
return the resource to your desired state.

## Upbound Crossplane and Spaces - for scale and beyond

Running one Crossplane control plane is powerful. 

Running dozens or hundreds of them, across teams, environments, and clouds, can
become difficult to manage. That's why we created a downstream distribution of
Crossplane called Upbound Crossplane (UXP). UXP gives you some operational
features Crossplane doesn't out of the box like a secrets proxy, backup and
restore, and control plane insights.

We also offer Spaces for enterprise and business critical operations. A Space is
a hosting environment for control-planes-as-a-service. Instead of standing up a
new cluster for every control plane you need, a Space lets you run many isolated
control planes on shared infrastructure, in Upbound's cloud or self-hosted . 

The goal of UXP and Spaces is to give you the features you need to run control
planes at scale.

In next guide, you'll install UXP on a local kind cluster and use it to deploy
an image to see the control plane workflow. You'll also see the single pane of
glass Upbound gives you to monitor your control plane.


<CardGrid sections={[
  {
    title: 'Create a UXP control plane',
    description: 'Follow the introduction guide to build your first control plane from scratch.',
    link: '/getstarted/new-users/controlplanes-quickstart'
  }
]} />


