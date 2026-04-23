---
title: Build a platform with Upbound
description: Deploy a real app with a cloud database, observe drift detection, enforce policies, and change infrastructure live — all from a single control plane.
weight: {weight}
validation:
  type: walkthrough
  owner: docs@upbound.io
  environment: local-upbound
  timeout: 30m
  variables:
    AWS_ACCESS_KEY_ID: ""
    AWS_SECRET_ACCESS_KEY: ""
---

In this tutorial, you deploy an application with a PostgreSQL database on AWS,
watch Crossplane self-heal a manually changed resource, enforce security policy,
and change live infrastructure — all by updating YAML files.

By the end of this tutorial, you can:

- Deploy a composite resource that creates multiple AWS resources from a single manifest
- Trigger drift detection and watch Crossplane correct an out-of-band change
- Block non-compliant requests with Kyverno before they reach Crossplane
- Update live infrastructure by changing desired state

## Prerequisites

Install the following tools before starting:

- [`kubectl`][kubectl-install]
- [AWS CLI][aws-cli], configured with credentials for an account where you can create resources
- [kind][kind]

### Install the up CLI

Install the `up` CLI via shell script:

```shell
curl -sL "https://cli.upbound.io" | sh
```

If the script fails, download a specific version directly from [GitHub releases][up-cli-releases].

Move the binary into your `PATH`:

```shell
sudo mv up /usr/local/bin/
```

If you don't have `sudo` access, install to a user-local directory instead:

```shell
mkdir -p ~/.local/bin && mv up ~/.local/bin/
```

Then add it to your `PATH` permanently by adding this line to your shell
profile (`~/.bashrc`, `~/.zshrc`, or equivalent):

```shell
export PATH="$HOME/.local/bin:$PATH"
```

## Create the project

### Create the project directory

```bash
mkdir platform-demo
cd platform-demo
```

All commands from this point run from inside the `platform-demo` directory.

### Create the project manifest

The `upbound.yaml` file declares the project and its provider and function
dependencies. `up project run --local` reads this file to determine what
packages to install into the cluster.

```bash
cat > upbound.yaml <<'EOF'
apiVersion: meta.dev.upbound.io/v2alpha1
kind: Project
metadata:
  name: app-w-db
spec:
  apiDependencies:
  - k8s:
      version: v1.33.0
    type: k8s
  dependsOn:
  - apiVersion: pkg.crossplane.io/v1
    kind: Provider
    # provider-family-aws installs shared config and authentication infrastructure.
    package: xpkg.upbound.io/upbound/provider-family-aws
    version: v2.4.0
  - apiVersion: pkg.crossplane.io/v1
    kind: Provider
    # provider-aws-iam manages IAM roles and policies.
    package: xpkg.upbound.io/upbound/provider-aws-iam
    version: v2.4.0
  - apiVersion: pkg.crossplane.io/v1
    kind: Provider
    # provider-aws-rds manages RDS instances and subnet groups.
    package: xpkg.upbound.io/upbound/provider-aws-rds
    version: v2.4.0
  - apiVersion: pkg.crossplane.io/v1
    kind: Provider
    # provider-aws-ec2 manages VPCs and subnets.
    package: xpkg.upbound.io/upbound/provider-aws-ec2
    version: v2.4.0
  - apiVersion: pkg.crossplane.io/v1beta1
    kind: Function
    # function-auto-ready marks composed resources as ready automatically.
    package: xpkg.upbound.io/crossplane-contrib/function-auto-ready
    version: v0.6.1
  description: A Crossplane composition that provisions a web application with a
    managed database (RDS), networking (VPC/Subnets), IAM role, and a Kubernetes Deployment.
  license: Apache-2.0
  maintainer: Upbound User <user@example.com>
EOF
```

### Define the platform APIs

The platform exposes two APIs: `AppWDB` (a basic app with a database) and
`AppWDBSecure` (the same API with an optional security context, used later for
policy enforcement).

Create the API directory and XRD for `AppWDB`:

```bash
mkdir -p apis/appwdb
cat > apis/appwdb/definition.yaml <<'EOF'
apiVersion: apiextensions.crossplane.io/v2
kind: CompositeResourceDefinition
metadata:
  name: appwdbs.demo.upbound.io
spec:
  group: demo.upbound.io
  names:
    categories:
    - crossplane
    kind: AppWDB
    plural: appwdbs
  scope: Namespaced
  versions:
  - name: v1alpha1
    referenceable: true
    schema:
      openAPIV3Schema:
        description: AppWDB is the Schema for the AppWDB API.
        properties:
          spec:
            description: AppWDBSpec defines the desired state of AppWDB.
            type: object
            properties:
              parameters:
                type: object
                description: AppWDB configuration parameters
                properties:
                  replicas:
                    type: integer
                    default: 2
                    description: Number of app replicas
                  dbSize:
                    type: string
                    default: db.t3.micro
                    enum:
                    - db.t3.micro
                    - db.t3.small
                    - db.t3.medium
                    description: RDS instance class
                  region:
                    type: string
                    default: eu-central-1
                    description: AWS region
            required:
            - parameters
          status:
            description: AppWDBStatus defines the observed state of AppWDB.
            type: object
        required:
        - spec
        type: object
    served: true
EOF
```

Create the XRD for `AppWDBSecure`:

```bash
mkdir -p apis/appwdbsecure
cat > apis/appwdbsecure/definition.yaml <<'EOF'
apiVersion: apiextensions.crossplane.io/v2
kind: CompositeResourceDefinition
metadata:
  name: appwdbsecures.demo.upbound.io
spec:
  group: demo.upbound.io
  names:
    categories:
    - crossplane
    kind: AppWDBSecure
    plural: appwdbsecures
  scope: Namespaced
  versions:
  - name: v1alpha1
    referenceable: true
    schema:
      openAPIV3Schema:
        description: AppWDBSecure is the Schema for the AppWDBSecure API.
        properties:
          spec:
            description: AppWDBSecureSpec defines the desired state of AppWDBSecure.
            type: object
            properties:
              parameters:
                type: object
                description: AppWDBSecure configuration parameters
                properties:
                  replicas:
                    type: integer
                    default: 2
                    description: Number of app replicas
                  dbSize:
                    type: string
                    default: db.t3.micro
                    enum:
                    - db.t3.micro
                    - db.t3.small
                    - db.t3.medium
                    description: RDS instance class
                  region:
                    type: string
                    default: eu-central-1
                    description: AWS region
                  securityContext:
                    type: object
                    description: Optional security context for the application container
                    properties:
                      privileged:
                        type: boolean
                        description: Run container as privileged. Blocked by platform policy.
            required:
            - parameters
          status:
            description: AppWDBSecureStatus defines the observed state of AppWDBSecure.
            type: object
        required:
        - spec
        type: object
    served: true
EOF
```

### Create the Compositions

Both APIs share the same composition function, `app-w-dbcompose-resources`,
which is the KCL function you create in the next step.

```bash
cat > apis/appwdb/composition.yaml <<'EOF'
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  labels:
    provider: aws
    type: app-w-db
  name: appwdbs.demo.upbound.io
spec:
  compositeTypeRef:
    apiVersion: demo.upbound.io/v1alpha1
    kind: AppWDB
  mode: Pipeline
  pipeline:
  - step: compose-resources
    functionRef:
      name: app-w-dbcompose-resources
  - step: automatically-detect-ready-composed-resources
    functionRef:
      name: crossplane-contrib-function-auto-ready
EOF

cat > apis/appwdbsecure/composition.yaml <<'EOF'
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  labels:
    provider: aws
    type: app-w-db-secure
  name: appwdbsecures.demo.upbound.io
spec:
  compositeTypeRef:
    apiVersion: demo.upbound.io/v1alpha1
    kind: AppWDBSecure
  mode: Pipeline
  pipeline:
  - step: compose-resources
    functionRef:
      name: app-w-dbcompose-resources
  - step: automatically-detect-ready-composed-resources
    functionRef:
      name: crossplane-contrib-function-auto-ready
EOF
```

### Create the composition function

The composition function is a KCL program that maps the user's 10-line request
to the full set of AWS resources. Create the function directory and package
manifest:

```bash
mkdir -p functions/compose-resources
cat > functions/compose-resources/kcl.mod <<'EOF'
[package]
name = "compose-resources"
version = "0.1.0"
EOF
```

Create the composition logic in `main.k`. This is the entire implementation —
it reads from the composite resource and outputs every managed resource
Crossplane creates:

```bash
cat > functions/compose-resources/main.k <<'EOF'
oxr = option("params").oxr
ocds = option("params").ocds

params = oxr.spec.parameters
appName = oxr.metadata.name
region = params.region or "eu-central-1"
dbSize = params.dbSize or "db.t3.micro"
replicas = params.replicas or 2

_is_deleting = bool(oxr.metadata?.deletionTimestamp)
_db_key = "${appName}-db"
_instance_still_exists = _db_key in ocds

_metadata = lambda name: str -> any {
    {
        namespace: oxr.metadata.namespace
        annotations: {"krm.kcl.dev/composition-resource-name": name}
    }
}

_defaults = {
    managementPolicies: ["*"]
    providerConfigRef: {kind: "ProviderConfig", name: "default"}
}

_subnets = [
    {cidrBlock: "10.0.1.0/24", availabilityZone: "${region}a", suffix: "a"}
    {cidrBlock: "10.0.2.0/24", availabilityZone: "${region}b", suffix: "b"}
    {cidrBlock: "10.0.3.0/24", availabilityZone: "${region}c", suffix: "c"}
]

_sg_items = [{
    apiVersion: "rds.aws.m.upbound.io/v1beta1"
    kind: "SubnetGroup"
    metadata: _metadata("${appName}-subnet-group") | {name: "${appName}-subnet-group"}
    spec: _defaults | {
        forProvider: {
            region: region
            description: "${appName} DB subnet group"
            subnetIdSelector: {matchControllerRef: True}
        }
    }
}] if not _is_deleting or _instance_still_exists else []

_db_items = [{
    apiVersion: "rds.aws.m.upbound.io/v1beta1"
    kind: "Instance"
    metadata: _metadata("${appName}-db") | {
        name: "${appName}-db"
        annotations: {"crossplane.io/external-name": "${appName}-db"}
    }
    spec: _defaults | {
        forProvider: {
            region: region
            identifier: "${appName}-db"
            engine: "postgres"
            engineVersion: "16.6"
            instanceClass: dbSize
            username: "demoadmin"
            dbName: "appdb"
            autoGeneratePassword: True
            passwordSecretRef: {name: "${appName}-db-password", key: "password"}
            applyImmediately: True
            skipFinalSnapshot: True
            allocatedStorage: 20
            storageType: "gp3"
            storageEncrypted: False
            publiclyAccessible: False
            backupRetentionPeriod: 0
            dbSubnetGroupNameSelector: {matchControllerRef: True}
        }
        initProvider: {identifier: "${appName}-db"}
    }
}] if not _is_deleting else []

_items = [
    {
        apiVersion: "ec2.aws.m.upbound.io/v1beta1"
        kind: "VPC"
        metadata: _metadata("${appName}-vpc") | {name: "${appName}-vpc"}
        spec: _defaults | {
            forProvider: {
                region: region
                cidrBlock: "10.0.0.0/16"
                enableDnsHostnames: True
                enableDnsSupport: True
                tags: {"Name": "${appName}-vpc"}
            }
        }
    }
] + [
    {
        apiVersion: "ec2.aws.m.upbound.io/v1beta1"
        kind: "Subnet"
        metadata: _metadata("${appName}-subnet-${s.suffix}") | {name: "${appName}-subnet-${s.suffix}"}
        spec: _defaults | {
            forProvider: {
                region: region
                cidrBlock: s.cidrBlock
                availabilityZone: s.availabilityZone
                vpcIdSelector: {matchControllerRef: True}
                tags: {"Name": "${appName}-subnet-${s.suffix}"}
            }
        }
    } for s in _subnets
] + _sg_items + _db_items + [
    {
        apiVersion: "iam.aws.m.upbound.io/v1beta1"
        kind: "Role"
        metadata: _metadata("${appName}-role") | {name: "${appName}-role"}
        spec: _defaults | {
            forProvider: {
                assumeRolePolicy: '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
            }
        }
    }
    {
        apiVersion: "apps/v1"
        kind: "Deployment"
        metadata: _metadata("${appName}-deployment") | {name: appName}
        spec: {
            replicas: replicas
            selector: {matchLabels: {app: appName}}
            template: {
                metadata: {labels: {app: appName}}
                spec: {
                    containers: [
                        {
                            name: "app"
                            image: "public.ecr.aws/nginx/nginx:stable-alpine"
                            ports: [{containerPort: 80}]
                        } | ({securityContext: {privileged: params.securityContext.privileged}} if params?.securityContext?.privileged != None else {})
                    ]
                }
            }
        }
    }
]

items = _items
EOF
```

