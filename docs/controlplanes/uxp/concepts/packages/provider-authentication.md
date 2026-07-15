---
title: Official Cloud Provider Authentication
sidebar_position: 5
description: Authenticate with AWS, GCP, or Azure Official Providers 
---


Providers use varying methods to authenticate with their external services. AWS,
GCP, and Azure have several options for authentication.

<!-- vale Google.Headings = NO -->
## AWS
<!-- vale Google.Headings = YES -->

For more detailed instructions or alternate authentication methods, visit the
[provider documentation][provider-documentation].


Using AWS access keys, or long-term IAM credentials, requires storing the AWS
keys as a Kubernetes secret.

To create the Kubernetes secret create or
[download your AWS access key][download-your-aws-access-key]
ID and secret access key.

The format of the text file is
```ini
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Create a Kubernetes secret
Create the Kubernetes secret with
<Hover label="kubesecret" line="1">kubectl create secret generic</Hover>.

<!-- vale Google.FirstPerson = NO -->
For example, name the secret
<Hover label="kubesecret" line="2">aws-secret</Hover> in the
<Hover label="kubesecret" line="3">crossplane-system</Hover> namespace
and import the text file with the credentials
<Hover label="kubesecret" line="4">aws-credentials.txt</Hover> and
assign them to the secret key
<Hover label="kubesecret" line="4">my-aws-secret</Hover>.
<!-- vale Google.FirstPerson = YES -->

<div id="kubesecret">
```shell
kubectl create secret generic \
aws-secret \
-n crossplane-system \
--from-file=my-aws-secret=./aws-credentials.txt
```
</div>

To create a secret declaratively requires encoding the authentication keys as a
base-64 string.

<!-- vale Google.FirstPerson = NO -->
Create a <Hover label="decSec" line="2">Secret</Hover> object with
the <Hover label="decSec" line="7">data</Hover> containing the secret
key name, <Hover label="decSec" line="8">my-aws-secret</Hover> and the
base-64 encoded keys.
<!-- vale Google.FirstPerson = YES -->

<div id="decSec">
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aws-secret
  namespace: crossplane-system
type: Opaque
data:
  my-aws-secret: W2RlZmF1bHRdCmF3c19hY2Nlc3Nfa2V5X2lkID0gQUtJQUlPU0ZPRE5ON0VYQU1QTEUKYXdzX3NlY3JldF9hY2Nlc3Nfa2V5ID0gd0phbHJYVXRuRkVNSS9LN01ERU5HL2JQeFJmaUNZRVhBTVBMRUtFWQ==
```
</div>


### Create a ProviderConfig

Create a
<Hover label="pc-keys" line="2">ProviderConfig</Hover> to set the
provider authentication method to
<Hover label="pc-keys" line="7">Secret</Hover>.

Create a <Hover label="pc-keys" line="8">secretRef</Hover> with the
<Hover label="pc-keys" line="9">namespace</Hover>,
<Hover label="pc-keys" line="10">name</Hover> and
<Hover label="pc-keys" line="11">key</Hover> of the secret.

:::tip
To apply key based authentication by default name the ProviderConfig
<Hover label="pc-keys" line="4">default</Hover>.
:::

<div id="pc-keys">
```yaml
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-secret
      key: my-aws-secret
```
</div>

To selectively apply key based authentication name the ProviderConfig and apply
it when creating managed resources.

For example, creating an ProviderConfig named
<Hover label="pc-keys2" line="4">key-based-providerconfig</Hover>.

<div id="pc-keys2">
```yaml
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: key-based-providerconfig
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-secret
      key: my-aws-secret
```
</div>

Apply the ProviderConfig to a
managed resource with a
<Hover label="mr-keys" line="8">providerConfigRef</Hover>.

<div id="mr-keys">
```yaml
apiVersion: s3.aws.upbound.io/v1beta1
kind: Bucket
metadata:
  name: my-s3-bucket
spec:
  forProvider:
    region: us-east-2
  providerConfigRef:
    name: key-based-providerconfig
```
</div>

## Azure


For more detailed instructions or alternate authentication methods, visit the
[provider documentation][provider-documentation-1].


A service principal is an application within the Azure Active Directory that
passes `client_id`, `client_secret`, and `tenant_id` authentication
tokens to create and manage Azure resources. As an alternative, it can also authenticate
with a `client_certificate` instead of a `client_secret`

### Create a service principal with client secret credentials using the Azure CLI tool

:::tip
If you don't have the Azure CLI, use the [install guide][install-guide]
:::

First, find the Subscription ID for your Azure account.

```shell
az account list
```

Note the value of the `id` in the return output.

Next, create a service principle `Owner` role. Update the `<subscription_id>`
with the `id` from the previous command.

```shell
az ad sp create-for-rbac --sdk-auth --role Owner --scopes /subscriptions/<subscription_id> \
  > azure.json
```

The `azure.json` file in the preceding command contains the client ID, secret, and
tenant ID of your subscription.


Next, use `kubectl` to associate your Azure credentials file with a generic
Kubernetes secret.

```shell
kubectl create secret generic azure-secret -n upbound-system --from-file=creds=./azure.json
```

### Configure your provider

Apply these changes to your `ProviderConfig` file.

