---
title: API Connector
weight: 90
description: Connect Kubernetes clusters to remote Crossplane control planes for resource synchronization
aliases:
    - /api-connector
    - /concepts/api-connector
---

:::warning
API Connector is currently in **Preview**. The feature is under active
development and subject to breaking changes. Use for testing and evaluation
purposes only.
:::

API Connector enables seamless integration between Kubernetes application
clusters consuming APIs and remote Crossplane control planes providing and
reconciling APIs.


The API Connector decouples where Crossplane runs from where teams consume its
APIs. For example, Crossplane may run in an Upbound control plane while an
existing Kubernetes cluster consumes its APIs.

The Control Plane Connector offers coarse-grained connectivity between app
clusters and a control plane. The API Connector lets you choose
which APIs to expose across multiple clusters.

## Architecture overview

![API Connector Architecture](/img/api-connector.png)

API Connector uses a **provider-consumer** model:

- **Provider control plane**: The Upbound control plane that provides APIs and manages infrastructure.
- **Consumer cluster**: Any Kubernetes cluster where its users wants to use APIs provided by the provider control plane, without having to run Crossplane. API connector gets installed in the consumer cluster, and bidirectionally syncs API objects to the provider.

### Key components

**Custom Resource Definitions (CRDs)**:
<!-- vale Upbound.Spelling = NO -->
<!-- ignore bindable -->
- `ClusterConnection`: Establishes a connection from the consumer to the provider cluster. Pulls bindable CRD APIs from the provider into the consumer cluster for use.
<!-- vale Upbound.Spelling = YES -->
- `ClusterAPIBinding`: Instructs API connector to sync all API objects cluster-wide with a given API group to a given provider cluster.
- `APIBinding`: Namespaced version of `ClusterAPIBinding`. Instructs API connector to sync API objects within a given namespace and with a given API group to a given provider cluster.


## Prerequisites

Before using API Connector, ensure:

1. **Consumer cluster** has network access to the provider control plane
1. You have an license to use API connector. If you are unsure, [contact Upbound][contact] or your sales representative.

This guide walks through how to automate connecting your cluster to an Upbound
control plane. You can also manually configure the API Connector.

## Publishing APIs in the provider cluster


<!-- vale Upbound.Spelling = NO -->
<!-- ignore bindable -->
First, log in to your provider control plane, and choose which CRD APIs you want
to make accessible to the consumer cluster's. API connector only syncs
these "bindable" CRDs.
<!-- vale Upbound.Spelling = YES -->


<Tabs>
<TabItem value="upbound-cloud" label="Upbound Cloud">

Use the `up` CLI to login:

```bash
up login
```

Connect to your control plane:

```bash
up ctx <organization-name/space-name/group/provider-control-plane-name>
```

Check what CRDs are available:

```bash
kubectl get crds
```

<!-- vale Upbound.Spelling = NO -->
Label all CRDs you want to publish with the bindable label:

<!-- vale Upbound.Spelling = YES --> 
```bash
kubectl label crd <crd-name> 'connect.upbound.io/bindable'='true' --overwrite
```

</TabItem>
<TabItem value="manual" label="Manual">

Change context to the provider cluster:
```bash
kubectl config set-context <provider-cluster-context>
```

Check what CRDs are available:
```bash
kubectl get crds
```
 
<!-- vale Upbound.Spelling = NO -->
Label all CRDs you want to publish with the bindable label
<!-- vale Upbound.Spelling = YES -->
```bash
kubectl label crd <CRD API name> 'connect.upbound.io/bindable'='true' --overwrite
```
</TabItem>
</Tabs>

## Installation

<Tabs>
<TabItem value="up-cli" label="up CLI">

The up CLI provides the simplest installation method with automatic
configuration:

Make sure the current Kubeconfig context is set to the **provider control plane**
```bash
up ctx <organization-name/space-name/group/provider-control-plane-name>

up controlplane api-connector install --consumer-kubeconfig <consumer-cluster-kubeconfig> [OPTIONS]
```

The command:
1. creates a Robot account (named `<provider-control-plane-name>`) in the Upbound Cloud organization `<organization-name>`,
1. Gives the created robot account `admin` permissions to the provider control plane `<provider-control-plane-name>`
1. Generates a JWT token for the robot account, and stores it in a Kubernetes Secret in the consumer cluster.
1. Installs the API connector Helm chart in the consumer cluster.
1. Creates a `ClusterConnection` object in the consumer cluster, referring to the newly generated Secret, so that API connector can authenticate successfully to the provider control plane.
1. API connector pulls all published CRDs from the previous step into the consumer cluster.

**Example**:
```bash
up controlplane api-connector install \
  --consumer-kubeconfig ~/.kube/config \
  --consumer-context my-cluster \
  --upbound-token <your-token>
```

This command uses provided token to authenticate with the **Provider control plane**
and create a `ClusterConnection` resource in the **Consumer cluster** to connect to the
**Provider control plane**. 

**Key Options**:
- `--consumer-kubeconfig`: Path to consumer cluster kubeconfig (required)
- `--consumer-context`: Context name for consumer cluster (required)
- `--name`: Custom name for connection resources (optional)
- `--upbound-token`: API token for authentication (optional)
- `--upgrade`: Upgrade existing installation (optional)
- `--version`: Specific version to install (optional)

</TabItem>
<TabItem value="manual" label="Manual">

For manual installation or custom configurations:

```bash
helm upgrade --install api-connector oci://xpkg.upbound.io/spaces-artifacts/api-connector \
  --namespace upbound-system \
  --create-namespace \
  --version <version> \
  --set consumerClusterDisplayName=<cluster-name>
```

