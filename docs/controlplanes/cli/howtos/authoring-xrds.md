---
title: Design a control plane API
sidebar_position: 6
description: Define your first API in your control plane project
---

This guide explains how to create Composite Resource Definitions (XRDs) that
define the API schema for your control plane. This allows users to request
infrastructure resources through a consistent interface.

Use this guide when you're ready to define what resources your users can request
and how to structure those requests. XRDs are the contract between your users
and your infrastructure

## Prerequisites

Before you begin, make sure you have:

* Setup a control plane project
* Added your dependencies
* Understand what infrastructure your users need to provision


## Generate from Composite Resource (XR)

You can create an XRD by generating one from an XR. You can create the
scaffolding with the `up` CLI:

```shell
up example generate --type xr
```

This command creates a composite resource file in
`examples/<your_resource_name>/example.yaml`.


In the XR file, you can insert your deployment parameters. For example, you
could configure versioning, encryption or visibility for an S3 bucket
deployment:


```yaml
apiVersion: platform.upbound.io/v1alpha1
kind: XBucket
metadata:
  name: example
spec:
  parameters:
    versioning: true
    encrypted: true
    visibility: public
  # Additional fields for direct XR control
  resourceConfig:
    deletionPolicy: Delete
    providerConfigRef:
      name: default
```

With your parameters set, you can generate the XRD from this XR file:

```shell
up xrd generate examples/<your_resource_name>/example.yaml
```

This command creates `apis/<your_resource_name>/definition.yaml` with an XRD
file that matches your composite resource structure. Upbound infers how to build
the API based on how you configure the XR.

## Customize your XRD schema

You can manually update your generated XRD with additional parameters. 

In your XRD, find the `parameters` section. You can add a `required` property
and choose your requirements:

```yaml
properties:
  parameters:
    properties:
      versioning:
        type: boolean
        default: false
        description: "Enable versioning for the bucket"
    type: object
  required:
    - versioning
```