### Create the ProviderConfig

The `ProviderConfig` tells the AWS providers where to find credentials. Create
it now — you apply it after providers are healthy.

```bash
mkdir -p setup/config
cat > setup/config/aws-provider-config.yaml <<'EOF'
apiVersion: aws.m.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
  namespace: demo
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: demo
      name: aws-secret
      key: creds
EOF
```

## Configure AWS credentials

The demo creates real AWS resources. You need credentials with permissions to
create VPCs, subnets, IAM roles, and RDS instances.

Export your credentials:

```bash
export AWS_ACCESS_KEY_ID=<your-access-key-id>
export AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
```

## Start the project

Open a dedicated terminal window and run from inside the `platform-demo` directory:

```bash
up project run --local
```

Leave this terminal running for the duration of the tutorial. This command:

- Creates a kind cluster named `up-app-w-db` (the default name for `up project run --local`)
- Installs UXP into the cluster
- Builds and deploys the KCL composition function
- Installs the AWS providers declared in `upbound.yaml`
- Applies the XRDs and Compositions from `apis/`

Startup takes several minutes. Once the command prints output confirming the
cluster is created and providers are installing, open a second terminal,
`cd` into the `platform-demo` directory, and continue with the steps below.

:::warning
`up project run --local` may print `traces export: context deadline exceeded`
in stderr. This is a non-fatal telemetry export error — it does not mean
provisioning failed. Check whether providers were actually installed by running
`kubectl get providers` in the second terminal. If providers appear, continue.

If `up project run --local` exits non-zero AND `kubectl get providers` returns
**No resources found**, provisioning did fail. Run
`kind delete cluster --name up-app-w-db` and restart from this step. Verify
your network allows outbound connections to `xpkg.upbound.io` on port 443.
:::

### Configure kubectl

Once `up project run --local` has created the cluster, point kubectl at it.
Run this in your second terminal from inside the `platform-demo` directory:

```bash
kind get kubeconfig --name up-app-w-db > ~/.kube/config
```

:::warning
This overwrites your existing `~/.kube/config`. To preserve your existing
contexts, use `kind get kubeconfig --name up-app-w-db > ~/.kube/config-upbound`
and then merge: `KUBECONFIG=~/.kube/config:~/.kube/config-upbound kubectl
config view --flatten > ~/.kube/config.merged && mv ~/.kube/config.merged ~/.kube/config`
:::

Verify the connection:

```bash
kubectl get nodes
```

### Apply AWS credentials

1. Create the demo namespace:

   ```bash
   kubectl create namespace demo
   ```

2. Create a Kubernetes secret with your AWS credentials:

   ```bash
   kubectl create secret generic aws-secret \
     -n demo \
     --from-literal=creds="$(printf '[default]\naws_access_key_id = %s\naws_secret_access_key = %s\n' \
       "$AWS_ACCESS_KEY_ID" "$AWS_SECRET_ACCESS_KEY")"
   ```

### Verify the setup

Check that providers are installed and healthy:

```bash
kubectl get providers
```

All providers should show `HEALTHY: True`. Keep running this command until all
show `HEALTHY: True` before continuing.

:::warning
If this command returns **No resources found**, `up project run --local` did
not complete successfully. Check that terminal for errors. An empty list means
provisioning failed, not that it's still in progress. Delete the cluster with
`kind delete cluster --name up-app-w-db` and restart.
:::

Check that the composition function is healthy:

```bash
kubectl get functions
```

The function should show `HEALTHY: True`.

:::warning
If this returns **No resources found**, the KCL function was not built or
deployed. Check the `up project run` terminal and restart.
:::

Verify the APIs are established:

```bash
kubectl get xrds
```

Both XRDs should show `ESTABLISHED: True` before continuing.

:::warning
If this returns **No resources found**, stop here. No subsequent step will
work without the XRDs installed. Return to the `up project run` terminal to
diagnose the failure.
:::

### Apply the ProviderConfig

The `ProviderConfig` CRD is registered by the AWS provider. Apply it only after
providers are healthy:

```bash
kubectl apply -f setup/config/
```

:::info
AWS resource provisioning — especially RDS — takes 5–8 minutes. Each section
of this tutorial is structured so you can keep reading while AWS works.
:::

## Deploy an app with a database

The end-user interface for this platform is a 10-line manifest. A developer
fills in three fields: replica count, database size, and AWS region. The VPC,
subnets, IAM role, and RDS configuration are abstracted away.

```bash
kubectl apply -f - <<'EOF'
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
EOF
```

Check the composite resource status:

```bash
kubectl get appwdb demo-01 -n demo
```

That 10-line manifest creates:

- VPC + 3 subnets (eu-central-1a, b, c)
- RDS subnet group + PostgreSQL instance (gp3 storage)
- IAM role
- Kubernetes `Deployment` scaled to `replicas: 2`

Open the AWS Console and set your region to **eu-central-1**. Check:
- **IAM → Roles** — look for `demo-01-role`
- **VPC → Your VPCs** — look for `demo-01-vpc`
- **RDS → Databases** — watch for `demo-01-db` (takes 5–8 minutes)

Verify the `Deployment` came up:

```bash
kubectl get pods -n demo
```

### Explore the composition

Open `apis/appwdb/definition.yaml`.

This is the XRD — it defines what end users can request. The `dbSize` field is
an enum, not a free-text field. Users can't request a size the platform doesn't
support.

Open `apis/appwdb/composition.yaml`.

This is the Composition — the mapping from those 10 lines to the full set of AWS
resources. It calls the KCL function you created. You can also write Composition
functions in [Go][fn-go], [Python][fn-python], or [Go Templating][fn-go-template],
and mix languages within a single pipeline.

Open `functions/compose-resources/main.k`.

This is the logic layer. It reads `dbSize` and `replicas` from the composite
resource and outputs every managed resource Crossplane creates.

## Drift detection

Crossplane never stops watching. If someone changes a resource directly in AWS,
Crossplane detects the difference between desired state and actual state and
corrects it. This is drift detection.

### Trigger drift

1. Verify the VPC is ready:

   ```bash
   kubectl get vpcs.ec2.aws.m.upbound.io demo-01-vpc
   ```

   Wait until `SYNCED: True`.

2. In the AWS Console, navigate to **VPC → Your VPCs** and find `demo-01-vpc`.

3. Click the **Name** tag and change it to something else — for example,
   `demo-01-vpc-hacked`. Refresh to confirm the change took effect.

4. Tell Crossplane to reconcile immediately instead of waiting for the next loop:

   ```bash
   kubectl annotate vpcs.ec2.aws.m.upbound.io demo-01-vpc \
     reconcile.crossplane.io/trigger="$(date)" \
     --overwrite
   ```

5. Watch the sync status:

   ```bash
   kubectl get vpcs.ec2.aws.m.upbound.io demo-01-vpc -w \
     -o custom-columns='NAME:.metadata.name,SYNCED:.status.conditions[?(@.type=="Synced")].reason'
   ```

6. Switch to the AWS Console and watch the Name tag snap back to `demo-01-vpc`.

### Verify recovery

```bash
kubectl get appwdb demo-01 -n demo
```

`SYNCED: True` confirms the control plane corrected the drift.

## Add policy enforcement

Kyverno is a policy engine that intercepts Kubernetes admission requests before
they're accepted. A policy violation is blocked before Crossplane runs — nothing
reaches AWS.

### Install Kyverno

1. Create the Kyverno add-on manifest:

   ```bash
   mkdir -p w-kyverno
   cat > w-kyverno/addon-kyverno.yaml <<'EOF'
   apiVersion: pkg.upbound.io/v1beta1
   kind: AddOn
   metadata:
     name: upbound-addon-kyverno
   spec:
     package: xpkg.upbound.io/upbound/addon-kyverno:3.7.0
   EOF
   ```

2. Apply it:

   ```bash
   kubectl apply -f w-kyverno/addon-kyverno.yaml
   ```

3. Wait for Kyverno to become healthy (~2 minutes):

   ```bash
   kubectl get addons.pkg.upbound.io upbound-addon-kyverno -w
   ```

   Watch the output. You'll see `INSTALLED: True` appear first, then
   `HEALTHY: True` once the webhook is running (~2–3 minutes). Press Ctrl+C
   once `HEALTHY: True` appears.

   If it stays `HEALTHY: False` after 5 minutes, check
   `kubectl describe addons.pkg.upbound.io upbound-addon-kyverno` for events
   and verify the UXP installation is healthy with `kubectl get pods -n upbound-system`.

4. Create the no-privileged-containers policy:

   ```bash
   cat > w-kyverno/policy-no-privileged.yaml <<'EOF'
   apiVersion: kyverno.io/v1
   kind: ClusterPolicy
   metadata:
     name: disallow-privileged-containers
     annotations:
       policies.kyverno.io/title: Disallow Privileged Containers
       policies.kyverno.io/category: Pod Security
       policies.kyverno.io/severity: high
       policies.kyverno.io/description: >-
         Privileged containers have unrestricted access to the host system.
         This policy blocks any AppWDBSecure request with securityContext.privileged: true
         before Crossplane composes any resources — nothing reaches AWS.
         Applies to all requests — human, GitOps, or AI agent.
   spec:
     validationFailureAction: Enforce
     background: false
     rules:
     - name: no-privileged-platform-api
       match:
         any:
         - resources:
             kinds:
             - AppWDBSecure
       validate:
         message: "Privileged containers are not allowed on this platform. Remove securityContext.privileged: true from your request."
         pattern:
           spec:
             parameters:
               =(securityContext):
                 =(privileged): "false"
     - name: no-privileged-deployment
       match:
         any:
         - resources:
             kinds:
             - Deployment
       validate:
         message: "Privileged containers are not allowed on this platform. Remove securityContext.privileged: true from your request."
         pattern:
           spec:
             template:
               spec:
                 containers:
                 - =(securityContext):
                     =(privileged): "false"
   EOF
   ```

5. Apply the policy:

   ```bash
   kubectl apply -f w-kyverno/policy-no-privileged.yaml
   ```

   You may see this warning:

   ```
   Warning: the kind defined in the all match resource is invalid: unable to convert GVK to GVR for kinds AppWDBSecure, err: resource not found
   ```

   This is expected if the XRDs were recently established and doesn't prevent
   the policy from enforcing once the CRD is ready.

6. Verify the policy is active:

   ```bash
   kubectl get clusterpolicy disallow-privileged-containers
   ```

   Expected output:

   ```
   NAME                             ADMISSION   BACKGROUND   READY   AGE   MESSAGE
   disallow-privileged-containers   true        false        True    ...   Ready
   ```

   `READY: True` means the policy is enforcing. `BACKGROUND: false` is expected
   — this policy operates at admission time only, not as a background scan.

### Block a privileged request

:::warning
Kyverno can only evaluate requests for resource types whose CRDs are already
installed. If you see `no matches for kind "AppWDBSecure"` when running the
next command, the XRDs are not installed. Return to the setup section and
confirm that `kubectl get xrds` shows both XRDs as `ESTABLISHED: True` before
continuing.
:::

1. Try to apply a privileged request:

   ```bash
   kubectl apply -f - <<'EOF'
   apiVersion: demo.upbound.io/v1alpha1
   kind: AppWDBSecure
   metadata:
     name: kyverno-demo-01
     namespace: demo
   spec:
     parameters:
       replicas: 2
       dbSize: db.t3.micro
       region: eu-central-1
       securityContext:
         privileged: true
   EOF
   ```

   The request is blocked immediately by Kyverno. The error references
   `disallow-privileged-containers`. Nothing was created.

   :::info
   `demo-01` — deployed before Kyverno was installed — has a running RDS
   instance right now. This request didn't start at all.
   :::

### Apply a compliant request

1. Apply the compliant request:

   ```bash
   kubectl apply -f - <<'EOF'
   apiVersion: demo.upbound.io/v1alpha1
   kind: AppWDBSecure
   metadata:
     name: kyverno-demo-01
     namespace: demo
   spec:
     parameters:
       replicas: 2
       dbSize: db.t3.micro
       region: eu-central-1
       securityContext:
         privileged: false
   EOF
   ```

   `privileged: false` passes the policy check and starts provisioning. This
   takes approximately 10 minutes.

2. Watch the status:

   ```bash
   kubectl get appwdbsecure -n demo -w
   ```

## Change it live

To change infrastructure, update the desired state. Crossplane figures out what
needs to change and does it.

### Scale the database

1. Apply the change:

   ```bash
   kubectl apply -f - <<'EOF'
   apiVersion: demo.upbound.io/v1alpha1
   kind: AppWDB
   metadata:
     name: demo-01
     namespace: demo
   spec:
     parameters:
       replicas: 2
       dbSize: db.t3.medium
       region: eu-central-1
   EOF
   ```

2. Watch the status. `DESIRED` updates immediately; `ACTUAL` updates once AWS
   finishes (~5 minutes):

   ```bash
   kubectl get instances.rds.aws.m.upbound.io demo-01-db -w \
     -o custom-columns='NAME:.metadata.name,DESIRED:.spec.forProvider.instanceClass,ACTUAL:.status.atProvider.instanceClass,SYNCED:.status.conditions[?(@.type=="Synced")].reason'
   ```

3. In the AWS Console, check the **Status** and **Size** columns for `demo-01-db`.

4. Confirm the change took effect:

   ```bash
   kubectl get appwdb demo-01 -n demo
   ```

   `SYNCED: True` with your updated `dbSize` means the change applied.

## Clean up

Delete the composite resources. Crossplane deletes all composed AWS resources
before removing the composite resource.

```shell
kubectl delete appwdbsecure kyverno-demo-01 -n demo
kubectl delete appwdb demo-01 -n demo
```

RDS deletion takes 5–10 minutes. Wait until both resources are fully removed:

```shell
kubectl get appwdb -n demo -w
```

```shell
kubectl get appwdbsecure -n demo -w
```

Once both are gone, stop `up project run` with Ctrl+C in that terminal, then
delete the cluster:

```shell
kind delete cluster --name up-app-w-db
```

## Next steps

In this tutorial, you:

- Created a Crossplane project with XRDs, Compositions, and a KCL function
- Deployed a composite resource that created a VPC, subnets, IAM role, RDS
  instance, and Kubernetes `Deployment` from a 10-line manifest
- Watched Crossplane detect and correct an out-of-band change to a VPC tag
- Blocked a privileged container request with Kyverno before it reached the cluster
- Updated live infrastructure by changing desired state

Continue with:

- [Composite Resource Definitions][xrd-concept] — design your own platform APIs
- [Composition functions][fn-docs] — write the logic that maps user requests to resources
- [Provider authentication][auth-docs] — connect providers to your own cloud account
- [Upbound Marketplace][marketplace] — providers and add-ons for AWS, Azure, GCP, and more

[kubectl-install]: https://kubernetes.io/docs/tasks/tools/
[up-cli-releases]: https://github.com/upbound/up/releases
[aws-cli]: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
[kind]: https://kind.sigs.k8s.io/docs/user/quick-start/#installation
[fn-go]: /manuals/cli/howtos/compositions/go/
[fn-python]: /manuals/cli/howtos/compositions/python/
[fn-go-template]: /manuals/cli/howtos/compositions/go-template/
[xrd-concept]: /manuals/packages/xrds/
[fn-docs]: /manuals/cli/howtos/compositions/
[auth-docs]: /manuals/packages/providers/authentication/
[marketplace]: https://marketplace.upbound.io/
