---
title: Connect a second cluster
sidebar_position: 4
description: Connect a second cluster to the Hub demo with hub-connector.
---

By the end of the previous section, you had Hub running within a single cluster.
Hub's value shows up once it aggregates resources from more than one. This
section spins up a second local KIND cluster, installs a `hub-connector` in it,
and registers it against your running demo.

This step is optional but recommended. If you're done exploring, skip ahead to
[Uninstall](#uninstall).

:::warning[Demo only]
This walkthrough wires the second cluster's connector to the demo Hub without
verifying TLS (to support demo mode's self-signed certificate) over a single
Docker host and the same KIND Docker network. For a real multi-cluster install,
see the [self-hosted overview](/hub/architecture).
:::

## Create the Second KIND Cluster

The second cluster needs no host port mappings. It will communicate back to the
Hub API over the Docker network.

Create the cluster using the `kind` CLI:

```bash
kind create cluster --name hub-demo-extra
```

## Expose the Demo Hub API on the Docker Network

In the demo install, `hub-api` and its token-exchange Service are both
`ClusterIP`, reachable only from inside the demo cluster. Rather than modify
those Services, add two new `NodePort` Services alongside them. In a production
installation, all traffic would be routed through a proper Gateway - this is
only required because we are connecting between KIND clusters.

```bash
kubectl --context kind-hub-demo -n hub apply -f - <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: hub-api-nodeport
spec:
  type: NodePort
  selector:
    app.kubernetes.io/name: hub-api
    app.kubernetes.io/instance: hub
  ports:
    - name: http
      port: 8080
      targetPort: http
      nodePort: 30080
---
apiVersion: v1
kind: Service
metadata:
  name: hub-api-token-exchange-nodeport
spec:
  type: NodePort
  selector:
    app.kubernetes.io/name: hub-api
    app.kubernetes.io/instance: hub
  ports:
    - name: token-exchange
      port: 8444
      targetPort: token-exchange
      nodePort: 30444
EOF
```

The `selector` matches the labels the `hub-api` Pods already carry, so these
Services route to the running API without touching the demo's original
`ClusterIP` Services.

The connector in the second cluster will dial `hub-demo-control-plane:30080` for
the API and `:30444` for token exchange. Docker's embedded DNS resolves the
hostname to the demo cluster's control-plane container.

### Mint a Registration Token

Hub issues a per-control-plane bootstrap secret called a **registration token**.
The connector presents this token when it first contacts Hub API, so Hub knows
which control plane the connector represents.

1. Open the Hub UI at
   [https://hub.127.0.0.1.nip.io:8443/infrastructure/control-planes](https://hub.127.0.0.1.nip.io:8443/infrastructure/control-planes)
   and sign in as `admin / admin` if you are not already.
2. Create a new ControlPlane in the `default` realm and name it `extra`.
3. Copy the registration token the UI displays. It is shown once.

Set the token as a shell variable for the next step:

```bash
export HUB_EXTRA_CTP_TOKEN=<paste-registration-token-here>
```

### Install `hub-connector` in the Second Cluster

`hub-connector` is published as its own chart, separate from the umbrella `hub`
chart. Substitute the `<connector-chart-ref>` placeholder with the chart's
published coordinates.

```bash
kubectl --context kind-hub-demo-extra create namespace hub

kubectl --context kind-hub-demo-extra -n hub create secret generic hub-connector-credentials \
  --from-literal=registrationToken="$HUB_EXTRA_CTP_TOKEN"

helm install hub-connector <connector-chart-ref> \
  --kube-context kind-hub-demo-extra \
  --namespace hub \
  --set connector.hub.url=http://hub-demo-control-plane:30080 \
  --set connector.hub.tokenExchangeUrl=http://hub-demo-control-plane:30444 \
  --set connector.hub.allowInsecure=true \
  --set connector.credentials.existingSecretRef.name=hub-connector-credentials
```

Wait for the connector to come up:

```bash
kubectl --context kind-hub-demo-extra -n hub wait --for=condition=ready pod --all --timeout=2m
```

### Verify the Second Control Plane Appears

Refresh the Hub UI. Two checks confirm the second cluster is online and
reporting:

- The control planes page shows `extra` alongside the demo's `default`
  with a status of `Ready`.
- The resources page, filtered by control plane name `extra`, shows the
  resources installed in the second cluster.

If the new control plane never shows up or never reports any resources, inspect
the connector logs:

```bash
kubectl --context kind-hub-demo-extra -n hub logs deployment/hub-connector
```

The most common failure is the connector being unable to reach
`hub-demo-control-plane:30080`, usually because the second cluster did not join
the shared `kind` Docker network. Run `docker network connect kind
hub-demo-extra-control-plane` and restart the connector Pod.

## Uninstall

When you're done, delete the demo cluster:

```bash
kind delete cluster --name hub-demo
```

If you ran the optional step above, also delete the second cluster:

```bash
kind delete cluster --name hub-demo-extra
```

This wipes both clusters, the bundled Postgres, the bundled Keycloak, every Hub
component, and the second cluster's connector. The demo stores no state outside
the clusters.

## Next Step

The demo runs Hub alongside one or two observed control planes inside KIND. The
next page replaces the demo's bundled Postgres, Keycloak, and self-signed
gateway with externally-managed equivalents for a real install:

- [Self-hosted overview](/hub/architecture). Install Hub against
  external Postgres, an external OIDC provider, and a gateway that ends
  TLS. The connector install pattern from this page carries over.