### Authentication methods

API Connector supports two authentication methods:

<Tabs>
<TabItem value="upbound-robot-token" label="Upbound Robot Token">

For Upbound Spaces integration:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: spaces-secret
  namespace: upbound-system
type: Opaque
stringData:
  token: <robot-token>
  organization: <organization-name>
  spacesBaseURL: <spaces-base-url>
  controlPlaneGroupName: <control-plane-group-name>
  controlPlaneName: <control-plane-name>
```
</TabItem>
<TabItem value="kubeconfig" label="Kubeconfig">

For direct cluster access:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: provider-kubeconfig
  namespace: upbound-system
type: Opaque
data:
  kubeconfig: <base64-encoded-kubeconfig>
```
</TabItem>
</Tabs>


### Connection setup

Create a `ClusterConnection` to establish connectivity:

<Tabs>
<TabItem value="upbound-token" label="Upbound Token">

```yaml
apiVersion: connect.upbound.io/v1alpha1
kind: ClusterConnection
metadata:
  name: spaces-connection
  namespace: upbound-system
spec:
  secretRef:
    kind: UpboundRobotToken
    name: spaces-secret
    namespace: upbound-system
  crdManagement:
    pullBehavior: Pull
```

</TabItem>
<TabItem value="kubeconfig" label="Kubeconfig">

```yaml
apiVersion: connect.upbound.io/v1alpha1
kind: ClusterConnection
metadata:
  name: provider-connection
  namespace: upbound-system
spec:
  secretRef:
    kind: KubeConfig
    name: provider-kubeconfig
    namespace: upbound-system
  crdManagement:
    pullBehavior: Pull
```

</TabItem>
</Tabs>

</TabItem>
</Tabs>

### Configuration

Bind APIs to make them available in your consumer cluster:

```yaml
apiVersion: connect.upbound.io/v1alpha1
kind: ClusterAPIBinding
metadata:
  name: <crd-name>
spec:
  connectionRef:
    kind: ClusterConnection
    name: <provider-controlplane-name> # Or --name value
```

<!-- vale Google.Spacing = NO -->
<!-- vale Microsoft.Spacing = NO -->
<!-- vale gitlab.SentenceSpacing = NO -->
The `ClusterAPIBinding` name must match the **Resource.Group** (name of the CustomResourceDefinition) of the CRD you want to bind.
<!-- vale gitlab.SentenceSpacing = YES -->
<!-- vale Microsoft.Spacing = YES -->
<!-- vale Google.Spacing = YES -->

## Usage example

After configuration, you can create API objects (in the consumer cluster) to
synchronize to the provider cluster:

```yaml
apiVersion: nop.example.org/v1alpha1
kind: NopResource
metadata:
  name: my-resource
  namespace: default
spec:
  coolField: "Synchronized resource"
  compositeDeletePolicy: Foreground
```

Verify the resource status:

```bash
kubectl get nopresource my-resource -o yaml

```
When the `APIBound=True` condition is present, it means that the API object
synced to the provider cluster, where reconciliation occurs. Whenever the
API object in the provider cluster gets status updates (for example
`Ready=True`), that status syncs back to the consumer cluster.

<!-- vale write-good.Passive = NO -->
Switch contexts to the provider cluster to see the API object being created:

```bash
up ctx <organization-name/space-name/group/provider-control-plane-name>
# or kubectl config set-context <provider-cluster-context>
```

```bash
kubectl get nopresource my-resource -o yaml
```

Note that in the provider cluster, the API object is labeled with information on
where the API object originates from, and `connect.upbound.io/managed=true`. 

## Monitoring and troubleshooting

### Check connection status

```bash
kubectl get clusterconnection
```

Expected output:
```
NAME                 STATUS   MESSAGE
spaces-connection    Ready    Provider controlplane is available
```

### View available APIs

```bash
kubectl get clusterconnection spaces-connection -o jsonpath='{.status.offeredAPIs[*].name}'
```

### Check API binding status

```bash
kubectl get clusterapibinding
```

### Debug resource synchronization

```bash
kubectl describe <resource-type> <resource-name>
```

## Removal

### Using the up CLI

```bash
up controlplane api-connector uninstall \
  --consumer-kubeconfig ~/.kube/config \
  --all
```

The `--all` flag removes all resources including connections and secrets.
Without the flag, runtime related resources persist.

:::note
Uninstall doesn't remove any API objects in the provider control plane. 
To clean all API objects, delete all API objects from the consumer
cluster before API connector uninstallation, and wait for the objects to get
deleted.
:::


### Using Helm

```bash
helm uninstall api-connector -n upbound-system
```

<!-- vale gitlab.HeadingContent = NO -->
## Limitations
<!-- vale gitlab.HeadingContent = YES -->

- **Preview feature**: Subject to breaking changes. Not yet production grade.
- **CRD updates**: CRDs are pulled once but not automatically updated. If multiple Crossplane clusters offer the same CRD API, API changes must be synchronized out of band, for example using a [Crossplane Configuration](https://docs.crossplane.io/latest/packages/).
- **Network requirements**: Consumer cluster must have direct network access to provider cluster.
- **Wide permissions needed in consumer cluster**: Because the API connector doesn't know up front the names of the APIs it needs to reconcile, it currently runs with full "root" privileges in the consumer cluster.

- **Connector polling**: API Connector checks for drift between the consumer and provider cluster
   periodically through polling. The poll interval can be changed with the `pollInterval` Helm value.


## Advanced configuration

### Multiple connections

You can connect to multiple provider clusters simultaneously by creating multiple `ClusterConnection` resources with different names and configurations.

[contact]: https://www.upbound.io/contact-us
