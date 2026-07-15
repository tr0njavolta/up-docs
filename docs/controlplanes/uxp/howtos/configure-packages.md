---
title: Official Package patch releases
description: "Configure cluster access for Official Package patch releases"
plan: "standard"
---

<Standard />

UXP license users of **Standard** or higher can configure the cluster for access
to patch releases of Official Packages. For more information on Official Package
access, review the [Official Package Support][official-package-support] guide.

## Prerequisites

Before you begin, make sure you have:

* an Upbound **Standard** or higher plan
* your plan license installed on your control plane

## Create an image pull secret

Your UXP instance needs an image pull secret and `ImageConfig` to authenticate
with the Marketplace repository.

Create a robot token key pair:

```shell
up robot create
```

With your robot access ID and token information, create a Kubernetes secret:

```shell
kubectl -n crossplane-system create secret docker-registry xpkg-credentials --docker-server=xpkg.upbound.io --docker-username=<ROBOT ACCESS ID> --docker-password=<ROBOT TOKEN>
```

## Create an `ImageConfig`

Next, create a new file called `imageconfig.yaml` and create a new `ImageConfig`
to associate your secret with future repository pulls:

```yaml
apiVersion: pkg.crossplane.io/v1beta1
kind: ImageConfig
metadata:
  name: official-packages
spec:
  matchImages:
    - type: Prefix
      prefix: xpkg.upbound.io/upbound/
  registry:
    authentication:
      pullSecretRef:
        name: xpkg-credentials
```

Your UXP instance can now pull any version of an Official Package.

[official-package-support]: /manuals/uxp/official-package-support
[robot]: /manuals/platform/robots
