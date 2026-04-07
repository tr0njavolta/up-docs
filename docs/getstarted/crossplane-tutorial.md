---
title: Build a platform with Crossplane and Upbound
description: Deploy a real app with a cloud database, observe drift detection, enforce policies, and change infrastructure live — all from a single control plane.
weight: {weight}
---
import Version from "@site/src/components/Version.js"
import { versions } from "@site/src/components/Version.js"
import CodeBlock from '@theme/CodeBlock';


In this tutorial, you'll deploy an application with a PostgreSQL database on
AWS, watch Crossplane self-heal a manually changed resource, enforce security
policy, and
change live infrastructure — all by updating YAML files.

By the end of this tutorial, you'll be able to:

- Deploy a composite resource that creates multiple AWS resources from a single manifest
- Trigger drift detection and watch Crossplane correct an out-of-band change
- Block non-compliant requests using Kyverno before they reach Crossplane
- Update live infrastructure by changing desired state

## Prerequisites

Install the following:

- [`kubectl`][kubectl-install]
- [AWS CLI][aws-cli], configured with credentials for an account you can create
  resources in
- [kind][kind]

### Download the `up` CLI

The Upbound `up` command-line enables interaction with Upbound control planes.

Install the `up` command-line via shell, Homebrew or Linux package.

<Tabs>
<TabItem value="Shell" label="Shell">
Install the latest version of the `up` command-line via shell script by
downloading the install script from [Upbound][upbound].

:::tip
Shell install is the preferred method for installing the `up` command-line.
:::

The shell install script automatically determines the operating system and
platform architecture and installs the correct binary.

```shell
curl -sL "https://cli.upbound.io" | sh
```

:::note
Install a specific version of `up` by providing the version.
For example, to install version <Version type="cli" /> use the following command:

<CodeBlock language="bash">
{`curl -sL "https://cli.upbound.io" | VERSION=v${versions.cli} sh`}
</CodeBlock>

Find the full list of versions in the <a href="https://cli.upbound.io/stable?prefix=stable/">Up command-line repository</a>.
:::

</TabItem>

<TabItem value="Windows" label="Windows">
Upbound provides a Windows executable.

<CodeBlock language="bash">
{`curl.exe -sLo up.exe "https://cli.upbound.io/stable/v${versions.cli}/bin/windows_amd64/up.exe"`}
</CodeBlock>

Find the full list of Windows versions in the [Up command-line
repository][win-versions].


</TabItem>

<TabItem value="Homebrew" label="Homebrew">
[Homebrew][homebrew] is a package manager for Linux and Mac OS.

Install the `up` command-line with a Homebrew `tap` using the command:

```shell
brew install upbound/tap/up
```
</TabItem>
<TabItem value="LinuxPackages" label="LinuxPackages">

Upbound provides both `.deb` and `.rpm` packages for Linux platforms.

Downloading packages requires both the [version][version] and CPU architecture
(`linux_amd64`, `linux_arm`, `linux_arm64`).

#### Debian package install

<CodeBlock language="bash">
{`curl -sLo up.deb "https://cli.upbound.io/stable/v${versions.cli}/deb/up_${versions.cli}_linux_\${ARCH}.deb"`}
</CodeBlock>

<!-- vale Microsoft.HeadingAcronyms = NO -->
#### RPM package install

<CodeBlock language="bash">
{`curl -sLo up.rpm "https://cli.upbound.io/stable/v${versions.cli}/rpm/up_${versions.cli}_linux_\${ARCH}.rpm"`}
</CodeBlock>

</TabItem>
</Tabs>

The `up` CLI allows you to interact with your control plane.

### Clone the demo repository

```bash
git clone https://github.com/tr0njavolta/platform-demo
cd platform-demo
```

All file paths in this tutorial are relative to the root of that repository.

### Set up a control plane

You need a Kubernetes cluster with Upbound Crossplane (UXP) installed and connected
to the Upbound Console.

1. Create a cluster. This tutorial uses `kind` to create a local cluster:

   ```bash
   kind create cluster --name upbound-demo
   ```

   Create a namespace for the demo:

   ```shell
    kubectl create namespace demo
   ```

2. Install UXP:

   ```bash
   up uxp install
   ```

