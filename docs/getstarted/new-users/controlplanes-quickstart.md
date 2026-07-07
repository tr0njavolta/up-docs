---
title: Quickstart
pagination_prev: null
pagination_next: null
---
TEMP

**Prerequisites:** kind · `kubectl` · Helm · Upbound account · [up CLI][upCli].

## Step 1: Log in to Upbound

- `up login` (community UXP requires login). Browser auth, then close.

## Step 2: Install Insights (demo)

1. Create the KIND cluster with the gateway port map (`30443` to host `8443`),
    `kind create cluster --config kind-demo.yaml`.
2. `helm install hub <chart-ref> --namespace hub --create-namespace --set global.demo.enabled=true`.
3. `kubectl -n hub wait --for=condition=ready pod --all --timeout=5m`.
4. Open the Console at `{console-demo-url}`, log in `admin`/`admin`.

- Placeholders: `<chart-ref>`, `{console-demo-url}` (from release notes).
- Dedup note: this demo block should become a shared partial once the Insights
    section's demo page exists (currently inlined, single consumer).

## Step 3: Initialize a project

- `up project init -t project-template-k8s-webapp -l python my-webapp`.

## Step 4: Run it locally

- `up project run --local --ingress`. Builds functions and config, creates a
    local dev control plane, and prints its context and Console endpoint.

## Step 5: Deploy an example resource

- `cd my-webapp/examples/webapps && kubectl apply -f example.yaml`.

## Step 6: See it in the Console

TODO: open question. `up project run --local` creates its own dev control plane,
separate from the demo's bundled one. So the Step 5 resources won't appear in the
demo Console until you connect that dev control plane to Insights. Confirm the
intended path with engineering (auto-register on `up project run`, or manual
[connect][connect]) before writing this step. Don't publish until you verify it.

## Step 7: Change and reconcile

- Edit the example (`nginx` to `httpd`), reapply, `kubectl get managed -w`, and
    watch the Console update.

## Step 8: Clean up

- Run `kubectl delete -f example.yaml`, then `kind delete cluster --name
    up-my-webapp` and `kind delete cluster --name hub-demo`.

## Next steps

- [Builders workshop][workshop] for real cloud resources.
- [Insights overview][insights] for the full-fleet story.

[upCli]: /manuals/cli/overview
[connect]: /manuals/platform/insights/connections
[insights]: /manuals/platform/insights/overview
[workshop]: /getstarted/builders-workshop/project-foundations
