---
title: Build an AI controller with Crossplane
description: Deploy a WatchOperation that uses a local LLM to enforce platform policy — no Go, no operator framework, just YAML and a plain-English rule.
weight: {weight}
validation:
  type: walkthrough
  owner: docs@upbound.io
  environment: local-upbound
  timeout: 45m
  variables:
    HOST_IP: ""
---

In this tutorial, you run a Kubernetes controller whose reconciliation logic is
written in plain English. A Crossplane `WatchOperation` watches an nginx
`Deployment` and calls a local LLM whenever it changes. The LLM reads the
current state, applies the rule in its `systemPrompt`, and returns a corrected
manifest. Crossplane applies it.

By the end of this tutorial, you can:

- Run a Crossplane `WatchOperation` that calls a local LLM
- Watch the controller detect and correct a policy violation automatically
- Update the enforcement rule by editing a single field in YAML

The model running in this tutorial is `qwen2.5:1.5b` via Ollama — running
entirely on your local machine. No cloud API key is required.

## Prerequisites

Install the following before starting:

- [Docker][docker-install], running locally
- [`kubectl`][kubectl-install]
- [`kind`][kind-install]

### Install the up CLI

This tutorial requires up CLI v0.44.3.

```shell
curl -sL "https://cli.upbound.io" | VERSION=v0.44.3 sh
```

Move the binary into your `PATH`:

```shell
sudo mv up /usr/local/bin/
```

If you don't have `sudo` access, install to a user-local directory instead:

```shell
mkdir -p ~/.local/bin && mv up ~/.local/bin/
```

Then add it to your shell profile (`~/.bashrc`, `~/.zshrc`, or equivalent):

```shell
export PATH="$HOME/.local/bin:$PATH"
```

Verify the installation:

```shell
up version
```

## Create the project

### Create the project directory

```bash
mkdir english-controller
cd english-controller
```

All commands from this point run from inside the `english-controller` directory.

### Create the project manifest

The `upbound.yaml` file declares the project and its function dependencies.
`up project run --local` reads this file to know which packages to install into
the cluster. Create it with:

```bash
cat > upbound.yaml <<'EOF'
apiVersion: meta.dev.upbound.io/v2alpha1
kind: Project
metadata:
  name: english-controller
spec:
  dependsOn:
  - apiVersion: pkg.crossplane.io/v1
    kind: Function
    # function-auto-ready marks composed resources as ready automatically;
    # required by Crossplane's composition machinery even when not used directly.
    package: xpkg.upbound.io/crossplane-contrib/function-auto-ready
    version: '>=v0.0.0'
  - apiVersion: pkg.crossplane.io/v1
    kind: Function
    # function-openai is the function the WatchOperation calls to reach the LLM.
    package: xpkg.upbound.io/upbound/function-openai
    version: v0.3.0
  description: A Kubernetes controller whose enforcement logic is written in plain English.
EOF
```

### Create the `WatchOperation`

The `WatchOperation` is the controller — it defines what to watch and what
function to call when the watched resource changes.

```bash
mkdir -p operations/replicas
cat > operations/replicas/operation.yaml <<'EOF'
apiVersion: ops.crossplane.io/v1alpha1
kind: WatchOperation
metadata:
  name: replicas
spec:
  concurrencyPolicy: Forbid
  successfulHistoryLimit: 3
  failedHistoryLimit: 1
  operationTemplate:
    spec:
      mode: Pipeline
      pipeline:
      - functionRef:
          name: upbound-function-openai
        input:
          apiVersion: openai.fn.upbound.io/v1alpha1
          kind: Prompt
          systemPrompt: |-
            You are a Kubernetes controller. Output raw YAML only — no markdown, no code fences, no backticks, no explanations.

            Rule: if spec.replicas is less than 3, set it to 3. Otherwise keep it unchanged.
          userPrompt: |-
            Inspect the nginx Deployment and output the corrected manifest.
            Output only the Deployment manifest with the correct spec.replicas value.
            Include apiVersion, kind, metadata (name: nginx, namespace: default), and spec.
            Start your response with 'apiVersion:'
        step: deployment-analysis
        credentials:
        - name: gpt
          source: Secret
          secretRef:
            namespace: crossplane-system
            name: gpt
  watch:
    apiVersion: apps/v1
    kind: Deployment
    namespace: default
EOF
```

:::info
With a larger model like `gpt-4o` or `gpt-oss:20b`, the `systemPrompt` can be
much simpler — just the rule itself, without the output format instructions.
The explicit YAML output guidance in `userPrompt` is needed specifically for
`qwen2.5:1.5b`.
:::

## Set up Ollama

Ollama runs the LLM locally. Install it and pull the model before starting the
cluster — the model is ~1 GB.

### Install Ollama

```shell
curl -fsSL https://ollama.com/install.sh | sh
```

If the install script doesn't work for your OS, download directly from
[ollama.com/download][ollama-download].

### Start Ollama

On Linux, the install script registers a systemd service that starts Ollama
automatically. On macOS, Ollama may not start automatically after installation.
If `ollama list` returns "could not connect to ollama server", start it manually
in a separate terminal before continuing:

```
ollama serve
```

Verify it's ready:

```shell
ollama list
```

### Pull the model

```shell
ollama pull qwen2.5:1.5b
```

Confirm the model downloaded:

```shell
ollama list
```

You should see `qwen2.5:1.5b` in the output.

## Start the project

Run `up project run --local` from inside the `english-controller` directory.
This command creates a kind cluster, installs UXP, and deploys all packages and
APIs defined in the project. It exits when the cluster is ready.

```bash
up project run --local --control-plane-version=2.1.4-up.2
```

The `--control-plane-version` flag pins the UXP version installed into the kind
cluster. This tutorial was tested with `2.1.4-up.2`. If you need a different
version, find available version strings in the [UXP release notes][uxp-releases].

This takes several minutes on first run — it pulls provider packages and sets up
the cluster. Subsequent runs are faster.

:::warning
If `up project run --local` exits non-zero and prints `traces export: context
deadline exceeded`, check whether providers were installed:

```bash
kubectl get providers
```

If providers appear, provisioning succeeded despite the telemetry error.
If the list is empty, provisioning failed. Run
`kind delete cluster --name up-app-w-db` and retry. Verify your network
allows outbound connections to `xpkg.upbound.io` on port 443.
:::

Once the command completes, set your kubeconfig. `up project run --local` names
the kind cluster `up-app-w-db` by default:

```bash
kind get kubeconfig --name up-app-w-db > ~/.kube/config
```

:::warning
This overwrites your existing `~/.kube/config`. To preserve existing contexts,
merge instead:

```bash
kind get kubeconfig --name up-app-w-db > ~/.kube/config-upbound
KUBECONFIG=~/.kube/config:~/.kube/config-upbound \
  kubectl config view --flatten > ~/.kube/config.merged
mv ~/.kube/config.merged ~/.kube/config
```
:::

Verify the connection:

```bash
kubectl get nodes
```

## Wire Ollama into the cluster

The kind cluster's pods need to reach Ollama running on your host. This step
creates a Kubernetes `Service` and `Endpoints` resource that route cluster
traffic to your host machine.

1. Get the host IP on the kind bridge network:

   **Linux:**

   ```bash
   HOST_IP=$(docker network inspect kind -f '{{range .IPAM.Config}}{{.Gateway}}{{end}}')
   echo "Host IP: $HOST_IP"
   ```

   **macOS (Docker Desktop):**

   ```bash
   HOST_IP=$(docker run --rm alpine sh -c 'getent hosts host.docker.internal' 2>/dev/null | awk '{print $1}')
   echo "Host IP: $HOST_IP"
   ```

2. Create the `ollama` namespace and register Ollama as a cluster service:

   ```bash
   kubectl create namespace ollama --dry-run=client -o yaml | kubectl apply -f -

   kubectl apply -f - <<EOF
   apiVersion: v1
   kind: Service
   metadata:
     name: ollama
     namespace: ollama
   spec:
     ports:
     - port: 11434
       targetPort: 11434
   ---
   apiVersion: v1
   kind: Endpoints
   metadata:
     name: ollama
     namespace: ollama
   subsets:
   - addresses:
     - ip: ${HOST_IP}
     ports:
     - port: 11434
   EOF
   ```

3. Create the credentials secret that `function-openai` uses to reach Ollama:

   ```bash
   kubectl apply -f - <<EOF
   apiVersion: v1
   kind: Secret
   metadata:
     name: gpt
     namespace: crossplane-system
   stringData:
     OPENAI_API_KEY: ollama
     OPENAI_BASE_URL: http://${HOST_IP}:11434/v1
     OPENAI_MODEL: qwen2.5:1.5b
   EOF
   ```

   The `OPENAI_BASE_URL` points to Ollama's OpenAI-compatible API. To switch
   to a cloud model, replace this URL and update `OPENAI_API_KEY` and
   `OPENAI_MODEL` — the `WatchOperation` works identically.

### Verify the setup

Wait for `function-openai` to become healthy:

```bash
kubectl get functions
```

Wait until `upbound-function-openai` shows `HEALTHY: True`.

:::warning
If `kubectl get functions` returns **No resources found**, `up project run
--local` did not complete successfully. Check the output from that command,
delete the cluster with `kind delete cluster --name up-app-w-db`, and restart
from the [Start the project](#start-the-project) step.
:::

### Apply the starting state

Apply the nginx `Deployment` at 1 replica — the AI controller will correct
this:

```bash
kubectl apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: nginx
  name: nginx
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx
        name: nginx
EOF
```

Verify it's running:

```bash
kubectl get deployment nginx
```

You should see `READY: 1/1`.

## Part 1: Run the AI controller

A Crossplane `WatchOperation` fires every time a specific resource changes.
Here, it watches the nginx `Deployment` in the `default` namespace. When it
fires, it calls `upbound-function-openai`, which sends the current state to
the LLM along with the rule in `systemPrompt`. The LLM returns a corrected
manifest. Crossplane applies it.

### Apply the WatchOperation

```bash
kubectl apply -f operations/replicas/operation.yaml
```

The `WatchOperation` fires immediately because the `Deployment` exists.

### Watch it act

```bash
kubectl get deployment nginx -w
```

Within 60–90 seconds, replicas jump from 1 to 3. The LLM read the
`Deployment`, decided it violated the rule, and patched it.

Press Ctrl+C when the replicas reach 3.

### Explore the controller

Open `operations/replicas/operation.yaml`. That file is the entire controller.

The `systemPrompt` is the reconciliation logic:

```text
systemPrompt: |-
  You are a Kubernetes controller. Output raw YAML only.

  Rule: if spec.replicas is less than 3, set it to 3. Otherwise keep it unchanged.
```

The `watch` block defines the trigger:

```text
watch:
  apiVersion: apps/v1
  kind: Deployment
  namespace: default
```

Every time any `Deployment` in `default` changes, the operation fires.

### Inspect the operation records

Each `Operation` object is a record of a single invocation — what fired, what
the model returned, and what the controller applied.

```bash
kubectl get watchoperations
```

```bash
kubectl get operations
```

Pick one of the operation names and describe it:

```bash
kubectl describe operation <name>
```

The `Events` section shows the exact YAML the model returned.

## Part 2: Watch it self-heal

The controller re-evaluates on every change. If something modifies the
`Deployment` — a human, a CI pipeline, a rollout — the rule re-applies.
This is drift detection with reasoning.

### Trigger a violation

Scale nginx down to 1 replica:

```bash
kubectl scale deployment nginx --replicas=1
```

### Watch it recover

```bash
kubectl get deployment nginx -w
```

Within 30–60 seconds, replicas climb back to 3. The `WatchOperation` fired
because the `Deployment` changed. The LLM saw 1 replica, decided it violated
the rule, and patched it.

Press Ctrl+C when replicas are back at 3.

### Inspect what fired

```bash
kubectl get operations
```

Each entry is a new record. The most recent one captured the scale-down event
and the correction.

## Part 3: Update the rules

The enforcement logic is a text field. To change the policy, edit `systemPrompt`
and re-apply.

### Open the operation

```bash
cat operations/replicas/operation.yaml
```

### Change the minimum replicas to 5

Find the `systemPrompt` and update the rule line. Change:

```text
Rule: if spec.replicas is less than 3, set it to 3. Otherwise keep it unchanged.
```

To:

```text
Rule: if spec.replicas is less than 5, set it to 5. Otherwise keep it unchanged.
```

Edit the file directly:

**macOS:**

```bash
sed -i '' 's/less than 3, set it to 3/less than 5, set it to 5/' \
  operations/replicas/operation.yaml
```

**Linux:**

```bash
sed -i 's/less than 3, set it to 3/less than 5, set it to 5/' \
  operations/replicas/operation.yaml
```

### Apply the updated operation

```bash
kubectl apply -f operations/replicas/operation.yaml
```

### Trigger and observe

Scale nginx down to 1 to trigger the new rule:

```bash
kubectl scale deployment nginx --replicas=1
```

Watch the updated rule enforce 5 replicas:

```bash
kubectl get deployment nginx -w
```

This takes 30–45 seconds. Press Ctrl+C when you see 5 ready replicas.

### Verify

```bash
kubectl get watchoperations
kubectl get operations
```

Same architecture, different policy — changed by editing a text field.

:::tip
Try adding a condition to the rule:

```
If the deployment name contains 'prod', require at least 5 replicas.
Otherwise, require at least 2.
```

The model interprets natural language conditions the same way it interprets
simple numeric rules.
:::

## Clean up

Delete the demo resources:

```bash
kubectl delete watchoperation replicas
kubectl delete operations --all
kubectl delete deployment nginx
```

Delete the cluster:

```bash
kind delete cluster --name up-app-w-db
```

## Next steps

In this tutorial, you:

- Created a Crossplane project with `upbound.yaml` and a `WatchOperation`
- Deployed a controller that calls a local LLM on every `Deployment` change
- Watched the controller detect and correct a replica count violation
- Updated the enforcement policy by editing a single field in YAML

Continue with:

- [WatchOperations reference][watchops-ref] — triggers, concurrency, history
  limits, and output handling
- [Composition functions][fn-docs] — build custom logic for any resource
- [Provider authentication][auth-docs] — connect providers to your own cloud
  account
- [Upbound Marketplace][marketplace] — functions and providers for AWS, Azure,
  GCP, and more

[docker-install]: https://docs.docker.com/get-docker/
[kubectl-install]: https://kubernetes.io/docs/tasks/tools/
[kind-install]: https://kind.sigs.k8s.io/docs/user/quick-start/#installation
[ollama-download]: https://ollama.com/download
[up-cli-releases]: https://github.com/upbound/up/releases
[uxp-releases]: /reference/release-notes/
[watchops-ref]: /manuals/crossplane/operations/watch/
[fn-docs]: /manuals/cli/howtos/compositions/
[auth-docs]: /manuals/packages/providers/authentication/
[marketplace]: https://marketplace.upbound.io/
