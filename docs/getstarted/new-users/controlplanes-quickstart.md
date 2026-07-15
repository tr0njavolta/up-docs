---
title: Quickstart
pagination_prev: null
pagination_next: null
---
Get a control plane, the Hub, and a sample project running on your laptop in a
few minutes.

**Prerequisites:**
* `kind`
* `kubectl`
* `helm`
* [up CLI][upCli]
* An Upbound account

## Step 1: Run the installation script

The script creates a kind cluster, installs the control plane and Hub
components, and initializes a sample project. It prompts you to log in to
Upbound the first time it runs.

<details>

    <summary> Quickstart install script </summary>
    ```shell title="quickstart.sh" manifest="/manifests/getstarted/quickstart.sh"
    ```
</details>

Download and run it:

```shell
curl -fsSL https://docs.upbound.io/manifests/getstarted/quickstart.sh -o quickstart.sh
bash quickstart.sh
```

The script keeps a Console port-forward running in your terminal. Leave it
running and open a new terminal for the following steps.

## Step 2: Deploy an example resource

```shell
kubectl apply -f my-webapp/examples/webapps/example.yaml
```

## Step 3: See it in the Console

The project runs on the same cluster as the Hub, so the resource appears in the
Console automatically, with no extra connection step. Open the Console and find
your new `webservice` resource.

To watch the Hub reflect configuration changes, scale the replica count up:

```shell
kubectl patch webapp webservice -n default --type=merge -p '{"spec":{"parameters":{"replicas":3}}}'
```

The Console shows the new replica count as the control plane reconciles.

## Step 4: Clean up

```shell
kubectl delete -f my-webapp/examples/webapps/example.yaml
kind delete cluster --name quickstart
```

## Next steps

- [Builders workshop][workshop] for real cloud resources.
- [Hub overview][hub] for the full-fleet story.

[upCli]: /controlplanes/cli/overview
[hub]: /hub/overview
[workshop]: /getstarted/builders-workshop/project-foundations
