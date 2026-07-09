---
title: Running Hub in demo mode
sidebar_position: 1
description: Install the Hub demo on a local kind cluster and explore the UI.
---

This page walks you through installing the Hub demo on a single KIND cluster,
then connecting a second local cluster so you can see Hub aggregating resources
from more than one control plane.

:::warning[Demo only]
The demo bundles PostgreSQL with hardcoded credentials, Keycloak with hard-coded
admin credentials, and a self-signed wildcard TLS certificate. Do not expose
this installation outside your local machine. For a production-ready install with
external Postgres, an external OIDC provider, and a real TLS certificate, see
[the self-hosted overview](../concepts/architecture.md).
:::

## Prerequisites

You need the following installed locally:

- **Docker**. KIND runs Kubernetes nodes as Docker containers. Any recent Docker
Desktop or Docker Engine release works.
- **KIND** v0.20 or later. See the [KIND
quickstart](https://kind.sigs.k8s.io/docs/user/quick-start/) for installation.
- **kubectl** matching the Kubernetes version KIND includes (1.29+). See
[kubectl install](https://kubernetes.io/docs/tasks/tools/).
- **Helm** v3.12 or later. See [Helm
install](https://helm.sh/docs/intro/install/).

The demo runs entirely on your laptop. It does not connect to any external
Upbound services and does not require a registered Upbound account.

## Install

The install has three steps. First, create a KIND cluster with the right port
mappings. Next, install the chart with demo mode enabled. Finally, wait for the
Pods to come up.

### Create a KIND Cluster

The demo's bundled Envoy gateway listens on NodePort `30443` for HTTPS. Map that
NodePort to host port `8443` so your browser can reach the Hub UI.

Create the cluster using the `kind` CLI:

```bash
kind create cluster --config=-<<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: hub-demo
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 30443
        hostPort: 8443
        protocol: TCP
EOF
```

KIND writes a `kind-hub-demo` context into your kubeconfig and switches to it.

### Install the Hub Chart

Install the umbrella `hub` chart with demo mode enabled.

```bash
helm install hub <chart-ref> \
  --namespace hub \
  --create-namespace \
  --set global.demo.enabled=true
```

The demo flag turns on every bundled dependency at once. With
`global.demo.enabled=true` the chart also installs:

- An ephemeral PostgreSQL instance
- A Keycloak instance pre-imported with a realm called `hub`, an OIDC client,
and a single user `admin` in an `admin` group
- The Envoy Gateway controller and a `Gateway` that terminates TLS with a
self-signed wildcard cert covering `*.127.0.0.1.nip.io`
- A Hub `ControlPlane` named `default`
- A `hub-connector` running in the same cluster, so the demo's own resources are
queryable through Hub from the moment it starts - associated with the
`default` `ControlPlane`



### Wait for Pods to Be Ready

```bash
kubectl -n hub wait --for=condition=ready pod --all --timeout=5m
```

The first start pulls images for `hub-api`, `hub-connector`, `hub-webui`, the
bundled PostgreSQL and Keycloak, and the Envoy Gateway. It may take a few
minutes to pull all of the images and start.

When the command returns, list the Pods to confirm:

```bash
kubectl -n hub get pods
```

You should see one Pod each for `hub-api`, `hub-connector`, `hub-webui`, the
demo Postgres, the demo Keycloak, and the Envoy gateway data plane.

## Configure

No configuration is required. Demo mode comes with defaults wired end-to-end:

| Default                         | Value                                                  |
| ------------------------------- | ------------------------------------------------------ |
| Demo entrypoint                 | `https://hub.127.0.0.1.nip.io:8443`                    |
| Hub UI, `hub-api`, and Keycloak | All served from `hub.127.0.0.1.nip.io:8443`            |
| Admin login                     | `admin / admin`                                        |
| Default control plane           | `default/default`                                      |

:::warning[Demo only]
Every credential above is hardcoded into the chart and is identical on every
demo install. Do not reuse these values for anything outside this local cluster.
:::

## Verify

### Open the Hub UI

Visit `https://hub.127.0.0.1.nip.io:8443` in your browser.

`127.0.0.1.nip.io` is a public DNS wildcard that resolves any subdomain to
`127.0.0.1`.

:::warning[Demo only]
The gateway terminates TLS with a self-signed certificate generated at install
time. Your browser will warn about an untrusted certificate. Click through
`Advanced → Proceed to hub.127.0.0.1.nip.io` once to trust it for the rest of
the session.
:::

### Log In

At the Keycloak login screen, sign in with:

- **Username:** `admin`
- **Password:** `admin`

After login you should arrive at the Hub UI dashboard!

### Take a Look Around

The demo's bundled `hub-connector` is already reporting resources from the KIND
cluster against the `default` control plane.

If the Hub UI shows the control plane but no resources, give the connector
another 30 seconds: it performs an initial inventory pass after registering, and
the first sync is the slowest. If problems persist, check the health and logs of
all Hub pods for any obvious errors.

## Next Step

After completing the demo, you now have a running version of the Hub API with a
single `ControlPlane` representing the KIND cluster that Hub API is running
within. Next we are going to start another cluster and connect it as a separate
`ControlPlane` to demonstrate the power of Hub as a central aggregation layer.
See [Connect a second cluster](./connect-second-cluster.md).