```yaml {label="secretPC", copy-lines="5-11"}
apiVersion: azure.upbound.io/v1beta1
metadata:
  name: default
kind: ProviderConfig
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: upbound-system
      name: azure-secret
      key: creds
```

Your credential `source` must be `Secret` and you must specify the namespace,
name, and key if you used different values.

Apply your configuration.

## GCP


For more detailed instructions or alternate authentication methods, visit the
[provider documentation][provider-documentation-2].


Using GCP service account keys requires storing the GCP account keys JSON file
as a Kubernetes secret.

To create the Kubernetes secret create or
[download your GCP service account key][download-your-gcp-service-account-key]
JSON file.


### Create a Kubernetes secret
Create the Kubernetes secret with
<Hover label="kubesecret" line="1">kubectl create secret generic</Hover>.

<!-- vale Google.FirstPerson = NO -->
<!-- vale gitlab.Substitutions = NO -->
For example, name the secret
<Hover label="kubesecret" line="2">gcp-secret</Hover> in the
<Hover label="kubesecret" line="3">crossplane-system</Hover> namespace
and import the text file with the credentials
<Hover label="kubesecret" line="4">gcp-credentials.json</Hover> and
assign them to the secret key
<Hover label="kubesecret" line="4">my-gcp-secret</Hover>.
<!-- vale Google.FirstPerson = YES -->
<!-- vale gitlab.Substitutions = YES -->

<div id="kubesecret">
```shell
kubectl create secret generic \
gcp-secret \
-n crossplane-system \
--from-file=my-gcp-secret=./gcp-credentials.json
```
</div>

To create a secret declaratively requires encoding the authentication keys as a
base-64 string.

<!-- vale Google.FirstPerson = NO -->
Create a <Hover label="decSec" line="2">Secret</Hover> object with
the <Hover label="decSec" line="7">data</Hover> containing the secret
key name, <Hover label="decSec" line="8">my-gcp-secret</Hover> and the
base-64 encoded keys.
<!-- vale Google.FirstPerson = YES -->

<div id="decSec">
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gcp-secret
  namespace: crossplane-system
type: Opaque
data:
  my-gcp-secret: ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAiZG9jcyIsCiAgInByaXZhdGVfa2V5X2lkIjogIjEyMzRhYmNkIiwKICAicHJpdmF0ZV9rZXkiOiAiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5cbi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS1cbiIsCiAgImNsaWVudF9lbWFpbCI6ICJkb2NzQHVwYm91bmQuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJjbGllbnRfaWQiOiAiMTIzNDUiLAogICJhdXRoX3VyaSI6ICJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20vby9vYXV0aDIvYXV0aCIsCiAgInRva2VuX3VyaSI6ICJodHRwczovL29hdXRoMi5nb29nbGVhcGlzLmNvbS90b2tlbiIsCiAgImF1dGhfcHJvdmlkZXJfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvY2VydHMiLAogICJjbGllbnRfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9yb2JvdC92MS9tZXRhZGF0YS94NTA5L2RvY3MuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJ1bml2ZXJzZV9kb21haW4iOiAiZ29vZ2xlYXBpcy5jb20iCn0=
```
</div>


### Create a ProviderConfig

Create a
<Hover label="pc-keys" line="2">ProviderConfig</Hover> to set the
provider authentication method to
<Hover label="pc-keys" line="7">Secret</Hover>.

Create a <Hover label="pc-keys" line="8">secretRef</Hover> with the
<Hover label="pc-keys" line="9">namespace</Hover>,
<Hover label="pc-keys" line="10">name</Hover> and
<Hover label="pc-keys" line="11">key</Hover> of the secret.

:::tip
To apply key based authentication by default name the ProviderConfig
<Hover label="pc-keys" line="4">default</Hover>.
:::

<div id="pc-keys">
```yaml
apiVersion: gcp.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: gcp-secret
      key: my-gcp-secret
```
</div>

To selectively apply key based authentication name the ProviderConfig and apply
it when creating managed resources.

For example, creating an ProviderConfig named
<Hover label="pc-keys2" line="4">key-based-providerconfig</Hover>.

<div id="pc-keys2">
```yaml
apiVersion: gcp.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: key-based-providerconfig
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: gcp-secret
      key: my-gcp-secret
```
</div>

Apply the ProviderConfig to a
managed resource with a
<Hover label="mr-keys" line="8">providerConfigRef</Hover>.

<div id="mr-keys">
```yaml
apiVersion: storage.gcp.upbound.io/v1beta1
kind: Bucket
metadata:
  name: my-gcp-bucket
spec:
  forProvider:
    location: US
  providerConfigRef:
    name: key-based-providerconfig
```
</div>

## Next steps

Now that you have authenticated with your provider, the next step is to [build your control plane project][build-your-control-plane-project].


[build-your-control-plane-project]: /manuals/cli/howtos/building-pushing
[provider-documentation]: /manuals/packages/providers/authentication#aws-authentication
[download-your-aws-access-key]: https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/welcome.html
[provider-documentation-1]: /manuals/packages/providers/authentication#azure-authentication
[install-guide]: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli
[provider-documentation-2]: /manuals/packages/providers/authentication#gcp-authentication
[download-your-gcp-service-account-key]: https://cloud.google.com/iam/docs/keys-create-delete#creating
