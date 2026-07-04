---
title: Quickstart
pagination_prev: null
pagination_next: null
---

In this quickstart, you'll run your first control plane project with UXP.

Make sure you have

- kind installed on your machine
- kubectl
- an upbound account
- the upbound cli installed


## Step 1: Log in to Upbound

Upbound requires a login to use the Community version of UXP.

```shell
up login

```

This opens up a browser window where you'll add your Upbound account
information. Once you're authenticated, you can close the window.

You'll have access to a console experience with your Upbound account.

## Step 2: Hub

Insights steps. Kind of convuluted right now, but needs to be done - should just
be a demo as described 

Install

The install has three steps. First, create a KIND cluster with the right port mappings. Next, install the chart with demo mode enabled. Finally, wait for the Pods to come up.
Create a KIND cluster

The demo's bundled Envoy gateway listens on NodePort 30443 for HTTPS. Map that NodePort to a host port so your browser can reach the Hub UI.

Save this as kind-demo.yaml:

kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: hub-demo
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 30443
        hostPort: 8443
        protocol: TCP

Create the cluster:

kind create cluster --config kind-demo.yaml

KIND writes a kind-hub-demo context into your kubeconfig and switches to it.
Install the Hub chart

Install the umbrella hub chart with demo mode enabled. The `<chart-ref>` placeholder is the chart's published OCI/registry coordinates. Substitute the value from your release notes.
```
helm install hub <chart-ref> \
  --namespace hub \
  --create-namespace \
  --set global.demo.enabled=true
```

The demo flag turns on every bundled dependency at once. With global.demo.enabled=true the chart also installs:

    An ephemeral PostgreSQL 18 instance with database hub and user hub.
    A Keycloak 26 instance pre-imported with a realm called hub, an OIDC client, and a single user admin / admin in an admin group.
    The Envoy Gateway controller and a Gateway that terminates TLS with a self-signed wildcard cert covering *.127.0.0.1.nip.io, exposed on NodePort 30443.
    A ControlPlane named default/default registered against the bundled Keycloak as its IdentityProvider.
    A hub-connector running in the same cluster, pre-registered against default/default, so the demo's own resources are queryable through Hub from the moment it starts.

Wait for Pods to be ready

kubectl -n hub wait --for=condition=ready pod --all --timeout=5m

The first start pulls images for hub-api, hub-connector, hub-webui, the bundled PostgreSQL and Keycloak, and the Envoy Gateway. Expect a few minutes on the first install.

When the command returns, list the Pods to confirm:

kubectl -n hub get pods

You should see one Pod each for hub-api, hub-connector, hub-webui, the demo Postgres, the demo Keycloak, and the Envoy gateway data plane.


## Kind cluster

do i need another one with the hub situation. Can I make the CTA in the previous
guide to create an account and describe how to download here? Or should this be
bundled further?

## Run the REAL quickstart

➜ up project init -t project-template-k8s-webapp -l python my-webapp

➜ up project init -t project-template-k8s-webapp -l python my-webapp
Initializing project from template "project-template-k8s-webapp"...
Initializing project from template project-template-k8s-webapp for python...
🙌 Successfully initialized project "my-webapp" in directory "/Users/rae/up-docs/my-webapp" from https://github.com/upbound/project-template-k8s-webapp.git (main)

➜ up project run --local --ingress
✓ Collecting resources
✓ Generating language schemas
✓ Creating local development control plane
✓ Checking dependencies
✓ Building functions
✓ Building configuration package
✓ Loading packages into control plane
✓ Applying init resources
✓ Installing package on development control plane
✓ Waiting for package to be ready
✓ Applying extra resources
💻 Local dev control plane running in kind cluster "up-my-webapp".
🌐 WebUI endpoint: http://127-0-0-1.nip.io:62400
Kubeconfig updated. Current context is "kind-up-my-webapp".

➜ cd examples/webapps

➜ k apply -f example.yaml
➜ webapp.platform.example.com/webservice created

wire up port forwarding to hit the nginx endpoint

curl it - see stuff

## Look at the hub/insights/whatever it's called

See all your stuff. much wow, very ux

## Change the manifest

nginx > httpd

hit the endpoints and see the curl command change

What hub reconsiliation? or k logs --watch

## Remove resoures

k delete webapp

kind delete clusters

## Next steps

Create your own control plane project with real cloud resources

