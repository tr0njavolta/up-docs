---
title: Query API
sidebar_position: 40
description: Use the `up` CLI to query objects and resources
draft: true
---

<!-- vale write-good.TooWordy = NO -->
<!-- ignore "aggregate" -->
:::important

This feature is in preview. This guide is for the **UXP** version of the Query
API.
Query API is available for Cloud and Self-hosted Spaces. To use the Query API in
those environments, see the related
[documentation][documentation] to enable this feature.

:::


The Query API allows users to inspect objects and resources within their
control plane. The read-only `up alpha query` and `up alpha get` CLI commands
allow you to gather information on your control plane in a fast and efficient
package. These commands follow the [`kubectl` conventions][kubectl-conventions]
for filtering, sorting, and retrieving information from your control plane.

<!-- vale Google.Headings = NO -->

## Using the Query API

<!-- vale Google.Headings = YES -->
The Query API allows you to retrieve control plane information faster than
traditional `kubectl` commands. This feature lets you debug your Upbound Crossplane
resources with the CLI or within the Web UI.

### Query your control plane

Use the `up alpha get` command to retrieve information about objects within the
current control plane context. This command uses the **Query** endpoint and
targets the current control plane.


You can query within your control plane with the [`up alpha get` command][up-alpha-get-command] to return more information about a given object within the current kubeconfig context.

The `up alpha get` command can query resource types and aliases to return objects in your control plane.

```shell
up alpha get managed
NAME                             READY   SYNCED   AGE
custom-account1-5bv5j-sa         True    True     15m
custom-cluster1-bq6dk-net        True    True     15m
custom-account1-5bv5j-subnet     True    True     15m
custom-cluster1-bq6dk-nodepool   True    True     15m
custom-cluster1-bq6dk-cluster    True    True     15m
custom-account1-5bv5j-net        True    True     15m
custom-cluster1-bq6dk-subnet     True    True     15m
custom-cluster1-bq6dk-sa         True    True     15m
```

To query for [multiple resource types][multiple-resource-types], you can add the
name or alias for the resource as a comma separated string.

```shell
up alpha get providers,providerrevisions

NAME                                                                              HEALTHY     REVISION   IMAGE                                                    STATE    DEP-FOUND   DEP-INSTALLED   AGE
providerrevision.pkg.crossplane.io/crossplane-contrib-provider-nop-ecc25c121431   True        1          xpkg.upbound.io/crossplane-contrib/provider-nop:v0.2.1   Active                               18m
NAME                                                                              INSTALLED   HEALTHY    PACKAGE                                                  AGE
provider.pkg.crossplane.io/crossplane-contrib-provider-nop                True        True       xpkg.upbound.io/crossplane-contrib/provider-nop:v0.2.1   18m
```

### Query API request format

The CLI can also return a version of your query request with the [`--debug`
flag][debug-flag]. This flag returns the API spec request for your query.

```shell
up alpha query composite -A -d

apiVersion: query.spaces.upbound.io/v1alpha1
kind: SpaceQuery
metadata:
  creationTimestamp: null
spec:
  cursor: true
  filter:
    categories:
    - composite
    controlPlane: {}
  limit: 500
  objects:
    controlPlane: true
    table: {}
  page: {}
```

For more complex queries, you can interact with the Query API like a
Kubernetes-style API by creating a query and applying it with `kubectl`.

The example below is a query for `claim` resources in every control plane from
oldest to newest and returns specific information about those claims.


```yaml
apiVersion: query.spaces.upbound.io/v1alpha1
kind: SpaceQuery
spec:
  filter:
    categories:
    - claim
  order:
  - creationTimestamp: Asc
  cursor: true
  count: true
  objects:
    id: true
    controlPlane: true
    object:
      kind: true
      apiVersion: true
      metadata:
        name: true
        uid: true
      spec:
        containers:
          image: true
```

<!-- vale write-good.Passive = NO -->
The Query API is served by the Spaces API endpoint. You can use `up ctx` to
switch the kubectl context to the Spaces API ingress. After that, you can use
`kubectl create` and receive the `response` for your query parameters.
<!-- vale write-good.Passive = YES -->

```shell
kubectl create -f spaces-query.yaml -o yaml
```

Your `response` should look similar to this example:

```yaml {copy-lines="none"}
apiVersion: query.spaces.upbound.io/v1alpha1
kind: SpaceQuery
metadata:
  creationTimestamp: "2024-08-08T14:41:46Z"
  name: default
response:
  count: 3
  cursor:
    next: ""
    page: 0
    pageSize: 100
    position: 0
  objects:
  - controlPlane:
      name: query-api-test
      namespace: default
    id: default/query-api-test/823b2781-7e70-4d91-a6f0-ee8f455d67dc
    object:
      apiVersion: spaces.platform.upbound.io/v1alpha1
      kind: Space
      metadata:
        name: space-awg-kine
        resourceVersion: "803868"
        uid: 823b2781-7e70-4d91-a6f0-ee8f455d67dc
      spec: {}
  - controlPlane:
      name: test-1
      namespace: test
    id: test/test-1/08a573dd-851a-42cc-a600-b6f6ed37ee8d
    object:
      apiVersion: argo.discover.upbound.io/v1alpha1
      kind: EKS
      metadata:
        name: test-1
        resourceVersion: "4270320"
        uid: 08a573dd-851a-42cc-a600-b6f6ed37ee8d
      spec: {}
  - controlPlane:
      name: controlplane-query-api-test-spaces-playground
      namespace: spaces-clusters
    id: spaces-clusters/controlplane-query-api-test-spaces-playground/b5a6770f-1f85-4d09-8990-997c84bd4159
    object:
      apiVersion: spaces.platform.upbound.io/v1alpha1
      kind: Space
      metadata:
        name: spaces-cluster-0
        resourceVersion: "1408337"
        uid: b5a6770f-1f85-4d09-8990-997c84bd4159
      spec: {}
```
<!-- vale off -->

## UXP Query API Explorer

<!-- vale on -->

import CrdDocViewer from '@site/src/components/CrdViewer';

### Query

The Query resource allows you to query objects in a single control plane.

<CrdDocViewer crdUrl="/crds/query/spaces.upbound.io_queries.yaml" />

<!-- ignore "aggregate" -->
<!-- vale write-good.TooWordy = YES -->

[documentation]: /self-hosted-spaces/howtos/query-api
[up-ctx]: /reference/cli-reference
[up-alpha-get-command]: /reference/cli-reference
[a-flag]: /reference/cli-reference
[multiple-resource-types]: /reference/cli-reference
[up-alpha-query-command]: /reference/cli-reference
[sort-by-flag]: /reference/cli-reference
[label-columns]: /reference/cli-reference
[debug-flag]: /reference/cli-reference
[kubectl-conventions]: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
