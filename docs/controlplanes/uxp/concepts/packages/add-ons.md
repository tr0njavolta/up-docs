---
title: Add-Ons
sidebar_position: 25
description: A guide to how to wrap and deploy an Upbound Add-On into control
  planes on Upbound.
---

Upbound's _Add-Ons_ feature lets you build and deploy control plane software
from the Kubernetes ecosystem. With the _Add-Ons_ feature, you're not
limited to just managing resource types defined by Crossplane. Now you can
create resources from _CustomResourceDefinitions_ defined by other Kubernetes
ecosystem tooling. 

:::tip

Add-Ons are a package type that's only available for Upbound Crossplane v2 (UXP v2)

:::


## Benefits

The Add-Ons feature provides the following benefits:

* Deploy Model Context Protocol (MCP) servers to deliver more powerful intelligent control in [compositions][intelligent-compositions] and [operations][intelligent-operations].
* Deploy control plane software from the Kubernetes ecosystem.
* Use your control plane's package manager to handle the lifecycle of the control plane software and define dependencies between package.
* Build powerful compositions that combine both Crossplane and Kubernetes _CustomResources_.

<!-- vale gitlab.HeadingContent = NO -->
## How it works
<!-- vale gitlab.HeadingContent = YES -->

An _AddOn_ is a package type that bundles control plane software from the
Kubernetes ecosystem. Examples of such software includes:

- Kubernetes policy engines
- CI/CD tooling
- Your own private custom controllers defined by your organization

You can discover Add-Ons in the Upbound Marketplace or build your own package.

You build an _AddOn_ package by wrapping a helm chart along with its requisite
_CustomResourceDefinitions_. Your _AddOn_ package gets pushed to an OCI
registry. From there you can apply it to a control plane like you would any
other Crossplane package. Your control plane's package manager is responsible
for managing the lifecycle of the software once applied.

<!-- vale Google.Headings = NO -->
## Build your own AddOn
<!-- vale Google.Headings = YES -->

### Prerequisites

Packaging an _AddOn_ requires [up CLI][up-cli]  `v0.40.0` or later.

<!-- vale Google.Headings = NO --> 
<!-- vale Microsoft.Headings = NO --> 
### Build an _AddOn_ package
<!-- vale Google.Headings = YES --> 
<!-- vale Microsoft.Headings = YES --> 

_AddOns_ are a package type that get administered by your control plane's package manager.

#### Prepare the package

To define an _AddOn_, you need a Helm chart. This guide assumes the control plane software you want to build into an _AddOn_ already has a Helm chart available.

Start by making a working directory to assemble the necessary parts:

```ini
mkdir addon-package
cd addon-package
```

Inside the working directory, pull the Helm chart

```ini
export CHART_REPOSITORY=<helm-chart-repo>
export CHART_NAME=<helm-chart-name>
export CHART_VERSION=<helm-chart-version>

helm pull $CHART_NAME --repo $CHART_REPOSITORY --version $CHART_VERSION
```

Move the Helm chart into it's own folder:

```ini
mkdir helm
mv $CHART_NAME-$CHART_VERSION.tgz helm/chart.tgz
```

Unpack the CRDs from the Helm chart into their own directory:

```ini
export RELEASE_NAME=<helm-release-name>
export RELEASE_NAMESPACE=<helm-release-namespace>

mkdir crds
helm template $RELEASE_NAME helm/chart.tgz -n $RELEASE_NAMESPACE --include-crds | \
  yq e 'select(.kind == "CustomResourceDefinition")' - | \
  yq -s '("crds/" + .metadata.name + ".yaml")' -
```

:::tip
The preceding instructions assume your CRDs get deployed as part of your Helm chart. If they're deployed another way, you need to manually copy your CRDs instead.
:::

Create a `crossplane.yaml` with your AddOn metadata:

```yaml
cat <<EOF > crossplane.yaml
apiVersion: meta.pkg.upbound.io/v1beta1
kind: AddOn
metadata:
  annotations:
    friendly-name.meta.crossplane.io: Add-On <your-add-on>
    meta.crossplane.io/description: |
      A brief description of what the Add-On does.
    meta.crossplane.io/license: Apache-2.0
    meta.crossplane.io/maintainer: <your-email>
    meta.crossplane.io/readme: |
      An explanation of your Add-On.
      meta.crossplane.io/source: <url-for-your-add-on-source>
  name: <add-on-name>
spec:
  packagingType: Helm
  helm:
    releaseName: <release-name>
    releaseNamespace: <release-namespace>
    # Value overrides for the helm release can be provided below.
    # values:
    #   foo: bar
EOF
```

