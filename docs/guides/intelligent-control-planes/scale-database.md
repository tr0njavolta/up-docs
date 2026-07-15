---
title: Scale resources in an AI-powered control plane
description: Deploy an AI controller that reads live RDS metrics and scales a database automatically.
weight: 2
validation:
  type: walkthrough
  owner: docs@upbound.io
  environment: local-upbound
  timeout: 60m
  variables:
    ANTHROPIC_API_KEY: ""
---

In this tutorial, you deploy an AI controller that manages an AWS RDS database.
A `CronOperation` runs every minute. It reads live CloudWatch metrics from the
database object, calls Claude, and decides whether to scale. If it scales, it
writes its reasoning back to the object as an annotation.

By the end of this tutorial, you can:

- See live CloudWatch metrics surfaced directly on a Crossplane `SQLInstance` object
- Deploy an AI scaling controller with a single `kubectl apply`
- Read the model's reasoning from the Kubernetes object it acted on
- Trigger a load test and watch the AI decide to scale up in real time

## Prerequisites

Install the following tools before starting:

- [`kubectl`][kubectl-install]
- [AWS CLI][aws-cli], configured with credentials that can create VPCs and RDS instances
- [kind][kind]
- An [Anthropic API key][anthropic-console] with access to Claude
- [`up CLI`][up-cli] v0.44.3 or later

<!-- vale Upbound.Spelling = NO -->
The load test later uses `mysqlslap`, which ships with the MySQL client tools.
<!-- vale Upbound.Spelling = YES -->

On macOS:

```shell
brew install mysql-client
export PATH="$(brew --prefix mysql-client)/bin:$PATH"
```

On Linux (Debian/Ubuntu):

```shell
apt-get install -y mysql-client
```

## Clone the project

```bash
git clone https://github.com/upbound/configuration-aws-database-ai demo
cd demo
```

All commands from this point run from inside the `demo` directory.

## Configure credentials

Create a file named `aws-credentials.txt` in the project directory with your
AWS credentials in `INI` format:

```ini
[default]
aws_access_key_id = <your-access-key-id>
aws_secret_access_key = <your-secret-access-key>
```

:::warning
This tutorial uses static AWS credentials for convenience. Don't use static
credentials in production. Use IAM roles, IRSA, or another short-lived
credential mechanism instead. See [AWS authentication][aws-auth-docs] for
secure alternatives.
:::

Export your Anthropic API key. The setup steps below use it to create a
Kubernetes secret:

```bash
export ANTHROPIC_API_KEY=<your-anthropic-api-key>
```

## Start the project

Open a dedicated terminal and run from inside the `demo` directory:

```bash
up project run --local --ingress
```

This command:

- Creates a kind cluster
- Installs UXP
- Builds and deploys the composition functions (`function-rds-metrics` and `function-claude`)
- Installs the AWS providers declared in `upbound.yaml`
- Applies the XRDs from `apis/`
- Installs an ingress controller for the UXP console

Startup takes several minutes. The command exits when the cluster is ready.

:::warning
`up project run --local` may print `traces export: context deadline exceeded`.
This message reports a telemetry timeout and doesn't affect the cluster setup.
:::

Verify the connection:

```bash
kubectl get nodes
```

Enable the alpha operations feature on the Crossplane deployment so that
`CronOperation` and `Operation` resources reconcile:

```bash
kubectl patch deploy crossplane -n crossplane-system --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--enable-operations"}]'
kubectl rollout status deploy/crossplane -n crossplane-system
```

Without this flag, `CronOperation` resources stay unreconciled (no status,
no schedule fires).

Create the namespace and load AWS credentials and the Anthropic API key into
the cluster:

1. Create the `database-team` namespace:

   ```bash
   kubectl apply -f examples/ns-database-team.yaml
   ```

2. Create the AWS credentials secret in both namespaces. The `ProviderConfig`
   and the `function-rds-metrics` function both read from this secret:

   ```bash
   kubectl create secret generic aws-creds \
     --namespace database-team \
     --from-file=credentials=./aws-credentials.txt \
     --dry-run=client -o yaml | kubectl apply -f -

   kubectl create secret generic aws-creds \
     --namespace crossplane-system \
     --from-file=credentials=./aws-credentials.txt \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

3. Create the Anthropic API key secret used by `function-claude`:

   ```bash
   kubectl create secret generic claude \
     --namespace crossplane-system \
     --from-literal=ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

Wait for both AWS providers and both functions to become healthy:

```bash
kubectl get providers
kubectl get functions
```

All four should show `HEALTHY: True` before continuing.

