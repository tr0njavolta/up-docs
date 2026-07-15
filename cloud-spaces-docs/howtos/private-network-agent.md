---
title: Private Network Agent
sidebar_position: 5
description: Connect an Upbound Cloud control plane to resources in your private network without exposing public endpoints
---

<!-- vale Google.We = NO -->
:::important
Private Network Agent is in private preview. For more information, [contact us][contact-us].
:::
<!-- vale Google.We = YES -->

The Private Network Agent lets an Upbound Cloud control plane manage Kubernetes
and Helm resources inside private networks. No public endpoints, inbound
firewall rules, or VPC peering required.

## Architecture overview

The Private Network Agent reverses the traditional connection model. Instead of
the control plane reaching into your private network, a lightweight agent inside
your network connects outbound to the control plane. The control plane sends
requests through this connection and receives responses through the same
channel.

![Private Network Agent architecture](/img/private-network-agent.png)

This approach:

- Requires only outbound connectivity from your private network.
- Eliminates inbound firewall exceptions, VPC peering, and publicly exposed Kubernetes API servers.
- Keeps a minimal footprint in your environment.

The system has two components:

- **Proxy**: Runs inside your Upbound managed control plane. Upbound manages this automatically.
- **Private Network Agent**: Runs inside your private network. You deploy and manage this via a Helm chart.

## Prerequisites

Before you begin, make sure you have:

- An Upbound organization and a managed control plane.
- `Admin` role on the control plane (required to create a `Proxy` resource).
- A destination Kubernetes cluster in your private network.
- Outbound connectivity from the private network to `connect.upbound.io:4222` (TCP/TLS). No inbound rules required.
- `kubectl` access to both the managed control plane and the destination cluster.
- The [Upbound CLI](/manuals/cli/overview/) (`up`) installed.
- Helm v3 installed.

## Set up the destination cluster

On your **destination cluster**, create a service account that
`provider-kubernetes` uses.

Create the service account and bind it to a role, for example `cluster-admin`:

```bash
kubectl create serviceaccount provider-kubernetes -n default

kubectl create clusterrolebinding provider-kubernetes-binding \
  --clusterrole=cluster-admin \
  --serviceaccount=default:provider-kubernetes
```

Create a long-lived service account token:

```bash
kubectl create -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: provider-kubernetes-token
  annotations:
    kubernetes.io/service-account.name: provider-kubernetes
type: kubernetes.io/service-account-token
EOF
```

Retrieve the token:

```bash
TOKEN=$(kubectl get secret provider-kubernetes-token -o jsonpath='{.data.token}' | base64 -d)
```

Set the cluster's certificate authority data (from your cloud provider's console
or kubeconfig) as an environment variable:

```bash
export CLUSTER_CA_DATA=<certificate-authority-data>
```

## Configure the control plane

Switch your `kubectl` context to your **Upbound managed control plane**.

### Install provider-kubernetes

Install `provider-kubernetes` on the control plane:

```yaml
kubectl apply -f - <<EOF
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: upbound-provider-kubernetes
spec:
  package: xpkg.upbound.io/upbound/provider-kubernetes:v1.1.0
  packagePullPolicy: IfNotPresent
EOF
```

### Create the kubeconfig secret

Create a secret containing the destination cluster's kubeconfig. Point the
`server` field to your API server—use
`https://kubernetes.default.svc.cluster.local` if the agent runs in the
destination cluster:

```bash
kubectl create -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: private-cluster-kubeconfig
  namespace: crossplane-system
type: Opaque
stringData:
  kubeconfig: |
    apiVersion: v1
    kind: Config
    clusters:
    - cluster:
        certificate-authority-data: $CLUSTER_CA_DATA
        server: https://kubernetes.default.svc.cluster.local
      name: private-cluster
    contexts:
    - context:
        cluster: private-cluster
        user: private-cluster
      name: private-cluster
    current-context: private-cluster
    users:
    - name: private-cluster
      user:
        token: $TOKEN
EOF
```

### Create a ProviderConfig

Create a `ProviderConfig` that references the kubeconfig secret:

```yaml
kubectl apply -f - <<EOF
apiVersion: kubernetes.crossplane.io/v1alpha1
kind: ProviderConfig
metadata:
  name: private-cluster
spec:
  credentials:
    source: Secret
    secretRef:
      name: private-cluster-kubeconfig
      namespace: crossplane-system
      key: kubeconfig
EOF
```

### Create a robot token

Create a robot and token in your Upbound organization. Both proxy and agent use
this token to authenticate.

```bash
export UPBOUND_ORG=<your-organization>

up robot create proxyagent -a $UPBOUND_ORG
up robot token create proxyagent private-cluster -f ./token.json -a $UPBOUND_ORG

ROBOT_TOKEN=$(cat token.json | jq -r .token)
```