Your Add-On's file structure should look like this:

```ini
.
├── crds
│   ├── your-crd.yaml
│   ├── second-crd.yaml
│   └── another-crd.yaml
├── crossplane.yaml
└── helm
    └── chart.tgz
```

#### Create a ClusterRole or Role for your *AddOn*

To deploy *AddOns* in your cluster, you must configure the
`upbound-controller-manager` service account with the necessary permissions.

The specific RBAC requirements vary depending on your AddOn and the Kubernetes
resources it manages.

To create the correct permissions, you need to:

1. **Define your RBAC permissions** with a `Role` or `ClusterRole` that grants
   access to the resources your AddOn manages
2. **Bind permissions to the `upbound-controller-manager`
   ServiceAccount** in the `crossplane-system` namespace

An example `ClusterRoleBinding`:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: upbound-controller-manager-addons
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: <your_addon_role>
subjects:
  - kind: ServiceAccount
    name: upbound-controller-manager
    namespace: crossplane-system
```
Replace `<your_addon_role>` with the name of the `ClusterRole` or `Role` with
permissions your AddOn requires.

<!-- vale Google.Headings = NO -->
#### Package and push the AddOn
<!-- vale Google.Headings = YES -->

At the root of your Add-On's working directory, build the contents into an xpkg:

```ini
up xpkg build
```

This causes an xpkg to get saved to your current directory with a name like `addon-f7091386b4c0.xpkg`.

Push the package to your desired OCI registry:

```ini
export UPBOUND_ACCOUNT=<org-account-name>
export ADD_ON_NAME=<add-on-name>
export ADD_ON_VERSION=<add-on-version>
export XPKG_FILENAME=<addon-f7091386b4c0.xpkg>

up xpkg push xpkg.upbound.io/$UPBOUND_ACCOUNT/$ADD_ON_NAME:$ADD_ON_VERSION -f $XPKG_FILENAME
```

<!-- vale Google.Headings = NO --> 
<!-- vale Microsoft.Headings = NO --> 
### Deploy an _AddOn_ package
<!-- vale Google.Headings = YES --> 
<!-- vale Microsoft.Headings = YES --> 

:::important
_AddOns_ are only installable on control planes running Upbound Crossplane `v1.20.0` or later.
:::

Set your kubecontext to the desired control plane in Upbound. Change the package path to the OCI registry you pushed it to. Then, deploy the _AddOn_ directly:

```ini
export ADD_ON_NAME=<add-on-name>
export ADD_ON_VERSION=<add-on-version>

cat <<EOF | kubectl apply -f -
apiVersion: pkg.upbound.io/v1beta1
kind: AddOn
metadata:
  name: $ADD_ON_NAME
spec:
  package: xpkg.upbound.io/$UPBOUND_ACCOUNT/$ADD_ON_NAME:$ADD_ON_VERSION
EOF
```

## Example usage

The example below demonstrates step-by-step how to package and deploy [Argo CD][argo-cd] to a control plane in Upbound.

<!-- vale Google.Headings = NO -->
### Prepare to package ArgoCD
<!-- vale Google.Headings = YES -->

Start by making a working directory to assemble the necessary parts:

```ini
mkdir argo-package
cd argo-package
```

Inside the working directory, pull the Helm chart

```ini
export CHART_REPOSITORY=https://argoproj.github.io/argo-helm
export CHART_NAME=argo-cd
export CHART_VERSION=7.8.8

helm pull $CHART_NAME --repo $CHART_REPOSITORY --version $CHART_VERSION
```

Move the Helm chart into it's own folder:

```ini
mkdir helm
mv $CHART_NAME-$CHART_VERSION.tgz helm/chart.tgz
```

Unpack the CRDs from the Helm chart into their own directory:

```ini
export RELEASE_NAME=argo-cd
export RELEASE_NAMESPACE=argo-system

mkdir crds
helm template $RELEASE_NAME helm/chart.tgz -n $RELEASE_NAMESPACE --include-crds | \
  yq e 'select(.kind == "CustomResourceDefinition")' - | \
  yq -s '("crds/" + .metadata.name + ".yaml")' -
```

Create a `crossplane.yaml` with the AddOn metadata:

```yaml
cat <<EOF > crossplane.yaml
apiVersion: meta.pkg.upbound.io/v1beta1
kind: AddOn
metadata:
  annotations:
    friendly-name.meta.crossplane.io: Add-On ArgoCD
    meta.crossplane.io/description: |
      The ArgoCD Add-On enables continuous delivery and declarative configuration
      management for Kubernetes applications using GitOps principles.
    meta.crossplane.io/license: Apache-2.0
    meta.crossplane.io/maintainer: Upbound Maintainers <info@upbound.io>
    meta.crossplane.io/readme: |
      ArgoCD is a declarative GitOps continuous delivery tool for Kubernetes that
      follows the GitOps methodology to manage infrastructure and application
      configurations.
      meta.crossplane.io/source: https://github.com/argoproj/argo-cd
  name: argocd