:::warning
If `kubectl get providers` or `kubectl get functions` returns **No resources found**,
`up project run --local` didn't complete. Delete the cluster and restart from
[Start the project](#start-the-project).
:::

Apply the `ProviderConfig`, then the network, then the database:

1. Apply the `ProviderConfig`:

   ```bash
   kubectl apply -f examples/providerconfig-aws-static.yaml
   ```

2. Provision the network:

   ```bash
   kubectl apply -f examples/network-rds-metrics.yaml
   ```

   Wait for the network composite resource to become ready (~5 minutes):

   ```bash
   kubectl get network rds-metrics-database-ai-scale -n database-team -w
   ```

   Press Ctrl+C once it shows `READY: True`.

3. Provision the database:

   ```bash
   kubectl apply -f examples/mariadb-xr-rds-metrics.yaml
   ```

   RDS provisioning takes 10 to 15 minutes. Watch the status:

   ```bash
   kubectl get sqlinstance rds-metrics-database-ai-mysql -n database-team -w
   ```

   Press Ctrl+C once it shows `READY: True` before continuing.

:::info
While you wait, the `function-rds-metrics` composition step is already
collecting CloudWatch data and writing it onto the object. By the time the
database is ready, `status.performanceMetrics` contains live data.
:::

Open the UXP console for a visual view of the resources:

   ```bash
   up uxp web-ui open
   ```

## Review the database

An RDS MariaDB instance is running on AWS, managed by Crossplane. Before
wiring the AI into the loop, explore what the system already knows.

1. List the database object:

   ```bash
   kubectl get sqlinstance -n database-team
   ```

   You should see `rds-metrics-database-ai-mysql` with `READY: True`. That's a
   real AWS RDS instance, managed as a Kubernetes object.

   In the UXP console, click **View all Composite Resources**. The
   `rds-metrics-database-ai-mysql` entry appears in the list. Click
   **Relationship View** to see the resources Crossplane provisioned.

2. Verify the AWS resource. In the [AWS Console, RDS in `us-east-1`][aws-rds],
   find `rds-metrics-database-ai-mysql`.

3. Find the performance metrics:

   ```bash
   kubectl describe sqlinstance rds-metrics-database-ai-mysql -n database-team
   ```

   Find the `status.performanceMetrics` block. This block contains live
   CloudWatch data such as CPU utilization, active connections, and free
   storage. `function-rds-metrics` collects this data and writes it into the
   object. The AI reads only this block and never queries CloudWatch directly.

   Or fetch just the metrics:

   ```bash
   kubectl get sqlinstance rds-metrics-database-ai-mysql -n database-team \
     -o jsonpath='{.status.performanceMetrics}' | jq .
   ```

<!-- vale Upbound.Spelling = NO -->
4. Open `operations/rds-intelligent-scaling-cron/operation.yaml` in your
   editor. That file is the entire scaling controller. The `systemPrompt`
   defines the scaling logic, including thresholds, instance class progression,
   and cooldown.
<!-- vale Upbound.Spelling = YES -->

5. Apply the controller:

   ```bash
   kubectl apply -f operations/rds-intelligent-scaling-cron/operation.yaml
   ```

6. Watch the first decision:

   ```bash
   kubectl get cronoperation
   ```

   The `CronOperation` takes 30 to 45 seconds to start. Once it's running,
   watch for the first operation:

   ```bash
   kubectl get operations -w
   ```

   Wait until an operation shows `SUCCEEDED: True`, then press Ctrl+C and
   describe it:

   ```bash
   kubectl describe operation <name>
   ```

   The `Events` section shows the AI's reasoning and decision.

7. Check the annotation written back to the database object:

   ```bash
   kubectl get sqlinstance rds-metrics-database-ai-mysql -n database-team \
     -o jsonpath='{.metadata.annotations}' | jq .
   ```

   In the UXP console, navigate to `rds-metrics-database-ai-mysql` and open
   the **YAML** tab. The `intelligent-scaling/last-scaled-decision` annotation
   contains the model's last decision.

## Watch the controller idle

The `CronOperation` runs every minute. CPU is low, so watch what the AI decides
when there's nothing to do.

1. Watch operations run:

   ```bash
   kubectl get operations -w
   ```

   A new operation appears every minute. Press Ctrl+C after several have run.
   In the UXP console, select **Operations** in the left navigation to see the
   same list visually.

2. Read one of the decisions:

   ```bash
   kubectl describe operation <name>
   ```
<!-- vale Upbound.Spelling = NO -->
   Look at the `Events` section. At low CPU, the AI decides to hold. The
   cooldown logic is also in the prompt, so it doesn't flip the instance class
   every minute even if usage crosses the thresholds.
<!-- vale Upbound.Spelling = YES -->

3. Look at the current metrics:

   ```bash
   kubectl get sqlinstance rds-metrics-database-ai-mysql -n database-team \
     -o jsonpath='{.status.performanceMetrics}' | jq .
   ```

   The AI reads this same data before making a decision.

4. Confirm the current instance class:

```bash
kubectl get sqlinstance rds-metrics-database-ai-mysql -n database-team \
  -o jsonpath='{.spec.parameters.instanceClass}'
```

It's `db.t3.micro`.

You can also confirm the current instance type in the [AWS Console, RDS in
`us-east-1`][aws-rds].

## Trigger a scale

Run a load test that drives CPU above the scaling threshold so the AI decides
to act.

1. Confirm the starting instance class:

   ```bash
   kubectl get sqlinstance rds-metrics-database-ai-mysql -n database-team \
     -o jsonpath='{.spec.parameters.instanceClass}'
   ```

   It should be `db.t3.micro`.

2. In a second terminal, run the load test from inside the `demo` directory:

   ```bash
   bash perf-scale-demo.sh
   ```

   The script sends CPU-intensive queries to the database for 5 to 10 minutes.
   If it finishes without triggering a scale, run it again.

4. Watch the controller act:

   ```bash
   kubectl get operations -w
   ```

   When CPU crosses the threshold (~60%), the next `CronOperation` decides to
   scale up. Press Ctrl+C once you see a new operation start.

5. Check the new instance class:

   ```bash
   kubectl get sqlinstance rds-metrics-database-ai-mysql -n database-team \
     -o jsonpath='{.spec.parameters.instanceClass}'
   ```

   It should now be `db.t3.small`.

6. Check the reasoning:

   ```bash
   kubectl get sqlinstance rds-metrics-database-ai-mysql -n database-team \
     -o jsonpath='{.metadata.annotations.intelligent-scaling/last-scaled-decision}'
   ```

   In the [AWS Console, RDS in `us-east-1`][aws-rds], refresh the database
   list. The instance class change is in progress, and RDS is modifying the
   live database.

## Clean up

Delete the composite resources. Crossplane deletes all composed AWS resources
(VPC, subnets, RDS instance) before removing the composite resources.

```bash
kubectl delete sqlinstance rds-metrics-database-ai-mysql -n database-team
kubectl delete network rds-metrics-database-ai-scale -n database-team
```

RDS deletion takes 5 to 10 minutes. Wait until the `sqlinstance` is fully removed:

```bash
kubectl get sqlinstance -n database-team -w
```

Once it's gone, delete the `CronOperation` and its history:

```bash
kubectl delete cronoperation rds-intelligent-scaling-cron
kubectl delete operations --all
```

Delete the cluster:

```bash
CLUSTER_NAME=$(kind get clusters | grep "^up-" | head -1)
kind delete cluster --name "${CLUSTER_NAME}"
```

## Next steps

In this tutorial, you:

- Provisioned a real AWS RDS instance managed as a Crossplane `SQLInstance`
- Observed live CloudWatch metrics surfaced directly on the Kubernetes object
- Deployed an AI scaling controller with a single `kubectl apply`
- Read the model's reasoning from the annotation it wrote back to the object
- Ran a load test and watched the AI scale the database automatically

Continue with:

- [CronOperations reference][cronops-ref]: schedules, history limits, concurrency
- [WatchOperations reference][watchops-ref]: event-driven operations
- [Composition functions][fn-docs]: build custom logic for any resource
- [Provider authentication][auth-docs]: connect providers to your own cloud account
- [Upbound Marketplace][marketplace]: providers and functions for AWS, Azure, GCP, and more

[up-cli]: /controlplanes/cli/overview/
[kubectl-install]: https://kubernetes.io/docs/tasks/tools/
[aws-cli]: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
[kind]: https://kind.sigs.k8s.io/docs/user/quick-start/#installation
[anthropic-console]: https://console.anthropic.com/
[aws-rds]: https://us-east-1.console.aws.amazon.com/rds/home?region=us-east-1#databases:
[cronops-ref]: /controlplanes/uxp/concepts/operations/cron-operation/
[watchops-ref]: /controlplanes/uxp/concepts/operations/watch-operation/
[fn-docs]: /controlplanes/uxp/concepts/composition/overview
[auth-docs]: /controlplanes/packages/providers/authentication/
[aws-auth-docs]: /controlplanes/packages/providers/authentication/#aws-authentication
[marketplace]: https://marketplace.upbound.io/
