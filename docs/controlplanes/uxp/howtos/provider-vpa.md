---
title: Vertical Pod Autoscaling
description: "Enable VPA to manage your provider pod resources"
plan: "standard"
---

<Standard />

<!-- vale gitlab.SentenceLength = NO -->
This guide explains how to enable Provider Vertical Pod Autoscaling (VPA)
for your Upbound Crossplane (UXP) Providers. Provider Autoscaling uses the
Kubernetes Vertical Pod Autoscaler to ensure stable and efficient operation by
dynamically sizing CPU and memory for provider pods running in a Kubernetes
cluster.
<!-- vale gitlab.SentenceLength = YES -->

Enable this feature if you observe provider pod resources (CPU and memory)
hitting large performance spikes or maxing out.

## Prerequisites

Before you enable Provider Autoscaling, make sure you have:

* A Kubernetes v1.28+ cluster running
* A running UXP control plane
* A valid Standard or Development license applied to your control plane

<!-- vale Google.Will = NO -->
<!-- vale gitlab.FutureTense = NO -->
As part of this guide, you will also install the following prerequisites:
<!-- vale Google.Will = YES -->
<!-- vale gitlab.FutureTense = YES -->

* [Metrics server][metrics] or [Prometheus Adapter for Kubernetes Metrics APIs][prometheus] installed
* [Vertical Pod Autoscaler][vpa] v1.4+ on your Kubernetes cluster

## Install required dependencies

If you don't have the Metrics Server or Kubernetes Vertical Pod Autoscaler,
instal them:

### Install `metrics-server`

Add the Metrics Server Helm repository:

```bash
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm repo update
    ```

Install the Metrics server:

```bash
helm upgrade --install --set "args={--kubelet-insecure-tls}" metrics-server metrics-server/metrics-server --namespace kube-system --version 3.12.2
```

### Install vertical pod autoscaler

Follow the [VPA installation instructions][install] instructions before
continuing.

## Enable provider autoscaling

Ensure you have the `upbound-stable` Helm repository configured:

```bash
helm repo add upbound-stable https://charts.upbound.io/stable
helm repo update
```

Enable the Provider Autoscaling feature flag in UXP:

```bash
helm upgrade --install crossplane --namespace crossplane-system --create-namespace upbound-stable/crossplane --devel --set "upbound.manager.args[0]=--enable-provider-vpa"
```

## Configure provider with autoscaling

Runtime configurations control how UXP deploys and operates Providers in your
cluster. The two runtime types associated with Provider VPA are:


* `DeploymentRuntimeConfig`: The standard Crossplane configuration that defines
  basic deployment settings for Providers
* `UpboundRuntimeConfig`: A UXP-specific
  extension that provides capabilities like Provider VPA, extending
  beyond what the standard configuration offers

The `DeploymentRuntimeConfig` establishes the
basic Provider deployment, while the `UpboundRuntimeConfig` adds UXP-specific
features. A `DeploymentRuntimeConfig` can reference an `UpboundRuntimeConfig` by
including the annotation `pkg.upbound.io/runtime-config`.

To configure a provider with autoscaling, create a
`DeploymentRuntimeConfig`:

```yaml
cat <<EOF | kubectl apply -f -
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: upbound-provider-aws-ec2
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v1.23.1
  runtimeConfigRef:
    apiVersion: pkg.crossplane.io/v1beta1
    kind: DeploymentRuntimeConfig
    name: config-aws

---

apiVersion: pkg.crossplane.io/v1beta1
kind: DeploymentRuntimeConfig
metadata:
  name: config-aws
  annotations:
    pkg.upbound.io/runtime-config: config-aws
spec: {}
EOF
```

Create an `UpboundRuntimeConfig` with VPA settings:

The `UpboundRuntimeConfig` extends the upstream `DeploymentRuntimeConfig` with
UXP-specific configuration options and defines the minimum and maximum system
resource values.

```yaml
cat <<EOF | kubectl apply -f -
apiVersion: pkg.upbound.io/v1beta1
kind: UpboundRuntimeConfig
metadata:
  name: config-aws
spec:
  capabilities:
  - ProviderVPA
  verticalPodAutoscalerTemplate:
    spec:
      targetRef:
        kind: Deployment
        apiVersion: "apps/v1"
        name: provider
      resourcePolicy:
        containerPolicies:
          - containerName: '*'
            minAllowed:
              cpu: 500m
              memory: 100Mi
            maxAllowed:
              cpu: 2
              memory: 2000Mi
            controlledResources: ["cpu", "memory"]
EOF
```


To verify the VPA resource, use `kubectl` to check the `vpa` component. 

```bash
kubectl get vpa -n crossplane-system

```
You should see `MODE: Auto` in the output:

```
NAME                                    MODE   CPU    MEM         PROVIDED   AGE
upbound-provider-aws-ec2-8cc80a57d291   Auto   500m   297164212   True       20m
```

## Disable provider autoscaling

If you need to disable Provider Autoscaling, remove the ProviderVPA capability
from the `UpboundRuntimeConfig`:

```bash
kubectl patch upboundruntimeconfig config-aws --type=merge -p='{"spec":{"capabilities":[]}}'
```
[install]:https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/installation.md#prerequisites 
[metrics]: https://github.com/kubernetes-sigs/metrics-server
[prometheus]: https://github.com/kubernetes-sigs/prometheus-adapter
[vpa]: https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler
