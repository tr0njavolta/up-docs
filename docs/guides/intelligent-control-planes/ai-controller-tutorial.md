---
title: Build an AI controller 
description: Deploy a WatchOperation that uses a local LLM to enforce platform policy.
weight: {weight}
validation:
  type: walkthrough
  owner: docs@upbound.io
  environment: local-upbound
  timeout: 45m
  variables:
    HOST_IP: ""
---

In this tutorial, you run a Kubernetes controller with reconciliation logic in
plain English. A Crossplane `WatchOperation` watches an nginx `Deployment` and
calls a local LLM whenever it changes. The LLM reads the
current state, applies the rule in its `systemPrompt`, and returns a corrected
manifest. Crossplane applies it.

By the end of this tutorial, you can:

- Deploy a `WatchOperation` that calls a local LLM on every resource change
- Watch the controller detect and correct a policy violation automatically
- Update the enforcement rule by editing a single field in YAML

The model in this tutorial is `qwen3.5:latest`, running locally via Ollama.
No cloud API key required.

## Prerequisites

Install the following before starting:

- [Docker][docker-install], running locally
- [`kubectl`][kubectl-install]
- [`kind`][kind-install]
- [`up CLI`][up-cli] v0.44.3 or later


## Create the project

Scaffold a new project with `up project init`. This creates the
`ai-controller/` directory with a valid `upbound.yaml` and the standard
project layout (`apis/`, `functions/`, `examples/`, `tests/`):

```bash
up project init --scratch ai-controller
cd ai-controller
```

All commands from this point run from inside the `ai-controller` directory.

The controller uses two Crossplane functions: `function-auto-ready` so the
`WatchOperation` reports ready status, and `function-openai` to call the LLM.
Add them as project dependencies:

```bash
up dependency add 'xpkg.upbound.io/crossplane-contrib/function-auto-ready'
up dependency add 'xpkg.upbound.io/upbound/function-openai:v0.3.0'
```

`up dependency add` records each dependency in `upbound.yaml`.

Create the starting nginx `Deployment` with 1 replica. The AI controller
corrects this after you deploy it later in the tutorial.

```bash
mkdir -p examples
cat > examples/deployment.yaml <<'EOF'
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
<!-- vale Google.Headings = NO -->
## Set up Ollama
<!-- vale Google.Headings = YES -->

Ollama runs the LLM locally. Install it, start it, and pull the model before
starting the cluster. The model is ~1 GB.

1. Install Ollama:

   ```shell
   curl -fsSL "https://ollama.com/install.sh" | sh
   ```

   If the install script doesn't work for your OS, download directly from
   [ollama.com/download][ollama-download].

<!-- vale Microsoft.Contractions = NO -->
2. Start Ollama. On Linux, the install script registers a `systemd` service
   that starts Ollama automatically. On macOS, start it manually in a
   separate terminal if `ollama list` returns "could not connect to ollama
   server":
<!-- vale Microsoft.Contractions = YES -->

   ```shell
   ollama serve
   ```

3. Pull the model:

   ```shell
   ollama pull qwen3.5:latest
   ```

4. Confirm the model downloaded:

   ```shell
   ollama list
   ```

   You should see `qwen3.5:latest` in the output.

## Start the project

Run from inside the `ai-controller` directory:

```bash
up project run --local --control-plane-version=2.1.4-up.2
```

This creates a kind cluster, installs UXP, and deploys the function packages
declared in `upbound.yaml`. It exits when the cluster is ready.

:::warning
`up project run --local` may print `traces export: context deadline exceeded`.
This message reports a telemetry timeout and doesn't affect the cluster setup.
:::

Verify the connection:

```bash
kubectl get nodes
```

The kind cluster's pods need to reach Ollama running on your host. Create a
Kubernetes `Service` and `Endpoints` that route cluster traffic to your machine.

1. Get the host's IPv4 address as seen from inside the cluster. This command
   works on Linux, macOS, and Windows:

   ```bash
   HOST_IP=$(docker run --rm --add-host=host.docker.internal:host-gateway alpine \
     getent hosts host.docker.internal | awk '$1 ~ /^[0-9.]+$/ {print $1; exit}')
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
   apiVersion: discovery.k8s.io/v1
   kind: EndpointSlice
   metadata:
     name: ollama
     namespace: ollama
     labels:
       kubernetes.io/service-name: ollama
   addressType: IPv4
   ports:
   - port: 11434
     protocol: TCP
   endpoints:
   - addresses:
     - ${HOST_IP}
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
     OPENAI_MODEL: qwen3.5:latest
   EOF
   ```

   The `OPENAI_BASE_URL` points to Ollama's OpenAI-compatible API. To switch to
   a cloud model, replace `OPENAI_BASE_URL` with `https://api.openai.com/v1`,
   set `OPENAI_API_KEY` to your API key, and update `OPENAI_MODEL`. The
   `WatchOperation` works identically regardless of which model runs.

Wait for `function-openai` to become healthy:

```bash
kubectl get functions
```

Wait until `upbound-function-openai` shows `HEALTHY: True`.

:::warning
If `kubectl get functions` returns **No resources found**, `up project run
--local` didn't complete. Delete the cluster with
`kind delete cluster --name up-ai-controller` and restart from
[Start the project](#start-the-project).
:::

Apply the nginx `Deployment` at 1 replica:

```bash
kubectl apply -f examples/deployment.yaml
```

Verify it's running:

```bash
kubectl get deployment nginx
```

You should see `READY: 1/1`.

## Run the AI controller

An nginx `Deployment` is running in the cluster with only 1 replica. Apply the
`WatchOperation` and watch it fix that.

Crossplane Operations are Kubernetes objects that run logic against your
cluster on a trigger:

| Kind | Trigger |
|------|---------|
| `WatchOperation` | Every time a specific resource changes |
| `CronOperation` | On a schedule |
| `Operation` | Once, on demand |

This tutorial uses a `WatchOperation` that watches the nginx `Deployment` and
calls an LLM every time it changes.

1. Confirm the starting state:

   ```bash
   kubectl get deployment nginx
   ```

   `READY 1/1` is the starting point.

2. Create the `WatchOperation`. It watches the nginx `Deployment` and calls
   `upbound-function-openai` whenever it changes. The function sends the
   current resource state to the LLM along with the `systemPrompt` rule. The
   LLM returns a corrected manifest. Crossplane applies it.

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
   The explicit output instructions in `userPrompt` are necessary for
   `qwen3.5:latest`. With a larger model like `gpt-4o`, the `systemPrompt` can
   contain just the rule itself, without format guidance.
   :::

3. Apply the `WatchOperation`. It fires immediately because the `Deployment`
   already exists:

   ```bash
   kubectl apply -f operations/replicas/operation.yaml
   ```

4. Watch the controller act:

   ```bash
   kubectl get deployment nginx -w
   ```

   Within 60 to 90 seconds, replicas jump from 1 to 3. The LLM read the
   `Deployment`, decided it violated the rule, and patched it. Press Ctrl+C
   when replicas reach 3.

5. Inspect the operation records. Each `Operation` object captures a single
   invocation:

   ```bash
   kubectl get watchoperations
   kubectl get operations
   ```

6. Describe one of the operations:

   ```bash
   kubectl describe operation <name>
   ```

   The `Events` section shows the exact YAML the model returned and what the
   controller applied.

## Watch it heal

The `WatchOperation` re-evaluates on every change. If anything modifies the
`Deployment`, the rule re-applies.

1. Scale nginx down to 1 replica:

   ```bash
   kubectl scale deployment nginx --replicas=1
   ```

2. Watch the controller heal it:

   ```bash
   kubectl get deployment nginx -w
   ```

   Within 30 to 60 seconds, replicas climb back to 3. The `WatchOperation`
   fired because the `Deployment` changed. The LLM saw 1 replica, decided it
   violated the rule, and patched it. Press Ctrl+C when replicas are back at 3.

3. See what fired:

   ```bash
   kubectl get watchoperations
   kubectl get operations
   ```

   Each entry records what fired, what the model decided, and what changed.
   The most recent one captured the scale-down event and the correction.

4. See where the model runs:

   ```bash
   kubectl get secret gpt -n crossplane-system -o yaml
   ```

   `OPENAI_BASE_URL` points to Ollama's OpenAI-compatible API running locally
   on your machine, so no data leaves the machine. Change that URL to
   `https://api.openai.com/v1` and update `OPENAI_MODEL`, and the
   `WatchOperation` works identically.

## Change the rules

To change the policy, edit `systemPrompt` and re-apply. This example raises the
minimum from 3 to 5 replicas.

1. Open `operations/replicas/operation.yaml`. Find the `systemPrompt` and
   change the rule line from:

   ```text
   Rule: if spec.replicas is less than 3, set it to 3. Otherwise keep it unchanged.
   ```

   to:

   ```text
   Rule: if spec.replicas is less than 5, set it to 5. Otherwise keep it unchanged.
   ```

   Or edit in place. On macOS:

   ```bash
   sed -i '' 's/less than 3, set it to 3/less than 5, set it to 5/' \
     operations/replicas/operation.yaml
   ```

   On Linux:

   ```bash
   sed -i 's/less than 3, set it to 3/less than 5, set it to 5/' \
     operations/replicas/operation.yaml
   ```

   :::info
   With `qwen3.5:latest`, keep the full `userPrompt` output instructions in
   place. The explicit YAML template keeps the local model's output reliable.
   With a larger model like `gpt-4o`, you can remove the `userPrompt` entirely
   and keep only the rule in `systemPrompt`.
   :::

2. Apply the updated operation:

   ```bash
   kubectl apply -f operations/replicas/operation.yaml
   ```

3. Trigger the rule by scaling nginx down to 1:

   ```bash
   kubectl scale deployment nginx --replicas=1
   ```

4. Watch the updated rule enforce 5 replicas:

   ```bash
   kubectl get deployment nginx -w
   ```

   This takes 30 to 45 seconds. Press Ctrl+C when you see 5 ready replicas.

5. Inspect the operation history to verify the new rule fired:

   ```bash
   kubectl get watchoperations
   kubectl get operations
   ```

:::tip
Try adding a conditional rule to the `systemPrompt`:

```
If the deployment name contains 'prod', require at least 5 replicas.
Otherwise, require at least 2.
```

The model interprets natural language conditions the same way it interprets
numeric rules. 
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
kind delete cluster --name up-ai-controller
```

## Next steps

In this tutorial, you:

- Created a Crossplane project with a `WatchOperation` and a KCL function
- Deployed a controller that calls a local LLM on every `Deployment` change
- Watched the controller detect and correct a replica count violation
- Updated the enforcement policy by editing a single field in YAML

Continue with:

- [WatchOperations reference][watchops-ref]: triggers, concurrency, history limits, and output handling
- [CronOperations reference][cronops-ref]: schedule-driven operations
- [Composition functions][fn-docs]: build custom logic for any resource
- [Provider authentication][auth-docs]: connect providers to your own cloud account
- [Upbound Marketplace][marketplace]: functions and providers for AWS, Azure, GCP, and more

[up-cli]: /manuals/cli/overview/
[docker-install]: https://docs.docker.com/get-docker/
[kubectl-install]: https://kubernetes.io/docs/tasks/tools/
[kind-install]: https://kind.sigs.k8s.io/docs/user/quick-start/#installation
[ollama-download]: https://ollama.com/download
[up-cli-releases]: https://github.com/upbound/up/releases
[uxp-releases]: /reference/release-notes/uxp
[cronops-ref]: /manuals/uxp/concepts/operations/cron-operation/
[watchops-ref]: /manuals/uxp/concepts/operations/watch-operation/
[fn-docs]: /manuals/uxp/concepts/composition/overview
[auth-docs]: /manuals/packages/providers/authentication/
[marketplace]: https://marketplace.upbound.io/

