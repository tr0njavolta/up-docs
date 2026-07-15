---
title: Function Scale-to-Zero
description: "Enable the Knative function runtime to autoscale functions to zero"
plan: "standard"
---

<Standard />

This guide walks through how to enable the Knative function runtime in Upbound
Crossplane (UXP). The Knative function runtime runs functions using [Knative]
services instead of standard Kubernetes deployments, allowing functions to 
scale to zero when not called. This helps reduce resource
consumption from functions in a Kubernetes cluster running UXP.

## Prerequisites

Before you enable the Knative function runtime, make sure you have:

* A running UXP control plane
* A valid Standard or Development license applied to your control plane

This guide also requires:

* [cert-manager]
* [Knative]

## Install required dependencies

:::tip
If you already have Knative and cert-manager installed, skip to [creating and
configuring the cert-manager `Issuer`][issuer], which is required for this
feature.
:::

### Install cert-manager

Use Helm to install cert-manager:

```bash
helm install \
  cert-manager oci://quay.io/jetstack/charts/cert-manager \
  --version v1.18.2 \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

### Install Knative Serving

:::tip

Knative supports many installation options. This guide provides sensible
defaults, but if you wish to customize your Knative installation you can follow
the [Knative installation documentation]. In particular, if you already use
Istio in your cluster, you may wish to use it for Knative ingress instead of the
Kourier ingress gateway documented here.

:::

Install the Knative Serving components using their manifests:

```bash
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.19.7/serving-crds.yaml
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.19.7/serving-core.yaml
```

Install the [Kourier] ingress controller:

```bash
kubectl apply -f https://github.com/knative-extensions/net-kourier/releases/download/knative-v1.19.6/kourier.yaml
```

Update the Knative configuration so it uses Kourier for ingress and uses TLS to
secure endpoints within the cluster:

```bash
kubectl patch configmap/config-network \
  --namespace knative-serving \
  --type merge \
  --patch '{"data":{"ingress-class":"kourier.ingress.networking.knative.dev","cluster-local-domain-tls":"Enabled"}}'

```
## Create a cert-manager `Issuer` {#cert-issuer}

Create a cert-manager `Issuer` using the Crossplane CA certificate. Knative uses
this to generate certificates for function services that Crossplane calls:

```bash
kubectl apply -f - --server-side <<EOF
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: crossplane-issuer
  namespace: crossplane-system
spec:
  ca:
    secretName: crossplane-root-ca
EOF
```


Configure Knative to use the cert-manager `Issuer` you created in the previous
section:

```bash
kubectl apply -f - --server-side <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/name: knative-serving
    app.kubernetes.io/version: 1.17.0
    networking.knative.dev/certificate-provider: cert-manager
  name: config-certmanager
  namespace: knative-serving
data:
  clusterLocalIssuerRef: |
    kind: Issuer
    name: crossplane-issuer
    namespace: crossplane-system
  issuerRef: |
    kind: Issuer
    name: crossplane-issuer
    namespace: crossplane-system
  systemInternalIssuerRef: |
    kind: Issuer
    name: crossplane-issuer
    namespace: crossplane-system
EOF
```

Restart the Knative controllers to apply the configuration: 
```bash
kubectl -n knative-serving rollout restart deploy/activator
kubectl -n knative-serving rollout restart deploy/controller
```

## Enable the Knative function runtime

<Tabs>
<TabItem value="Helm" label="Helm">

1. Add the `upbound-stable` chart repository:
```bash
helm repo add upbound-stable https://charts.upbound.io/stable && helm repo update
```
2. Install Upbound Crossplane:
```bash
helm install crossplane \
  --namespace crossplane-system \
  --create-namespace \
  upbound-stable/crossplane \
  --devel \
  --set "upbound.manager.args[0]=--enable-knative-runtime"
```

:::note
Helm requires the use of `--devel` flag for versions with suffixes, like
`v2.0.0-up.1`. The Helm repository Upbound uses is the stable repository, so use
of that flag is only a workaround. You will always get the latest stable version
of Upbound Crossplane.
:::

</TabItem>

<TabItem value="up CLI" label="up CLI">

Make sure you have the up CLI installed and that your current kubeconfig context
points to the desired Kubernetes cluster, then run the following command:

```bash
up uxp upgrade --set "upbound.manager.args[0]=--enable-knative-runtime"
```

</TabItem>
</Tabs>

## Configure the Knative function runtime

Runtime configurations control how UXP deploys and operates Functions in your
cluster. The `UpboundRuntimeConfig` resource controls UXP-specific features such
as the Knative function runtime.

To configure UXP to run all functions with the Knative runtime, update the
default `UpboundRuntimeConfig` to enable the Knative runtime:

```bash
kubectl patch upboundruntimeconfig default --type=merge -p='{"spec":{"capabilities":["FunctionKnativeRuntime"]}}'
```

## Test scale-to-zero

The Knative function runtime automatically scales down functions that aren't
being actively used. This could happen because no compositions are using a given
function, or because nothing has changed to cause reconciliation of a composite
resource.

To see scale-to-zero in action, install an example Configuration that depends on
some Functions:

```bash
up controlplane configuration install xpkg.upbound.io/upbound/configuration-app:v0.12.1
```

You should see the packages become ready:

```bash
$ kubectl get pkg
NAME                                                        INSTALLED   HEALTHY   PACKAGE                                             AGE
configuration.pkg.crossplane.io/upbound-configuration-app   True        True      xpkg.upbound.io/upbound/configuration-app:v0.12.1   64s

