---
title: Use the Secrets Proxy
description: "Learn how to configure the Secrets Proxy to access secrets from an external Vault secret store"
sidebar_position: 50
plan: standard
---

<Standard />

:::important
This feature is in Alpha and requires UXP `v2.2`. Secrets proxy should not be used in production environments without testing.
:::


The Secrets Proxy lets Crossplane providers read and write secrets directly
to HashiCorp Vault instead of storing them as Kubernetes Secrets. Providers
use the standard Kubernetes Secret API. The Secrets Proxy intercepts those calls and
routes them to Vault transparently.

## Prerequisites

Before you begin, ensure you have:

* [kubectl](https://kubernetes.io/docs/tasks/tools/) installed
* [Helm](https://helm.sh/docs/intro/install/) installed
* The [Vault CLI](https://developer.hashicorp.com/vault/docs/install) installed
* The `up` CLI installed
* A UXP cluster running version v2.2.0-up.3 or later and a Standard license
* A HashiCorp Vault instance reachable from your cluster, with Kubernetes auth enabled

<!-- vale Google.Headings = NO -->
## Enable the Secrets Proxy
<!-- vale Google.Headings = YES -->

Enable the Secrets Proxy on your UXP installation:

```shell
helm repo add upbound-stable https://charts.upbound.io/stable && helm repo update
```

```shell
helm install crossplane \
  --namespace crossplane-system \
  --create-namespace \
  upbound-stable/crossplane \
  --devel \
  --set upbound.secretsProxy.enabled=true
```

```shell
kubectl get pods -n crossplane-system -w
```

## Configure Vault

Store the AWS credentials that the provider reads. The Secrets Proxy serves
these to providers as if they were a Kubernetes Secret, using the `ini` format
expected by the AWS provider family:

```shell
vault kv put secret/crossplane-system/aws-official-creds credentials="
[default]
aws_access_key_id = <AWS_ACCESS_KEY_ID>
aws_secret_access_key = <AWS_SECRET_ACCESS_KEY>
"
```

Create a policy granting read access to secrets in `crossplane-system`:

```shell
vault policy write crossplane- <<'EOF'
path "secret/*" {
    capabilities = ["create", "read", "update", "delete", "list"]
}
path "secret/metadata/*" {
    capabilities = ["create", "read", "update", "delete", "list"]
}
EOF
```
Allow the `secret-store-vault` service account in `crossplane-system` to use the
new `crossplane` policy you just created:

```shell
vault write auth/kubernetes/role/crossplane \
    bound_service_account_names="secret-store-vault" \
    bound_service_account_namespaces=crossplane-system \
    policies=crossplane\
    ttl=24h
```

<!-- vale Google.Headings = NO -->
## Install the Secret Store add-on

Apply the add-on to deploy the Secrets Proxy backend:

:::note
You must have a valid UXP license to install this add-on package.
:::
```yaml title=addon.yaml
apiVersion: pkg.upbound.io/v1beta1
kind: AddOn
metadata:
  name: secret-store-vault
spec:
  package: xpkg.upbound.io/upbound/secret-store-vault-addon:v0.1.1
```

```shell
kubectl apply -f addon.yaml
```

Next, you need to configure authentication for your Vault. Because HashiCorp
Vault offers several options for authentication, Upbound recommends following
your organization's current method for this Secrets Proxy. For more information,
review HashiCorp's [Vault authentication documentation][vault-auth].

Once the add-on is ready, create a `StoreConfig` pointing to your Vault
instance:

```yaml
apiVersion: vault.secrets.upbound.io/v1alpha1
kind: StoreConfig
metadata:
  name: vault
spec:
  address: http://vault.vault-system.svc.cluster.local:8200
  mountPath: secret
  kvVersion: KVv2
  auth:
    method: kubernetes
    kubernetes:
      role: crossplane
```

```shell
kubectl apply -f storeconfig.yaml
kubectl get storeconfigs
```

For more information, visit the [Upbound Marketplace][marketplace] for this
add-on.

## Configure the webhook

Apply the webhook configuration to inject the Secrets Proxy sidecar into
Crossplane and provider pods. The webhook restarts all matching pods on apply:

```yaml
apiVersion: secretsproxy.upbound.io/v1alpha1
kind: WebhookConfig
metadata:
  name: crossplane-app
spec:
  objectSelector:
    matchLabels:
      app: crossplane
---
apiVersion: secretsproxy.upbound.io/v1alpha1
kind: WebhookConfig
metadata:
  name: crossplane-provider
spec:
  objectSelector:
    matchExpressions:
      - key: pkg.crossplane.io/provider
        operator: Exists
```

```shell
kubectl apply -f webhookconfig.yaml
```

## Install providers and functions

1. Install the AWS provider family and IAM provider. Provider pods start with
   the Secrets Proxy sidecar injected because the webhook matches the
   `pkg.crossplane.io/provider` label. Create a new file called `provider.yaml`
   and paste the following configuration:

    ```yaml title=provider.yaml
    apiVersion: pkg.crossplane.io/v1
    kind: Provider
    metadata:
      name: upbound-provider-aws-iam
    spec:
      package: xpkg.upbound.io/upbound/provider-aws-iam:v2.2.0
    ---
    apiVersion: pkg.crossplane.io/v1
    kind: Provider
    metadata:
      name: upbound-provider-family-aws
    spec:
      package: xpkg.upbound.io/upbound/provider-family-aws:v2.2.0
    ```

    ```shell
    kubectl apply -f provider.yaml
    ```

2. Install the pipeline functions. Create a new file called `functions.yaml` and
   paste the following configuration:

    ```yaml title=functions.yaml
    apiVersion: pkg.crossplane.io/v1
    kind: Function
    metadata:
      name: function-go-templating
    spec:
      package: xpkg.crossplane.io/crossplane-contrib/function-go-templating:v0.11.2
    ---
    apiVersion: pkg.crossplane.io/v1
    kind: Function
    metadata:
      name: function-auto-ready
    spec:
      package: xpkg.crossplane.io/crossplane-contrib/function-auto-ready:v0.6.0
    ```

    ```shell
    kubectl apply -f functions.yaml
    ```

<!-- vale write-good.Passive = NO -->
3. Wait for providers and functions to become healthy, then create the provider
   config. The `aws-official-creds` secret lives in Vault. The Secrets Proxy
   intercepts the Secret API call and serves it transparently. Create a new file
   called `provider-config.yaml` and paste the following configuration:
<!-- vale write-good.Passive = YES -->

    ```yaml title=provider-config.yaml
    apiVersion: aws.m.upbound.io/v1beta1
    kind: ClusterProviderConfig
    metadata:
      name: default
      namespace: crossplane-system
    spec:
      credentials:
        secretRef:
          key: credentials
          name: aws-official-creds
          namespace: crossplane-system
        source: Secret
    ```

    ```shell
    kubectl apply -f provider-config.yaml
    ```

## Deploy the composition

Apply the `UserAccessKey` XRD and composition. This composition creates an IAM
user and two access keys, writing connection details back to Vault through the
Secrets Proxy. Create a new file called `comp.yaml` and paste the following
configuration:

```yaml title=comp.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: useraccesskeys-go-templating
spec:
  compositeTypeRef:
    apiVersion: example.org/v1alpha1
    kind: UserAccessKey
  mode: Pipeline
  pipeline:
  - step: render-templates
    functionRef:
      name: function-go-templating
    input:
      apiVersion: gotemplating.fn.crossplane.io/v1beta1
      kind: GoTemplate
      source: Inline
      inline:
        template: |
          ---
          apiVersion: iam.aws.m.upbound.io/v1beta1
          kind: User
          metadata:
            annotations:
              {{ setResourceNameAnnotation "user" }}
          spec:
            forProvider: {}
          ---
          apiVersion: iam.aws.m.upbound.io/v1beta1
          kind: AccessKey
          metadata:
            annotations:
              {{ setResourceNameAnnotation "accesskey-0" }}
          spec:
            forProvider:
              userSelector:
                matchControllerRef: true
            writeConnectionSecretToRef:
              name: {{ $.observed.composite.resource.metadata.name }}-accesskey-secret-0
          ---
          apiVersion: iam.aws.m.upbound.io/v1beta1
          kind: AccessKey
          metadata:
            annotations:
              {{ setResourceNameAnnotation "accesskey-1" }}
          spec:
            forProvider:
              userSelector:
                matchControllerRef: true
            writeConnectionSecretToRef:
              name: {{ $.observed.composite.resource.metadata.name }}-accesskey-secret-1
          ---
          apiVersion: v1
          kind: Secret
          metadata:
            name: {{ dig "spec" "writeConnectionSecretToRef" "name" "" $.observed.composite.resource}}
            annotations:
              {{ setResourceNameAnnotation "connection-secret" }}
          {{ if eq $.observed.resources nil }}
          data: {}
          {{ else }}
          data:
            user-0: {{ ( index $.observed.resources "accesskey-0" ).connectionDetails.username }}
            user-1: {{ ( index $.observed.resources "accesskey-1" ).connectionDetails.username }}
            password-0: {{ ( index $.observed.resources "accesskey-0" ).connectionDetails.password }}
            password-1: {{ ( index $.observed.resources "accesskey-1" ).connectionDetails.password }}
          {{ end }}
  - step: ready
    functionRef:
      name: function-auto-ready
---
apiVersion: apiextensions.crossplane.io/v2
kind: CompositeResourceDefinition
metadata:
  name: useraccesskeys.example.org
spec:
  group: example.org
  names:
    kind: UserAccessKey
    plural: useraccesskeys
  scope: Namespaced
  versions:
  - name: v1alpha1
    served: true
    referenceable: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              writeConnectionSecretToRef:
                type: object
                properties:
                  name:
                    type: string
```

```shell
kubectl apply -f comp.yaml
```

## Create the composite resource

1. Create a file called `xr.yaml` paste the following configuration. Replace `<put-your-initials>` with your initials in both
   the `metadata.name` and `spec.writeConnectionSecretToRef.name` fields:

    ```yaml xr.yaml
    apiVersion: example.org/v1alpha1
    kind: UserAccessKey
    metadata:
      namespace: default
      name: <your-initials>-keys
    spec:
      writeConnectionSecretToRef:
        name: <your-initials>-keys-connection-details
    ```

2. Apply the resource and verify reconciliation:

    ```shell
    kubectl apply -f xr.yaml
    kubectl get managed
    kubectl get composite
    ```

    Connection details are stored in Vault, not in Kubernetes. Confirm no new
    secrets were created:

    ```shell
    kubectl get secret
    ```

## Clean up

Delete the composite resource. The garbage collector automatically removes the
associated secrets from Vault:

```shell
kubectl delete -f xr.yaml
```
[vault-auth]: https://developer.hashicorp.com/vault/docs/auth
[marketplace]: https://marketplace.upbound.io/addons/upbound/secret-store-vault-addon/latest