3. Connect the cluster to the Upbound Console by following the
   [connect a control plane][connect-ctp] guide.

### Install the AWS providers

The demo uses three AWS providers: EC2, RDS, and IAM. The required packages and
versions are declared in `upbound.yaml`. Install them directly:

1. Apply the provider packages:

   ```bash
   kubectl apply -f - <<'EOF'
   apiVersion: pkg.crossplane.io/v1
   kind: Provider
   metadata:
     name: provider-family-aws
   spec:
     package: xpkg.upbound.io/upbound/provider-family-aws:v2.4.0
   ---
   apiVersion: pkg.crossplane.io/v1
   kind: Provider
   metadata:
     name: provider-aws-iam
   spec:
     package: xpkg.upbound.io/upbound/provider-aws-iam:v2.4.0
   ---
   apiVersion: pkg.crossplane.io/v1
   kind: Provider
   metadata:
     name: provider-aws-rds
   spec:
     package: xpkg.upbound.io/upbound/provider-aws-rds:v2.4.0
   ---
   apiVersion: pkg.crossplane.io/v1
   kind: Provider
   metadata:
     name: provider-aws-ec2
   spec:
     package: xpkg.upbound.io/upbound/provider-aws-ec2:v2.4.0
   ---
   apiVersion: pkg.crossplane.io/v1beta1
   kind: Function
   metadata:
     name: function-auto-ready
   spec:
     package: xpkg.upbound.io/crossplane-contrib/function-auto-ready:v0.6.1
   EOF
   ```

2. Wait for all providers to become healthy:

   ```bash
   kubectl get providers
   ```

   All providers should show `HEALTHY: True` before continuing.

### Configure AWS credentials

1. Create a Kubernetes secret with your AWS credentials:

   ```bash
   kubectl create secret generic aws-secret \
     -n demo \
     --from-literal=creds="$(printf '[default]\naws_access_key_id = %s\naws_secret_access_key = %s\n' \
       "$AWS_ACCESS_KEY_ID" "$AWS_SECRET_ACCESS_KEY")"
   ```

2. Apply the `ProviderConfig` that references those credentials:

   ```bash
   kubectl apply -f setup/config/
   ```

3. Verify the `ProviderConfig` is present:

   ```bash
   kubectl get providerconfigs.aws.m.upbound.io default -n demo
   ```

### Install the platform APIs

Apply the XRDs and Compositions from the demo repository:

```bash
kubectl apply -f apis/
```

Verify the APIs are established:

```bash
kubectl get xrd
```

All XRDs should show `ESTABLISHED: True`.

:::info
AWS resource provisioning — especially RDS — takes 5–8 minutes. Each part of this
tutorial is structured so you can keep reading while AWS works.
:::

## Deploy an app with a database


Open `examples/appwdb/example.yaml`:

```yaml
apiVersion: demo.upbound.io/v1alpha1
kind: AppWDB
metadata:
  name: demo-01
  namespace: demo
spec:
  parameters:
    replicas: 2
    dbSize: db.t3.micro
    region: eu-central-1
```

This is the entire end-user interface. A developer fills in three fields: replica
count, database size, and AWS region. They don't see the VPC, subnets, IAM role,
or RDS configuration behind it.

### Deploy it

1. Apply the manifest:

   ```bash
   kubectl apply -f examples/appwdb/example.yaml
   ```

2. In the Upbound Console, click **View all Composite Resources**. You should see
   `demo-01` listed with Crossplane actively reconciling it.

That 10-line file expands into:

- VPC + 3 subnets (eu-central-1a, b, c)
- RDS subnet group + PostgreSQL instance (gp3 storage)
- IAM role
- Kubernetes `Deployment` scaled to `replicas: 2`

3. Open the AWS Console and set your region to **eu-central-1**. Check:

   - [IAM Roles](https://us-east-1.console.aws.amazon.com/iam/home#/roles) — look for `demo-01-role`
   - [VPCs](https://eu-central-1.console.aws.amazon.com/vpcconsole/home#vpcs:) — look for `demo-01-vpc`
   - [RDS Databases](https://eu-central-1.console.aws.amazon.com/rds/home#databases:) — watch for `demo-01-db` (takes 5–8 minutes)


4. Open `apis/appwdb/definition.yaml`.

   This is the XRD — it defines what end users can request. Notice `dbSize` is an enum,
   not a free-text field. Users can't request a size the platform doesn't support.

5. Open `apis/appwdb/composition.yaml`.

   This is the Composition — the mapping from those 10 lines to the full set of AWS
   resources. It calls a function written in KCL. You can also write Composition
   functions in [Go][fn-go], [Python][fn-python], or [Go Templating][fn-go-template],
   and mix languages within a single pipeline.

6. Open `functions/compose-resources/main.k`.

   This is the logic layer. It reads `dbSize` and `replicas` from the composite
   resource and outputs every managed resource Crossplane will create.


7. Check the composite resource status:

   ```bash
   kubectl get appwdb demo-01 -n demo
   ```

8. Verify the `Deployment` came up (faster than RDS, since it's just a container):

   ```bash
   kubectl get pods -n demo
   ```

9. Describe a pod to confirm it's running. Replace `<pod-name>` with the name from
   the previous output:

   ```bash
   kubectl describe pod <pod-name> -n demo
   ```

10. In the Upbound Console, click into `demo-01` and open the **relationship view**
    to see the full resource tree and sync status for each composed resource.

    :::info
    `demo-01-db` takes a few minutes to reach `SYNCED: True`. Continue to the
    next section 
    while AWS finishes provisioning.
    :::

## Providers and ProviderConfigs

**Providers** are Kubernetes controllers that know how to create, update, and delete
resources in a specific cloud service — EC2, RDS, IAM, and so on. In Crossplane 2.0,
the Kubernetes `Deployment` is managed natively without a separate provider.

**ProviderConfigs** tell those providers how to authenticate. The tutorial uses static
credentials, but production deployments can use OIDC, IRSA, Workload Identity, and
other methods depending on the provider. See [provider authentication][auth-docs].

### Verify the providers

```bash
kubectl get providers
kubectl get providerconfigs.aws.m.upbound.io default -n demo
```

All providers should be `HEALTHY: True`. The `default` ProviderConfig is what connects
them to the AWS account where `demo-01-db` is provisioning.

In the Upbound Console, navigate to `demo-01` and open the **relationship view**. You'll
see all composed resources — VPC, subnets, RDS instance, IAM role, and `Deployment` —
with their sync status and how they connect.

## Drift detection

Crossplane never stops watching. If someone changes a resource directly in AWS, Crossplane
detects the difference between desired state and actual state and corrects it. This is
**drift detection**.

### Confirm the VPC is ready

1. Verify the VPC is running:

   ```bash
   kubectl get vpcs.ec2.aws.m.upbound.io demo-01-vpc -n demo
   ```

   Wait until `SYNCED: True`.

2. In the AWS Console, navigate to **VPC → Your VPCs** and find `demo-01-vpc`.

3. Click the **Name** tag and change it to something else — for example,
   `demo-01-vpc-hacked`. Refresh to confirm the change took effect.

4. Tell Crossplane to reconcile immediately instead of waiting for the next loop:

   ```bash
   kubectl annotate vpcs.ec2.aws.m.upbound.io demo-01-vpc -n demo \
     reconcile.crossplane.io/trigger="$(date)" \
     --overwrite
   ```

5. Watch the sync status:

   ```bash
   kubectl get vpcs.ec2.aws.m.upbound.io demo-01-vpc -n demo -w \
     -o custom-columns='NAME:.metadata.name,SYNCED:.status.conditions[?(@.type=="Synced")].reason'
   ```

6. Switch to the AWS Console and watch the Name tag snap back to `demo-01-vpc`.

7. Verify the reconciliation:

   ```bash
   kubectl get appwdb demo-01 -n demo
   ```

   `SYNCED: True` confirms the control plane corrected the drift.

## Add policy enforcement

**Kyverno** is a policy engine that intercepts Kubernetes admission requests before
they're accepted. A policy violation is blocked before Crossplane runs — nothing
reaches AWS.


1. Apply the Kyverno add-on from the Upbound Marketplace:

   ```bash
   kubectl apply -f w-kyverno/addon-kyverno.yaml
   ```

2. In the Upbound Console, select **AddOns** in the left navigation. Wait for
   `upbound-addon-kyverno` to become healthy (~2 minutes).


3. Apply the policy:

   ```bash
   kubectl apply -f w-kyverno/policy-no-privileged.yaml
   kubectl get clusterpolicy
   ```

   `READY: True` means the policy is active. `disallow-privileged-containers` rejects
   any `AppWDBSecure` request where `securityContext.privileged` is `true` — at
   admission time, before Crossplane sees it.


4. Next, trigger a policy violation. Open `examples/appwdbsecure/example-1.yaml`. It has `securityContext.privileged: true`.

5. Try to apply it:

   ```bash
   kubectl apply -f examples/appwdbsecure/example-1.yaml
   ```

   The request is blocked immediately. The error message tells you exactly which policy
   caught it. Nothing was created.

   :::info
   `demo-01` — deployed before Kyverno was installed — has a running RDS instance
   right now. This request didn't start at all.
   :::

6. Apply the compliant request:

   ```bash
   kubectl apply -f examples/appwdbsecure/example-2.yaml
   kubectl get appwdbsecure -n demo -w
   ```

   `privileged: false` passes the policy check and starts provisioning. This takes
   ~10 minutes.

7. Verify the policy enforcement:

   ```bash
   kubectl get clusterpolicy disallow-privileged-containers
   ```

   `READY: True` confirms the policy is enforcing.

## Change it live

To change infrastructure, update the desired state. Crossplane figures out what needs
to change and does it.


Scale the database

1. Apply the change:

   ```bash
   kubectl apply -f examples/appwdb/variant-bigger-db.yaml
   ```

2. Watch the status. `DESIRED` updates immediately; `ACTUAL` updates once AWS finishes
   (~5 minutes):

   ```bash
   kubectl get instance.rds.aws.m.upbound.io demo-01-db -n demo -w \
     -o custom-columns='NAME:.metadata.name,DESIRED:.spec.forProvider.instanceClass,ACTUAL:.status.atProvider.instanceClass,SYNCED:.status.conditions[?(@.type=="Synced")].reason'
   ```

3. In the AWS Console, check the **Status** and **Size** columns for `demo-01-db`.

4. In the Upbound Console, navigate to `demo-01` and open the **relationship view**
   to see the updated resource tree.

5. Confirm the change took effect:

   ```bash
   kubectl get appwdb demo-01 -n demo
   ```

   `SYNCED: True` with your updated `dbSize` or `replicas` means you're done.

## Clean up

Delete the composite resources. Crossplane deletes all composed AWS resources
(RDS instance, VPC, subnets, IAM role) before the composite resource is removed.

```shell
kubectl delete appwdbsecure kyverno-demo-01 -n demo
kubectl delete appwdb demo-01 -n demo
```

RDS deletion takes 5–10 minutes. Wait until both resources are fully removed before
deleting the cluster:

```shell
kubectl get appwdb,appwdbsecure -n demo -w
```

Once both are gone, delete the kind cluster:

```shell
kind delete cluster --name upbound-demo
```

## Next steps

In this tutorial, you:

- Deployed a composite resource that created a VPC, subnets, IAM role, RDS instance,
  and Kubernetes `Deployment` from a 10-line manifest
- Watched Crossplane detect and correct an out-of-band change to a VPC tag
- Blocked a privileged container request with Kyverno before it reached the cluster
- Updated live infrastructure by changing a field in desired state


- [Composite Resource Definitions][xrd-concept] — design your own platform APIs
- [Composition functions][fn-docs] — write the logic that maps user requests to resources
- [Provider authentication][auth-docs] — connect providers to your own cloud account
- [Upbound Marketplace][marketplace] — providers and add-ons for AWS, Azure, GCP, and more

[kubectl-install]: https://kubernetes.io/docs/tasks/tools/
[up-cli]: /manuals/cli/overview
[aws-cli]: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
[connect-ctp]: {link-to-connect-control-plane-guide}
[fn-go]: /manuals/cli/howtos/compositions/go/
[fn-python]: /manuals/cli/howtos/compositions/python/
[fn-go-template]: /manuals/cli/howtos/compositions/go-template/
[xrd-concept]: /manuals/packages/xrds/
[fn-docs]: /manuals/cli/howtos/compositions/
[auth-docs]: /manuals/packages/providers/authentication/
[marketplace]: https://marketplace.upbound.io/