spec:
  packagingType: Helm
  helm:
    releaseName: argo-cd
    releaseNamespace: argo-system
    # values:
    #   foo: bar
EOF
```

Your Add-On's file structure should look like this:

```ini
.
├── crds
│   ├── applications.argoproj.io.yaml
│   ├── applicationsets.argoproj.io.yaml
│   └── appprojects.argoproj.io.yaml
├── crossplane.yaml
└── helm
    └── chart.tgz
```

### Package and push addon-argocd

At the root of your Add-On's working directory, build the contents into an xpkg:

```ini
up xpkg build
```

This causes an xpkg to get saved to your current directory with a name like `argocd-f7091386b4c0.xpkg`.

Push the package to your desired OCI registry:

```ini
export UPBOUND_ACCOUNT=<org-account-name>
export ADD_ON_NAME=addon-argocd
export ADD_ON_VERSION=v7.8.8
export XPKG_FILENAME=<addon-f7091386b4c0.xpkg>

up xpkg push --create xpkg.upbound.io/$UPBOUND_ACCOUNT/$ADD_ON_NAME:$ADD_ON_VERSION -f $XPKG_FILENAME
```

### Deploy addon-argocd to a control plane

Set your kubecontext to the desired control plane in Upbound. Change the package path to the OCI registry you pushed it to. Then, deploy the _AddOn_ directly:

```ini
cat <<EOF | kubectl apply -f -
apiVersion: pkg.upbound.io/v1beta1
kind: AddOn
metadata:
  name: addon-argocd
spec:
  package: xpkg.upbound.io/$UPBOUND_ACCOUNT/addon-argocd:v7.8.8
EOF
```

Wait for the package to become ready:

```ini
watch kubectl get addons.pkg
```

Check the pods in the `argo-system` namespace:

```ini
kubectl -n argo-system get pods
```

You can now use the _CustomResource_ types defined by Argo CD in your control plane.

<!-- vale off -->

## Frequently asked questions
<details>

<summary>How can I package my software as an AddOn?</summary>

Currently, we support Helm charts as the underlying package format for _AddOns_. As long as you have a Helm chart, you can package it as an _AddOn_.

If you don't have a Helm chart, you can't deploy the software. We only support Helm charts as the underlying package format for _AddOns_. We may extend this to support other packaging formats like Kustomize in the future.

</details>

<details>

<summary>Can I package Crossplane XRDs/Compositions as a Helm chart to deploy as an AddOn?</summary>

This is not recommended. For packaging Crossplane XRDs/ and Compositions, we recommend using the `Configuration` package format. A helm chart only with Crossplane XRDs/Compositions does not qualify as an _AddOn_.

</details>

<details>

<summary>How can I override the Helm values when deploying an AddOn?</summary>

Overriding the Helm values is possible at two levels:

- During packaging time, in the package manifest file.
- At runtime, using a `AddOnRuntimeConfig` resource (similar to Crossplane `DeploymentRuntimeConfig`).

</details>

<details>

<summary>How can I configure the helm release name and namespace for the AddOn?</summary>

Right now, it is not possible to configure this at runtime. The package author configures release name and namespace during packaging, so it is hardcoded inside the package. Unlike a regular application that is deployed by a Helm chart, _AddOns_ can only be deployed once in a given control plane, so, we hope it should be ok to rely on predefined release names and namespaces. We may consider exposing these in `AddOnRuntimeConfig` later, but, we would like to keep it opinionated unless there are strong reasons to do so.

</details>

<details>

<summary>Do I need a specific Crossplane version to run AddOns?</summary>

`AddOn` API is available in Upbound Crossplane (UXP) v2 and later.

</details>

<details>

<summary>Can I deploy AddOns outside of Upbound Crossplane?</summary>

No, _AddOns_ are a proprietary package format and are only available for Upbound Crossplane (UXP) v2 and later. They are not compatible with upstream Crossplane.

</details>

<!-- vale on -->

[contact-us]: https://www.upbound.io/usage/support/contact
[up-cli]: /reference/cli-reference
[argo-cd]: https://argoproj.github.io/cd/
[intelligent-compositions]: /manuals/uxp/concepts/composition/intelligent-compositions
[intelligent-operations]: /manuals/uxp/concepts/operations/intelligent-operations