Create a Kubernetes secret containing the token on the Upbound control plane:

```bash
kubectl create -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: robot-token
  namespace: default
type: Opaque
stringData:
  token: $ROBOT_TOKEN
EOF
```

### Create the `Proxy` resource

Create a `Proxy` resource in the managed control plane. This deploys the proxy
component and configures provider pods to route traffic through it. Each control
plane supports only one `Proxy`.

:::warning
Creating a `Proxy` requires the `Admin` role.
:::

```yaml
kubectl apply -f - <<EOF
apiVersion: spaces.upbound.io/v1alpha1
kind: Proxy
metadata:
  name: private-cluster
  namespace: default
spec:
  secretRef:
    name: robot-token
    key: token
  podSelector:
    matchLabels:
      pkg.crossplane.io/provider: upbound-provider-kubernetes
EOF
```

Retrieve the generated agent ID:

```bash
AGENT_ID=$(kubectl get proxy private-cluster -o jsonpath='{.status.agentID}')
```

<!-- vale Google.Headings = NO -->
## Install the Private Network Agent
<!-- vale Google.Headings = YES -->


Switch your `kubectl` context back to the **destination cluster**.

Create the robot token secret in the destination cluster:

```bash
kubectl create -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: robot-token
  namespace: default
type: Opaque
stringData:
  token: $ROBOT_TOKEN
EOF
```

Install the Private Network Agent using Helm:

```bash
helm upgrade --install private-network-agent \
  oci://xpkg.upbound.io/spaces-artifacts/private-network-agent \
  --version 0.0.0-1015.g358e4c6 \
  --set agent.connectUrl=tls://connect.upbound.io \
  --set agent.organization=$UPBOUND_ORG \
  --set agent.agentId=$AGENT_ID \
  --set agent.tokenSecret=robot-token
```

When the agent connects, the `Proxy` status changes to `Connected`.

## Verify the connection

From the control plane, confirm the proxy status shows `Connected`:

```bash
kubectl get proxy private-cluster
```

Create a test resource to verify end-to-end connectivity:

```yaml
kubectl apply -f - <<EOF
apiVersion: kubernetes.crossplane.io/v1alpha2
kind: Object
metadata:
  name: test-configmap
spec:
  forProvider:
    manifest:
      apiVersion: v1
      kind: ConfigMap
      metadata:
        name: test-configmap
        namespace: default
      data:
        message: "Hello from control plane via private network agent!"
  providerConfigRef:
    name: private-cluster
EOF
```

Verify the `Object` becomes `Ready`:

```bash
kubectl get object test-configmap
```

On the destination cluster, confirm the ConfigMap exists:

```bash
kubectl get configmap test-configmap -n default -o yaml
```

## Proxy resource reference

```yaml
apiVersion: spaces.upbound.io/v1alpha1
kind: Proxy
metadata:
  name: prod-eks-us-east-1
  namespace: default
spec:
  # Human-readable description
  description: "Production EKS cluster in us-east-1"

  # Reference to the secret containing the robot token
  secretRef:
    name: robot-token
    key: token

  # Optional: Set a specific agent ID to share an agent across
  # multiple proxies. If omitted, a UUID is autogenerated.
  agentID: "550e8400-e29b-41d4-a716-446655440000"

  # Label selector for provider pods that should route through the proxy
  podSelector:
    matchLabels:
      pkg.crossplane.io/provider: provider-kubernetes
```

### Status fields

| Field | Description |
|---|---|
| `status.agentID` | The effective agent ID (from `spec.agentID` or generated UUID). |
| `status.phase` | `WaitingForProxy`: proxy created, agent hasn't connected yet. `Connected`: agent is actively connected. `Disconnected`: agent connection dropped. |

## Connect multiple proxies to one agent

To connect multiple control plane proxies to a single Private Network Agent, set
the same `agentId` on each `Proxy` resource:

```yaml
spec:
  agentID: "550e8400-e29b-41d4-a716-446655440000"
```

Proxies in different control planes can share the same agent, letting one agent
serve multiple control planes that access the same private network. The agent
supports multiple concurrent connections with full isolation.

## Connectivity options

### Public internet

By default, the Private Network Agent connects to `connect.upbound.io` over the
public internet using TLS 1.3.

The agent requires **outbound (egress)** connectivity to `connect.upbound.io` on
port `4222` (TCP/TLS). If your cluster enforces network policies, firewall
rules, or egress restrictions, you must allow this destination before installing
the agent.

| Field | Value |
|---|---|
| Hostname | `connect.upbound.io` |
| Port | `4222` |
| Protocol | TCP/TLS 1.3 |
| Direction | Outbound (egress) |

[contact-us]: https://www.upbound.io/contact-us
