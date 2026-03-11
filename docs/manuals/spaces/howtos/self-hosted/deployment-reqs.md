---
title: Deployment Requirements
sidebar_position: 2
description: Deploy a Space in your production environment.
---

You need a Kubernetes cluster as the hosting environment to run Spaces. Upbound
validates the Spaces software runs on [AWS EKS][aws-eks], [Google Cloud
GKE][google-cloud-gke], and [Microsoft AKS][microsoft-aks]. Upbound recommends
dedicating the Kubernetes cluster for the express purpose of running Spaces as
its sole workload.

## Kubernetes version compatibility

Each Spaces release is tested against specific Kubernetes versions:

| Spaces Version | Tested Kubernetes Versions |
|----------------|----------------------------|
| 1.15           | 1.32, 1.33, 1.34, 1.35     |
| 1.14           | 1.31, 1.32, 1.33, 1.34     |
| 1.13           | 1.30, 1.31, 1.32, 1.33     |

## Deployment requirements

Spaces requires three things:

1. A Kubernetes cluster.
2. You've configured the Kubernetes cluster with the required prerequisites.
3. You must have an [Upbound account][upbound-account]. Spaces is a feature only available for paying customers in the **Business Critical** tier of Upbound.

This guide helps you think through all steps needed to deploy Spaces for production workloads.

## Sizing a Space

In a Space, the control planes you create get scheduled as pods across the
cluster's node pools. The hyper scale cloud providers each offer managed
Kubernetes services that can support hundreds of nodes in their node pools. That
means the number of control planes you can run in a single Space is on the order
hundreds--if not more.

Rightsizing a Space for a production deployment depends on several factors:

1. The number of control planes you plan to run in the Space.
2. The number of managed resources you plan each control plane to reconcile.
3. The Crossplane providers you plan to install in each control plane.

### Memory considerations

#### Control plane empty state memory usage

An idle, empty control plane consumes about 640 MB of memory. This encompasses
the set of pods that constitute a control plane and which get deployed for each
control plane instance.

#### Managed resource memory usage

In Upbound's testing, memory usage isn't influenced a lot by the number of managed resources under management. Memory usage only goes up slightly by 100 MB when going from 100 to 1000 resource instances under management of a control plane. Hence, for simplicity, you don't need to account for an increase in memory usage on this axis of the control plane.

#### Provider memory usage
<!-- vale gitlab.SentenceLength = NO -->
When you install a Crossplane provider on a control plane, memory gets consumed
according to the number of custom resources it defines. Upbound [Official Provider families][official-provider-families] provide higher fidelity control
to platform teams to install providers for only the resources they need,
reducing the bloat of needlessly installing unused custom resources. Still, you
must factor provider memory usage into your calculations to ensure you've
rightsized the memory available in your Spaces cluster.
<!-- vale gitlab.SentenceLength = YES -->

:::important
Be careful not to conflate `managed resource` with `custom resource definition`.
The former is an "instance" of an external resource in Crossplane, while the
latter defines the API schema of that resource.
:::

It's estimated that each custom resource definition consumes ~3 MB of memory.
The calculation is:

```bash
number_of_managed_resources_defined_in_provider x 3 MB = memory_required
```

For example, if you plan to use [provider-aws-ec2][provider-aws-ec2], [provider-aws-s3][provider-aws-s3], and [provider-aws-iam][provider-aws-iam], the resulting calculation is:

```bash
provider-aws-ec2: 98 x 3 MB = 294 MB
provider-aws-s3: 23 x 3 MB = 69 MB
provider-aws-iam 22 x 3 MB = 66 MB
---
total memory: 429 MB
```

In this scenario, you should budget ~430 MB of memory for provider usage on this control plane.

:::tip
Do this calculation for each provider you plan to install on your control plane.
Then do this calculation for each control plane you plan to run in your Space.
:::


#### Total memory usage

Add the memory usage from the previous sections. Given the preceding examples,
they result in a recommendation to budget ~1 GB memory for each control plane
you plan to run in the Space.

:::important

The 1 GB recommendation is an example.
You should input your own provider requirements to arrive at a final number for
your own deployment.

:::

### CPU considerations

#### Managed resource CPU usage

The number of managed resources under management by a control plane is the largest contributing factor for CPU usage in a Space. CPU usage scales linearly according to the number of managed resources under management by your control plane. In Upbound's testing, CPU usage requirements _does_ vary from provider to provider. Using the Upbound Official Provider families as a baseline:


| Provider | MR create operation (CPU core seconds) | MR update or reconciliation operation (CPU core seconds) |
| ---- | ---- | ---- |
| provider-family-aws | 10 | 2 to 3 |
| provider-family-gcp | 7 | 1.5 |
| provider-family-azure | 7 to 10 | 1.5 to 3 |


When resources are in a non-ready state, Crossplane providers reconcile often (as fast as every 15 seconds). Once a resource reaches `READY`, each Crossplane provider defaults to a 10 minute poll interval. Given this, a 16-core machine has `16x10x60 =  9600` CPU core seconds available. Interpreting this table:

- A single control plane that needs to create 100 AWS MRs concurrently would consume 1000 CPU core seconds, or about 1.5 cores.
- A single control plane that continuously reconciles 100 AWS MRs once they've reached a `READY` state would consume 300 CPU core seconds, or a little under half a core.

Since `provider-family-aws` has the highest recorded numbers for CPU time required, you can use that as an upper limit in your calculations.

Using these calculations and extrapolating values, given a 16 core machine, it's recommended you don't exceed a single control plane managing 1000 MRs. Suppose you plan to run 10 control planes, each managing 1000 MRs. You want to make sure your node pool has capacity for 160 cores. If you are using a machine type that has 16 cores per machine, that would mean having a node pool of size 10. If you are using a machine type that has 32 cores per machine, that would mean having a node pool of size 5.

#### Cloud API latency

Oftentimes, you are using Crossplane providers to talk to external cloud APIs. Those external cloud APIs often have global API rate limits (examples: [Azure limits][azure-limits], [AWS EC2 limits][aws-ec2-limits]).

For Crossplane providers built on [Upjet][upjet] (such as Upbound Official Provider families), these providers use Terraform under the covers. They expose some knobs (such as `--max-reconcile-rate`) you can use to tweak reconciliation rates.

### Resource buffers

The guidance in the preceding sections explains how to calculate CPU and memory usage requirements for:

- a set of control planes in a Space
- tuned to the number of providers you plan to use
- according to the number of managed resource instances you plan to have managed by your control planes

Upbound recommends budgeting an extra buffer of 20% to your resource capacity calculations. The numbers shared in the preceding sections don't account for peaks or surges since they're based off average measurements. Upbound recommends budgeting this buffer to account for these things.

## Deploying more than one Space

You are welcome to deploy more than one Space. You just need to make sure you have a 1:1 mapping of Space to Kubernetes clusters. Spaces are by their nature constrained to a single Kubernetes Cluster, which are regional entities. If you want to offer control planes in multiple cloud environments or multiple public clouds entirely, these are justifications for deploying >1 Spaces.

## Cert-manager

A Spaces deployment uses the [Certificate Custom Resource] from cert-manager to
provision certificates within the Space. This establishes a nice API boundary
between what your platform may need and the Certificate requirements of a
Space.

<!-- vale gitlab.SentenceLength = NO -->
In the event you would like more control over the issuing Certificate Authority
for your deployment or the deployment of cert-manager itself, this guide is for
you.
<!-- vale gitlab.SentenceLength = Yes -->

### Deploying

An Upbound Space deployment doesn't have any special requirements for the
cert-manager deployment itself. The only expectation is that cert-manager and
the corresponding Custom Resources exist in the cluster.

You should be free to install cert-manager in the cluster in any way that makes
sense for your organization. You can find some [installation ideas] in the
cert-manager docs.

### Issuers
<!-- vale write-good.Passive = NO -->
A default Upbound Space install includes a [ClusterIssuer]. This `ClusterIssuer`
is a `selfSigned` issuer that other certificates are minted from. You have a
couple of options available to you for changing the default deployment of the
Issuer:
1. Changing the issuer name.
2. Providing your own ClusterIssuer.
<!-- vale write-good.Passive = YES -->

#### Changing the issuer name
<!-- vale write-good.Passive = NO -->
The `ClusterIssuer` name is controlled by the `certificates.space.clusterIssuer`
Helm property. You can adjust this during installation by providing the
following parameter (assuming your new name is 'SpaceClusterIssuer'):
```shell
--set "certificates.space.clusterIssuer=SpaceClusterIssuer"
```
<!-- vale write-good.Passive = YES -->

<!-- vale Google.Headings = NO -->
#### Providing your own ClusterIssuer
<!-- vale Google.Headings = YES -->
To provide your own `ClusterIssuer`, you need to first setup your own
`ClusterIssuer` in the cluster. The cert-manager docs have a variety of options
for providing your own. See the [Issuer Configuration] docs for more details.

Once you have your own `ClusterIssuer` set up in the cluster, you need to turn
off the deployment of the `ClusterIssuer` included in the Spaces deployment.
To do that, provide the following parameter during installation:
```shell
--set "certificates.provision=false"
```

###### Considerations
If your `ClusterIssuer` has a name that's different from the default name that
the Spaces installation expects ('spaces-selfsigned'), you need to also specify
your `ClusterIssuer` name during install using:
```shell
--set "certificates.space.clusterIssuer=<your ClusterIssuer name>"
```

## Ingress

To route requests from an external client (kubectl, ArgoCD, etc) to a
control plane, a Spaces deployment includes a default [Ingress] manifest. In
order to ease getting started scenarios, the current `Ingress` includes
configurations (properties and annotations) that assume that you installed the
commonly used [ingress-nginx ingress controller] in the cluster. This section
walks you through using a different `Ingress`, if that's something that your
organization needs.

