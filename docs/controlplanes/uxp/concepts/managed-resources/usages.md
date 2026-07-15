---
title: Usages
sidebar_position: 3
description: Usage indicates a resource is in use
---

A `Usage` indicates a resource is in use. Two main use cases for Usages are
as follows:

1. Protecting a resource from accidental deletion.
2. Deletion ordering by ensuring that a resource isn't deleted before the 
   deletion of its dependent resources.

See the section [Usage for Deletion Protection](#usage-for-deletion-protection) for the
first use case and the section [Usage for Deletion Ordering](#usage-for-deletion-ordering)
for the second one.

## Enable usages

<!-- vale write-good.Passive = NO -->
Usages are a beta feature. Beta features are enabled by default.
<!-- vale write-good.Passive = YES -->

Disable `Usage` support by 
[changing the Crossplane pod setting][pods]
and setting  
--enable-usages=false
argument.

```yaml
$ kubectl edit deployment crossplane --namespace crossplane-system
apiVersion: apps/v1
kind: Deployment
spec:
# Removed for brevity
  template:
    spec:
      containers:
      - args:
        - core
        - start
        - --enable-usages=false
```

## Create a usage

A Usage spec has a mandatory of field for defining the resource in use or
protected. The reason field defines the reason for protection and the by field
defines the using resource. Both fields are optional, you must provide at least
one.

### Usage for deletion protection

The following example prevents the deletion of the 
`my-database` resource by rejecting
any deletion request with the
reason defined.

<!-- vale Google.FirstPerson = NO -->
```yaml
apiVersion: protection.crossplane.io/v1beta1
kind: Usage
metadata:
  namespace: default
  name: protect-production-database
spec:
  of:
    apiVersion: rds.aws.upbound.io/v1beta1
    kind: Instance
    resourceRef:
      name: my-database
  reason: "Production Database - should never be deleted!"
```
<!-- vale Google.FirstPerson  = YES -->

### Usage for deletion ordering

The following example prevents the deletion of
my-cluster resource by rejecting
any deletion request before the deletion of 
my-prometheus-chart resource.

```yaml
apiVersion: protection.crossplane.io/v1beta1
kind: Usage
metadata:
  namespace: default
  name: release-uses-cluster
spec:
  of:
    apiVersion: eks.upbound.io/v1beta1
    kind: Cluster
    resourceRef:
      name: my-cluster
  by:
    apiVersion: helm.crossplane.io/v1beta1
    kind: Release
    resourceRef:
      name: my-prometheus-chart
```

### Using selectors with usages

Usages can use selectors to define the resource in use or the using one. This
enables using labels or matching controller references to define resource
instead of providing the resource name.

```yaml
apiVersion: protection.crossplane.io/v1beta1
kind: Usage
metadata:
  namespace: default
  name: release-uses-cluster
spec:
  of:
    apiVersion: eks.upbound.io/v1beta1
    kind: Cluster
    resourceSelector:
      matchControllerRef: false # default, and could be omitted
      matchLabels:
        foo: bar
  by:
    apiVersion: helm.crossplane.io/v1beta1
    kind: Release
    resourceSelector:
       matchLabels:
          baz: qux
```

After the `Usage` controller resolves the selectors, it persists the resource
name in the 
resourceRef.name
field. The following example shows the `Usage` resource after the resolution of
selectors.

<!-- vale write-good.Passive = NO -->
:::important
The selectors resolve only once. If there is more than one match, a
random resource is selected from the list of matched resources.
:::
<!-- vale write-good.Passive = YES -->

```yaml
apiVersion: protection.crossplane.io/v1beta1
kind: Usage
metadata:
  namespace: default
  name: release-uses-cluster
spec:
  of:
    apiVersion: eks.upbound.io/v1beta1
    kind: Cluster
    resourceRef:
       name: my-cluster
    resourceSelector:
      matchLabels:
        foo: bar
  by:
    apiVersion: helm.crossplane.io/v1beta1
    kind: Release
    resourceRef:
       name: my-cluster
    resourceSelector:
       matchLabels:
          baz: qux
```

### Replay blocked deletion attempt

<!-- vale gitlab.SentenceLength = NO -->
By default, the deletion of a `Usage` resource doesn't trigger the deletion of
the resource in use even if there were deletion attempts blocked by the `Usage`.
Replaying the blocked deletion is possible by setting the
replayDeletion field to `true`.
<!-- vale gitlab.SentenceLength = YES -->

```yaml
apiVersion: protection.crossplane.io/v1beta1
kind: Usage
metadata:
  namespace: default
  name: release-uses-cluster
spec:
  replayDeletion: true
  of:
    apiVersion: eks.upbound.io/v1beta1
    kind: Cluster
    resourceRef:
      name: my-cluster
  by:
    apiVersion: helm.crossplane.io/v1beta1
    kind: Release
    resourceRef:
      name: my-prometheus-chart
```

<!-- vale gitlab.SentenceLength = NO -->
:::tip
Replay deletion is useful when the used resource is part of a composition.
This configuration radically decreases time for the deletion of the used
resource, hence the composite owning it, by replaying the deletion of the
used resource right after the using resource disappears instead of waiting
for the long exponential backoff durations of the Kubernetes garbage collector.
:::

## Usage in a composition

A typical use case for Usages is to define a deletion ordering between the
resources in a Composition. The Usages support [matching controller
reference][managed-resources-controller-ref] in selectors to ensures that the
matching resource is in the same composite resource in the same way as
[cross-resource referencing][managed-resources-referencing].
<!-- vale gitlab.SentenceLength = YES -->
<!-- vale write-good.Passive = NO -->
:::tip
When there are multiple resources of same type in a Composition, the Usage
resource must uniquely identify the resource in use or the using one. This could
be accomplished by using extra labels and combining matchControllerRef with a
`matchLabels` selector. 
:::
<!-- vale write-good.Passive = YES -->

## Usage across namespaces

A `Usage` with `of` and `by` represents a usage relationship between two
resources in the same namespace as the `Usage` by default.

A `Usage` can represent a usage relationship between a `by` resource in the same
namespace as the `Usage` and an `of` resource in a different namespace.

To use a resource in a different namespace, specify the `namespace` in the `of`
`resourceRef` or `resourceSelector`.

```yaml
apiVersion: protection.crossplane.io/v1beta1
kind: Usage
metadata:
  namespace: default
  name: release-uses-cluster
spec:
  of:
    apiVersion: eks.upbound.io/v1beta1
    kind: Cluster
    resourceRef:
      namespace: cluster-infra
      name: my-cluster
  by:
    apiVersion: helm.crossplane.io/v1beta1
    kind: Release
    resourceRef:
      name: my-prometheus-chart
```

## ClusterUsages

Use a `ClusterUsage` to protect cluster scoped resources.

```yaml
apiVersion: protection.crossplane.io/v1beta1
kind: ClusterUsage
metadata:
  name: protect-important-crd
spec:
  of:
    apiVersion: apiextensions.k8s.io/v1
    kind: CustomResourceDefinition
    resourceRef:
      name: importantresources.example.crossplane.io
  reason: "Very important CRD - should never be deleted!"
```

[pods]: https://docs.crossplane.io/v2.0/guides/pods/#change-pod-settings 
[managed-resources-controller-ref]: /manuals/uxp/concepts/managed-resources/overview#matching-by-controller-reference
[managed-resources-referencing]: /manuals/uxp/concepts/managed-resources/overview#referencing-other-resources