NAME                                                                INSTALLED   HEALTHY   PACKAGE                                                                                                                  AGE
function.pkg.crossplane.io/crossplane-contrib-function-auto-ready   True        True      xpkg.upbound.io/crossplane-contrib/function-auto-ready:v0.5.1                                                            60s
function.pkg.crossplane.io/upbound-configuration-appxapp            True        True      xpkg.upbound.io/upbound/configuration-app_xapp@sha256:3975a44efa4db7644284a10a0f832f7a76e7f044313fd74e094f4f6339d8247e   58s

NAME                                               INSTALLED   HEALTHY   PACKAGE                                         AGE
provider.pkg.crossplane.io/upbound-provider-helm   True        True      xpkg.upbound.io/upbound/provider-helm:v0.21.1   63s
```

Because the Knative function runtime is active, each Function has an associated
Knative Service instead of a standard Kubernetes Deployment:

```bash
$ kubectl -n crossplane-system get kservice
NAME                                     URL                                                                                  LATESTCREATED                                         LATESTREADY                                           READY   REASON
crossplane-contrib-function-auto-ready   https://crossplane-contrib-function-auto-ready.crossplane-system.svc.cluster.local   crossplane-contrib-function-auto-ready-23e6fdeb2c05   crossplane-contrib-function-auto-ready-23e6fdeb2c05   True
upbound-configuration-appxapp            https://upbound-configuration-appxapp.crossplane-system.svc.cluster.local            upbound-configuration-appxapp-3975a44efa4d            upbound-configuration-appxapp-3975a44efa4d            True
```

When you first install the configuration, Knative scales up the Functions, so
each Function has a Pod:

```bash
$ kubectl -n crossplane-system get pod -l serving.knative.dev/service
NAME                                                              READY   STATUS    RESTARTS   AGE
crossplane-contrib-function-auto-ready-23e6fdeb2c05-deployjcgth   2/2     Running   0          57s
upbound-configuration-appxapp-3975a44efa4d-deployment-66c5cdgzf   2/2     Running   0          56s
```

Since there are no XRs in the cluster, nothing calls the functions and
Knative scales them down to zero:

```bash
$ kubectl -n crossplane-system get pod -l serving.knative.dev/service
No resources found in crossplane-system namespace.
```

Create an XR to trigger the composition pipeline to call the function:

```bash
kubectl apply -f - <<EOF
apiVersion: platform.upbound.io/v1alpha1
kind: XApp
metadata:
  name: test-app
  namespace: default
spec:
  parameters:
    helm:
      wait: false
    providerConfigName: uptest
    passwordSecretRef:
      namespace: default
      name: configuration-app-mariadb
  writeConnectionSecretToRef:
    name: configuration-app
    namespace: default
EOF
```

Within seconds, Pods start for the Functions:

```bash
$ kubectl -n crossplane-system get pod -l serving.knative.dev/service
NAME                                                              READY   STATUS    RESTARTS   AGE
crossplane-contrib-function-auto-ready-23e6fdeb2c05-deploylzwkc   2/2     Running   0          5s
upbound-configuration-appxapp-3975a44efa4d-deployment-66c5tpfk2   2/2     Running   0          7s
```

## Disable the Knative function runtime

To disable the Knative function runtime, remove the `FunctionKnativeRuntime`
capability from the default `UpboundRuntimeConfig`:

```bash
kubectl patch upboundruntimeconfig default --type=merge -p='{"spec":{"capabilities":[]}}'
```

The runtime controller deletes the Knative services for the functions and creates
Deployments instead:

```bash
$ kubectl -n crossplane-system get kservice
No resources found in crossplane-system namespace.

$ kubectl -n crossplane-system get deployment
NAME                                                  READY   UP-TO-DATE   AVAILABLE   AGE
...
crossplane-contrib-function-auto-ready-23e6fdeb2c05   1/1     1            1           5m11s
upbound-configuration-appxapp-3975a44efa4d            1/1     1            1           5m11s
...
```

[Knative]: https://knative.dev
[issuer]: #cert-issuer
[cert-manager]: https://cert-manager.io
[Kourier]: https://github.com/knative-extensions/net-kourier
[Knative installation documentation]: https://knative.dev/docs/install/