### Default manifest

An example of what the current `Ingress` manifest included in a Spaces install
is below:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mxe-router-ingress
  namespace: upbound-system
  annotations:
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-request-buffering: "off"
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
    nginx.ingress.kubernetes.io/proxy-http-version: "1.1"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/proxy-ssl-verify: "on"
    nginx.ingress.kubernetes.io/proxy-ssl-secret: "upbound-system/mxp-hostcluster-certs"
    nginx.ingress.kubernetes.io/proxy-ssl-name: spaces-router
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Request-Id: $req_id";
      more_set_headers "Request-Id: $req_id";
      more_set_headers "Audit-Id: $req_id";
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - {{ .Values.ingress.host }}
      secretName: mxe-router-tls
  rules:
    - host: {{ .Values.ingress.host }}
      http:
        paths:
          - path: "/v1/controlPlanes"
            pathType: Prefix
            backend:
              service:
                name: spaces-router
                port:
                  name: http
```

The notable pieces are:
1. Namespace

<!-- vale write-good.Passive = NO -->
<!-- vale Microsoft.Wordiness = NO -->
This property represents the namespace that the spaces-router is deployed to.
In most cases this is `upbound-system`.
<!-- vale write-good.Passive = YES -->
<!-- vale Microsoft.Wordiness = YES -->

2. proxy-ssl-* annotations

The spaces-router pod terminates TLS using certificates located in the
mxp-hostcluster-certs `Secret` located in the `upbound-system` `Namespace`.

3. proxy-* annotations
<!-- vale write-good.Passive = NO -->
Requests coming into the ingress-controller can be variable depending on what
the client is requesting. For example, `kubectl get crds` has different
requirements for the connection compared to a 'watch', for example
`kubectl get pods -w`. The ingress-controller is configured to be able to
account for either scenario.
<!-- vale write-good.Passive = YES -->

4. configuration-snippets

These commands add headers to the incoming requests that help with telemetry
and diagnosing problems within the system.

5. Rules
<!-- vale write-good.Passive = NO -->
Requests coming into the control planes use a `/v1/controlPlanes` prefix and
need to be routed to the spaces-router.
<!-- vale write-good.Passive = YES -->

### Using a different ingress manifest

Operators can choose to use an `Ingress` manifest and ingress controller that
makes the most sense for their organization. If they want to turn off deploying
the default `Ingress` manifest, they can do so during installation by providing
the following parameter during installation:
```shell
--set ".Values.ingress.provision=false"
```

#### Considerations
<!-- vale Google.Will = NO -->
<!-- vale gitlab.FutureTense = NO -->
<!-- vale Microsoft.Avoid = NO -->
<!-- vale Microsoft.Wordiness = NO -->
<!-- vale write-good.Passive = NO -->
Operators will need to take into account the following considerations when
disabling the default `Ingress` deployment.

1. Ensure the custom `Ingress` manifest is placed in the same namespace as the
`spaces-router` pod.
2. Ensure that the ingress is configured to use a `spaces-router` as a secure
backend and that the secret used is the mxp-hostcluster-certs secret.
3. Ensure that the ingress is configured to handle long-lived connections.
4. Ensure that the routing rule sends requests prefixed with
`/v1/controlPlanes` to the `spaces-router` using the `http` port.
<!-- vale Google.Will = YES -->
<!-- vale gitlab.FutureTense = YES -->
<!-- vale Microsoft.Avoid = YES -->
<!-- vale Microsoft.Wordiness = YES -->
<!-- vale write-good.Passive = YES -->

[cert-manager]: https://cert-manager.io/
[Certificate Custom Resource]: https://cert-manager.io/docs/usage/certificate/
[ClusterIssuer]: https://cert-manager.io/docs/concepts/issuer/
[ingress-nginx ingress controller]: https://kubernetes.github.io/ingress-nginx/deploy/
[installation ideas]: https://cert-manager.io/docs/installation/
[Ingress]: https://kubernetes.io/docs/concepts/services-networking/ingress/
[Issuer Configuration]: https://cert-manager.io/docs/configuration/
[official-provider-families]: /manuals/packages/providers/provider-families
[aws-eks]: https://aws.amazon.com/eks/
[google-cloud-gke]: https://cloud.google.com/kubernetes-engine
[microsoft-aks]: https://azure.microsoft.com/en-us/products/kubernetes-service
[upbound-account]: https://www.upbound.io/register/?utm_source=docs&utm_medium=cta&utm_campaign=docs_spaces
[provider-aws-ec2]: https://marketplace.upbound.io/providers/upbound/provider-aws-ec2
[provider-aws-s3]: https://marketplace.upbound.io/providers/upbound/provider-aws-s3
[provider-aws-iam]: https://marketplace.upbound.io/providers/upbound/provider-aws-iam
[azure-limits]: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/request-limits-and-throttling
[aws-ec2-limits]: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/throttling.html#throttling-limits-rate-based
[upjet]: https://github.com/upbound/upjet
