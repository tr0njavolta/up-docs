---
title: Provider Authentication
sidebar_position: 2
description: Authentication options for Upbound Official Providers
---

This guide covers authentication methods for Upbound Official Providers. Each provider supports multiple authentication approaches to fit different deployment scenarios and security requirements.

## Quick reference

| Provider | Authentication Methods |
|----------|----------------------|
| AWS | [Upbound OIDC][aws-oidc], [Access Keys][aws-keys], [WebIdentity][aws-webidentity], [IRSA][aws-irsa], [EKS Pod Identity][aws-pod-identity] |
| Azure | [Upbound OIDC](#azure-upbound-oidc), [Service Principal](#azure-service-principal), [Managed Identity](#azure-managed-identity) |
| GCP | [Upbound OIDC](#gcp-upbound-oidc), [Service Account Keys](#gcp-service-account-keys), [OAuth 2.0 Token](#gcp-oauth-token), [Service Account Impersonation](#gcp-service-account-impersonation), [Workload Identity](#gcp-workload-identity) |
| Kubernetes | [Upbound Identity](#kubernetes-upbound-identity), [Injected Identity](#kubernetes-injected-identity), [Injected Identity with Cloud Provider Credentials](#kubernetes-injected-identity-cloud) |
| Helm | [Injected Identity with Cloud Provider Credentials](#helm-injected-identity-cloud) |

## AWS authentication

The Upbound Official AWS Provider supports multiple authentication methods suitable for different environments.

### AWS Upbound OIDC {#aws-upbound-oidc}

:::note
This method is only supported in control planes running on [Upbound Cloud Spaces][upbound-cloud-spaces].
:::

Upbound OIDC uses federation via `proidc.upbound.io` to authenticate to AWS without storing credentials. An IAM role in your AWS account trusts the Upbound OIDC provider, scoped to a specific organization and control plane. The provider exchanges a short-lived identity token for temporary AWS credentials at runtime.

```yaml
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Upbound
    upbound:
      webIdentity:
        roleARN: <roleARN-for-provider-identity>
```

For a complete setup guide, see [AWS Upbound OIDC Authentication][aws-oidc].

<!-- vale Google.Headings = NO -->
### AWS Access Keys {#aws-access-keys}
<!-- vale Google.Headings = YES -->

Access key authentication stores static IAM credentials as a Kubernetes Secret. The provider reads the secret at runtime to authenticate with AWS APIs. This is the simplest method but requires manual credential rotation and stores long-lived secrets in the cluster.

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

For a complete setup guide, see [AWS Access Key Authentication][aws-keys].

### AWS WebIdentity {#aws-webidentity}

:::tip
WebIdentity is only supported with Crossplane running in Amazon managed Kubernetes clusters (EKS).
:::

WebIdentity uses [AssumeRoleWithWebIdentity][assumerolewithwebidentity] to exchange a projected service account token for temporary AWS credentials. Unlike IRSA, the role ARN and token source are configured per-ProviderConfig via the `tokenConfig` field, so different ProviderConfigs can target different roles and tokens without reinstalling the provider.

```yaml
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: WebIdentity
    webIdentity:
      roleARN: "arn:aws:iam::111122223333:role/my-webidentity-role"
      tokenConfig:
        source: Filesystem
        fs:
          path: /var/run/secrets/aws-iam-token/token
```

For a complete setup guide, see [AWS Web Identity Authentication][aws-webidentity].

<!-- vale Microsoft.HeadingAcronyms = NO -->
### AWS IRSA {#aws-irsa}
<!-- vale Microsoft.HeadingAcronyms = YES -->

[IAM Roles for Service Accounts][aws-iam-roles-for-service-accounts] (IRSA) authenticates using an annotation on the provider's Kubernetes ServiceAccount. A DeploymentRuntimeConfig applies the IAM role ARN as an annotation, and the EKS pod identity webhook injects temporary credentials into the provider pod automatically.

```yaml
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: IRSA
```

For a complete setup guide, see [AWS IRSA Authentication Setup][aws-irsa].

<!-- vale Microsoft.HeadingAcronyms = NO -->
### AWS EKS Pod Identity {#aws-pod-identity}
<!-- vale Microsoft.HeadingAcronyms = YES -->

[EKS Pod Identity][eks-pod-identity] (EKS 1.24+) authenticates using a standardized `pods.eks.amazonaws.com` trust policy and an explicit association between the provider's ServiceAccount and an IAM role. Unlike IRSA, it doesn't require a cluster-specific OIDC provider, so trust policies are reusable across clusters.

```yaml
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: PodIdentity
```

For a complete setup guide, see [AWS EKS Pod Identity Authentication][aws-pod-identity].

## Azure authentication

The Upbound Official Azure Provider supports multiple authentication methods.

### Azure Upbound OIDC {#azure-upbound-oidc}

:::note
This method is only supported in control planes running on [Upbound Cloud Spaces][upbound-cloud-spaces].
:::

#### Create an identity pool

1. Open the **[Azure portal][azure-portal]**.
2. Select **[Microsoft Entra ID][microsoft-entra-id]**.
3. Select **App registrations**.
4. Select **New registration**.
5. Name the pool **upbound-oidc-provider**.
6. In _Supported account types_ select **Accounts in this organizational directory only**.
7. Leave _Redirect URI_ blank.
8. Select **Register**.

#### Create a federated credential

1. Select **Certificates and secrets** in the left navigation.
2. Select **Federated credentials** tab.
3. Select **Add credential**.
4. In _Federated credential scenario_ select **Other Issuer**.
5. In _Issuer_ enter **https://proidc.upbound.io**.
6. In _Subject identifier_ enter: `mcp:<your-org>/<your-control-plane-name>:provider:provider-azure`
7. In _Audience_ leave **api://AzureADTokenExchange**.
8. In _Name_ enter a name for the credential, like: `upbound-<your-org>-<your-control-plane-name>-provider-azure`
9. In _Description_ optionally enter a description, like: `Upbound MCP <your-org>/<your-control-plane-name> Provider provider-azure`
10. Select **Add**.

#### Grant permissions to the service principal

For your control plane to be able to perform actions required by this configuration, you need to grant permissions to the Application Service Principal. Assign a role to the Application Service Principal by following these instructions:

1. Open the **[Azure portal][azure-portal]**
2. Select **[Subscriptions][subscriptions]**.
3. Select your subscription.
4. Select **Access control (IAM)** in the left navigation.
5. Select **Add** and select **Add role assignment**.
6. Find and select the **Contributor** role on the **Privileged administrator roles** tab.
7. Select **Next**.
8. In _Assign access to_ select **User, group, or service principal**.
9. Select **Select members**.
10. Find your application by entering **upbound-oidc-provider** in the search field.
11. Select **Select**.
12. Select **Review + assign**.
13. Make sure everything is correct and press **Review + assign** again.

#### Create a ProviderConfig

```yaml
apiVersion: azure.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Upbound
  clientID: <client ID>
  tenantID: <tenant ID>
  subscriptionID: <subscription ID>
```

### Azure Service Principal {#azure-service-principal}

A service principal passes `client_id`, `client_secret`, and `tenant_id` authentication tokens to create and manage Azure resources.

#### Create a service principal using Azure CLI

Find your Subscription ID:

```shell
az account list
```

Create a service principal with Owner role:

```shell
az ad sp create-for-rbac --sdk-auth --role Owner --scopes /subscriptions/<subscription_id> \
  > azure.json
```

#### Create a Kubernetes secret

```shell
kubectl create secret generic azure-secret -n upbound-system --from-file=creds=./azure.json
```

The `azure.json` file contains the client ID, secret, and tenant ID of your subscription.

#### Create a ProviderConfig

```yaml
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

Your credential `source` must be `Secret` and you must specify the namespace, name, and key if you used different values.

#### Service principal with client certificate credentials

You can create Azure service principals with a client certificate instead of a client secret as credentials. When creating the service principal, Azure CLI provides the options to generate a client certificate automatically or set your own custom certificate.

##### Create a service principal with a generated client certificate

The following command creates a service principal with an automatically generated certificate:

```shell
# set your subscription ID
AZ_SUBSCRIPTION_ID="11111111-1111-1111-1111-1111111111111"
az ad sp create-for-rbac --sdk-auth \
                         --role Owner \
                         --scopes /subscriptions/"${AZ_SUBSCRIPTION_ID}" \
                         --create-cert > azure_credentials.json
```

The `azure_credentials.json` file contains:
- The client ID
- The path of the generated client certificate file in your local machine
- Tenant ID of your subscription

It looks like the following:

```json
{
  "clientId": "1111111-2222-3333-4444-555555555555",
  "clientCertificate": "/path/to/generatedcert.pem",
  "subscriptionId": "22222222-3333-4444-5555-666666666666",
  "tenantId": "33333333-4444-5555-6666-777777777777",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

The generated certificate looks like the following:

```
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
```

To use this configuration with the Upbound Azure Provider, you should replace the `clientCertificate` field with the certificate content. First convert the certificate to `PKCS12` format, then encode it with `base64`:

```shell
# extract the path of the generated PEM certificate
AZ_CLIENT_CERT_PEM_PATH="$(jq -r '.clientCertificate' azure_credentials.json)"

# convert PEM to PKCS12 using openssl tool
openssl pkcs12 -export \
               -out azure_sp_cert.pkcs12 \
               -in "${AZ_CLIENT_CERT_PEM_PATH}" \
               -inkey "${AZ_CLIENT_CERT_PEM_PATH}" \
               -passout pass:

# encode the certificate
base64 -i azure_sp_cert.pkcs12 | tr -d '\n' > azure_sp_cert_pkcs12_base64encoded

# replace clientCertificate field in azure_credentials.json with base64-encoded certificate content
jq --rawfile certcontent azure_sp_cert_pkcs12_base64encoded \
    '.clientCertificate=$certcontent' azure_credentials.json > azure_credentials_withcert.json
```

The preceding command snippet should generate the file `azure_credentials_withcert.json` that looks like the following:

```json
{
  "clientId": "1111111-2222-3333-4444-555555555555",
  "clientCertificate": "XXXXX......XXX",
  "subscriptionId": "22222222-3333-4444-5555-666666666666",
  "tenantId": "33333333-4444-5555-6666-777777777777",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

Next, use `kubectl` to associate your Azure credentials file with a generic Kubernetes secret:

```shell
kubectl create secret generic azure-secret -n upbound-system --from-file=creds=./azure_credentials_withcert.json
```

##### Create a service principal with your own client certificate

Azure service principals accept custom certificates in an `ASCII` format such as `PEM`, `CER`, or `DER`. When using a certificate with `PEM` format, the certificate file should include both the certificate and private key appended. See [Microsoft Azure Service Principal Documentation][microsoft-azure-service-principal-documentation] for reference.

The following command creates a service principal with your custom certificate. You can choose one of the options:

```shell
# option 1 - load cert from file
az ad sp create-for-rbac --sdk-auth \
                         --role Owner \
                         --scopes /subscriptions/"${AZ_SUBSCRIPTION_ID}" \
                         --cert @/path/to/yourcert.pem > azure_credentials.json

# option 2 - set cert directly from string
az ad sp create-for-rbac --sdk-auth \
                         --role Owner \
                         --scopes /subscriptions/"${AZ_SUBSCRIPTION_ID}" \
                         --cert "-----BEGIN CERTIFICATE-----\n...-----END CERTIFICATE-----" > azure_credentials.json
```

The preceding command generates the `azure_credentials.json` file. Since you used a custom certificate, note that `clientCertificate` is `null` in the output:

```json
{
  "clientId": "1111111-2222-3333-4444-555555555555",
  "clientCertificate": null,
  "subscriptionId": "22222222-3333-4444-5555-666666666666",
  "tenantID": "33333333-4444-5555-6666-777777777777",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

Upbound Azure Provider accepts certificates in base64-encoded `PKCS12` format. Convert your certificate to `PKCS12` format, then encode it with `base64`. Add the resulting string to the `clientCertificate` field of `azure_credentials.json`.

In the snippet below, you can find example commands for `PEM` certificate to `PKCS12` conversion using `openssl`. If your certificate is in other formats than `PEM`, you can convert it to PEM, then use the following commands for `PKCS12` conversion. If you already have your certificate in `PKCS12` format, you can skip the conversion and move to the `base64` encode step:

```shell
# convert PEM to PKCS12 using openssl tool
openssl pkcs12 -export \
               -out azure_sp_cert.pkcs12 \
               -in "/path/to/your/cert.pem" \
               -inkey "/path/to/your/key.pem" \
               -passout pass:

# encode
base64 -i azure_sp_cert.pkcs12 | tr -d '\n' >  azure_sp_cert_pkcs12_base64encoded

# replace clientCertificate field in azure_credentials.json with base64-encoded certificate content
jq --rawfile certcontent azure_sp_cert_pkcs12_base64encoded \
    '.clientCertificate=$certcontent' azure_credentials.json > azure_credentials_withcert.json
```

If you have a password-protected PKCS12 certificate, you should also set the `clientCertificatePassword` field in the `azure_credentials_withcert.json`:

```json
{
  "clientId": "1111111-2222-3333-4444-555555555555",
  "clientCertificate": "XXXXX......XXX",
  "clientCertificatePassword": "YourClientCertificatePassword",
  "subscriptionId": "22222222-3333-4444-5555-666666666666",
  "tenantId": "33333333-4444-5555-6666-777777777777",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

Use `kubectl` to associate your Azure credentials file with a generic Kubernetes secret:

```shell
kubectl create secret generic azure-secret -n upbound-system --from-file=creds=./azure_credentials_withcert.json
```

### Azure Managed Identity {#azure-managed-identity}

The system-assigned managed identity allows you to associate the provider with your Azure Kubernetes Service (AKS) cluster automatically without manually managing credentials.

#### System-assigned managed identity

A system-assigned managed identity is automatically created when you create an AKS cluster. This section covers creating a new identity in a new cluster.

Create a resource group:

```shell
az group create --name myResourceGroup --location westus2
```

Create an AKS cluster with the `--enable-managed-identity` flag:

```shell
az aks create -g myResourceGroup -n myManagedCluster --enable-managed-identity
```

Use the `aks get-credentials` command to generate the kubeconfig file for your AKS cluster. This file contains the authentication and connection information for your cluster:

```shell
az aks get-credentials --resource-group myResourceGroup --name myManagedCluster
```

To switch from a service principal to a system-assigned managed identity, use the `aks update` command:

```shell
az aks update -g myResourceGroup -n myManagedCluster --enable-managed-identity
```

#### Configure your provider

In your provider configuration, update the `source`, `subscriptionID`, and `tenantID` in the `credentials` field:

```yaml
apiVersion: azure.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: SystemAssignedManagedIdentity
  subscriptionID: <subscription_ID>
  tenantID: <tenant_ID>
```

#### User-assigned managed identity

Create user-assigned managed identities:

```shell
az identity create --name <controlplane_identity_name> --resource-group <resource_group>
az identity create --name <kubelet_identity_name> --resource-group <resource_group>
```

Create an AKS cluster with the identities:

```shell
az aks create \
    --resource-group <resource_group> \
    --name <cluster_name> \
    --enable-managed-identity \
    --assign-identity <controlplane_identity_resource_id> \
    --assign-kubelet-identity <kubelet_identity_resource_id>
```

Create a ProviderConfig:

```yaml
apiVersion: azure.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: UserAssignedManagedIdentity
  clientID: <kubelet_identity_id>
  subscriptionID: <subscription_ID>
  tenantID: <tenant_ID>
```

## GCP authentication

The Upbound Official GCP Provider supports multiple authentication methods.

### GCP Upbound OIDC {#gcp-upbound-oidc}

:::note
This method is only supported in control planes running on [Upbound Cloud Spaces][upbound-cloud-spaces].
:::

#### Create an identity pool

1. Open the **[GCP IAM Admin console][gcp-iam-admin-console]**.
2. Select **[Workload Identity Federation][workload-identity-federation]**.
3. Select **Create Pool**.
4. Name the pool **upbound-oidc-pool**.
5. **Enable** the pool.
6. Select **Continue**.

#### Add Upbound to the pool

- _Provider Name_: **upbound-oidc-provider**
- _Issuer (URL)_: **https://proidc.upbound.io**
- _Audience 1_: **sts.googleapis.com**

The provider attributes restrict which remote entities you allow access to your resources. When Upbound authenticates to GCP it provides an OIDC subject (`sub`) in the form:

`mcp:<account>/<mcp-name>:provider:<provider-name>`

Configure the _google.subject_ attribute as **assertion.sub**.

Under _Attribute Conditions_ select **Add Condition**.

To authenticate any control plane in your organization, in the _Conditional CEL_ input box enter:

```console
google.subject.contains("mcp:ORGANIZATION_NAME")
```
<!-- vale gitlab.Uppercase = NO -->
:::warning
Not providing a CEL condition allows any control plane to access your GCP account if they know the project ID and service account name.
:::
<!-- vale gitlab.Uppercase = YES -->

Select **Save**.

#### Create a GCP Service Account

1. Open the **[GCP IAM Admin console][gcp-iam-admin-console]**.
2. Select **[Service Accounts][service-accounts]**.
3. Select **Create Service Account**.
4. Grant appropriate roles (for example, **Cloud SQL Admin**, **Workload Identity User**).

#### Add the service account to the identity pool

1. Return to **[Workload Identity Federation][workload-identity-federation]**.
2. Select **Grant Access**.
3. Select your service account.
4. Use **All identities in the pool**.

#### Create a ProviderConfig

```yaml
apiVersion: gcp.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  projectID: <project-id>
  credentials:
    source: Upbound
    upbound:
      federation:
        providerID: projects/<project-id>/locations/global/workloadIdentityPools/<identity-pool>/providers/<identity-provider>
        serviceAccount: <service-account-name>@<project-name>.iam.gserviceaccount.com
```

### GCP Service Account Keys {#gcp-service-account-keys}

Using GCP service account keys requires storing the GCP account keys JSON file as a Kubernetes secret.

To create the Kubernetes secret, create or [download your GCP service account key][download-your-gcp-service-account-key] JSON file.

#### Create a Kubernetes secret

Create the Kubernetes secret with `kubectl create secret generic`:

```shell
kubectl create secret generic \
gcp-secret \
-n crossplane-system \
--from-file=my-gcp-secret=./gcp-credentials.json
```

To create a secret declaratively requires encoding the authentication keys as a base-64 string.

Create a Secret object with the data containing the secret key name and the base-64 encoded keys:

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

#### Create a ProviderConfig

Create a ProviderConfig to set the provider authentication method to `Secret`:

```yaml
apiVersion: gcp.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  projectID: <project-id>
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: gcp-secret
      key: my-gcp-secret
```

:::tip
To apply key based authentication by default name the ProviderConfig `default`.
:::

To selectively apply key based authentication, name the ProviderConfig and apply it when creating managed resources.

For example, creating a ProviderConfig named `key-based-providerconfig`:

```yaml
apiVersion: gcp.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: key-based-providerconfig
spec:
  projectID: <project-id>
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: gcp-secret
      key: my-gcp-secret
```

Apply the ProviderConfig to a managed resource with a `providerConfigRef`:

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

### GCP OAuth 2.0 Access Token {#gcp-oauth-token}

Using GCP access tokens requires storing the GCP account keys JSON file as a Kubernetes secret.

Create a GCP access [token for a service account][token-for-a-service-account] or with the [`gcloud` CLI][gcloud-cli].

:::warning
GCP access tokens are valid for 1 hour by default. When the token expires Crossplane can't create or delete resources.

The [provider-gcp GitHub repository][provider-gcp-github-repository] contains an example `cron` job that automatically refreshes access tokens.
:::

#### Create a Kubernetes secret

Create the Kubernetes secret with `kubectl create secret generic`:

```shell
kubectl create secret generic \
gcp-secret \
-n crossplane-system \
--from-file=my-gcp-secret=./gcp-token.json
```

To create a secret declaratively requires encoding the access token as a base-64 string.

Create a Secret object with the data containing the secret key name and the base-64 encoded token:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gcp-secret
  namespace: crossplane-system
type: Opaque
data:
  my-gcp-secret: eWEyOS5hMEFmQl9ieURVVEpSSWt3RDk1c1cxTGE0d3dlLS0xTHpOZkxJeFFYbnIza25VVG9jYV9xY2xsSG1ZUzVycjJwYmNzZnVuR3M5blR6SnVIb2lYb3VmRnBEbGZicGV5bTBJU1lfUmdxWGNCMTdDY3RXZWZOd2hJcVVUblJ2UVdmcHpsODVvbklzUXZaN0F5MEJjUy1ZMGxXYXJXODVJQ2Z5R0RhZEtvYUNnWUtBWXdTQVJFU0ZRSHN2WWxzUnU1Q0w4UVY0OThRc1pvbmxGVXJXQTAxNzE=
```

#### Create a ProviderConfig

Create a ProviderConfig to set the provider authentication method to `AccessToken`:

```yaml
apiVersion: gcp.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  projectID: <project-id>
  credentials:
    source: AccessToken
    secretRef:
      namespace: crossplane-system
      name: gcp-secret
      key: my-gcp-secret
```

To selectively apply token based authentication, name the ProviderConfig and apply it when creating managed resources.

For example, creating a ProviderConfig named `token-based-providerconfig`:

```yaml
apiVersion: gcp.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: token-based-providerconfig
spec:
  projectID: <project-id>
  credentials:
    source: AccessToken
    secretRef:
      namespace: crossplane-system
      name: gcp-secret
      key: my-gcp-secret
```

Apply the ProviderConfig to a managed resource with a `providerConfigRef`:

```yaml
apiVersion: storage.gcp.upbound.io/v1beta1
kind: Bucket
metadata:
  name: my-gcp-bucket
spec:
  forProvider:
    location: US
  providerConfigRef:
    name: token-based-providerconfig
```

### GCP Service Account Impersonation {#gcp-service-account-impersonation}

When running the GCP Provider in Google managed Kubernetes cluster (GKE), the Provider may use [service account impersonation][service-account-impersonation] for authentication.

Account impersonation allows the Provider to authenticate to GCP APIs using one service account and request escalated privileges through a second account.

:::important
Service account impersonation is only supported with Crossplane running in Google managed Kubernetes clusters (GKE).
:::

Configuring service account impersonation with the GCP Provider requires:
* A lower privileged [GCP service account][gcp-service-account]
* An elevated privileged [GCP service account][gcp-service-account]
* A DeploymentRuntimeConfig to reference the lower-privileged GCP service account
* A ProviderConfig to reference the elevated privileged GCP service account

#### Configure the GCP service accounts

You may use existing service accounts or follow the [GCP documentation to create new service accounts][gcp-documentation-to-create-a-new-service-account].

The lower privilege role requires a [GCP IAM policy binding][gcp-iam-policy-binding] role for the project which includes `iam.serviceAccountTokenCreator`:

```shell
gcloud projects add-iam-policy-binding <Project_Name> \
    --member "serviceAccount:<Lower_Privilege_Service_Account>@<Project_Name>.iam.gserviceaccount.com" \
    --role  roles/iam.serviceAccountTokenCreator \
    --project <Project_Name>
```

For example, to create a role-binding for project `upbound` and account `docs-unprivileged`:

```shell
gcloud projects add-iam-policy-binding upbound \
    --member "serviceAccount:docs-unprivileged@upbound.iam.gserviceaccount.com" \
    --role  roles/iam.serviceAccountTokenCreator \
    --project upbound
```

The lower privileged service account requires a [GCP IAM service account policy binding][gcp-iam-service-account-policy-binding] between the unprivileged account and the Kubernetes provider service account:

```shell
gcloud iam service-accounts add-iam-policy-binding <Lower_Privilege_Service_Account>@<Project_Name>.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:<Project_Name>.svc.id.goog[<Crossplane_Namespace>/<Kubernetes_Service_Account_Name>]"
```

For example, to create a policy binding for project `upbound`, account `docs-unprivileged`, namespace `crossplane-system`, and Provider service account name `gcp-provider-sa`:

```shell
gcloud iam service-accounts add-iam-policy-binding docs-unprivileged@upbound.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:upbound.svc.id.goog[crossplane-system/gcp-provider-sa]"
```

:::tip
For more information on the account requirements for account impersonation, read the [GCP service account impersonation documentation][gcp-service-account-impersonation-documentation].
:::

#### Create a DeploymentRuntimeConfig

The DeploymentRuntimeConfig creates a custom Provider service account and applies an annotation to the Provider's pod.

Create a DeploymentRuntimeConfig object. Add an annotation mapping the key `iam.gke.io/gcp-service-account` to the email address of the lower-privileged GCP IAM service account.

Add a `serviceAccountName` to the spec to create the Provider's service account. This must match the name used in the GCP IAM binding:

```yaml
apiVersion: pkg.crossplane.io/v1beta1
kind: DeploymentRuntimeConfig
metadata:
  name: impersonation-runtimeconfig
spec:
  serviceAccountTemplate:
    metadata:
      annotations:
        iam.gke.io/gcp-service-account: <Lower_Privilege_Service_Account>@<Project_Name>.iam.gserviceaccount.com
      name: <Kubernetes_service_account_name>
```

For example, to use a GCP service account named `docs-unprivileged` and a service account name `gcp-provider-sa`:

:::important
The `serviceAccountName` must match the service account referenced in the GCP IAM policy binding.
:::

```yaml
apiVersion: pkg.crossplane.io/v1beta1
kind: DeploymentRuntimeConfig
metadata:
  name: impersonation-runtimeconfig
spec:
  serviceAccountTemplate:
    metadata:
      annotations:
        iam.gke.io/gcp-service-account: docs-unprivileged@upbound.iam.gserviceaccount.com
      name: gcp-provider-sa
```

#### Apply the DeploymentRuntimeConfig

Install or update the provider with a `runtimeConfigRef`:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-gcp-storage
spec:
  package: xpkg.upbound.io/upbound/provider-gcp-storage:v2.1.0
  runtimeConfigRef:
    name: impersonation-runtimeconfig
```

#### Create a ProviderConfig

Create a ProviderConfig to set the provider authentication method to `ImpersonateServiceAccount`. Add the `impersonateServiceAccount` object and provide the name of the _privileged_ account to impersonate. Include the `projectID` to use:

```yaml
apiVersion: gcp.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  projectID: <Project_Name>
  credentials:
    source: ImpersonateServiceAccount
    impersonateServiceAccount:
      name: <Privileged_Service_Account>@<Project_Name>.iam.gserviceaccount.com
```

For example, to create a ProviderConfig with service account named `docs-privileged` and project named `upbound`:

```yaml
apiVersion: gcp.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  projectID: upbound
  credentials:
    source: ImpersonateServiceAccount
    impersonateServiceAccount:
      name: docs-privileged@upbound.iam.gserviceaccount.com
```

To selectively apply impersonation based authentication, name the ProviderConfig and apply it when creating managed resources.

For example, creating a ProviderConfig named `impersonation-providerconfig`:

```yaml
apiVersion: gcp.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: impersonation-providerconfig
spec:
  projectID: <Project_Name>
  credentials:
    source: ImpersonateServiceAccount
    impersonateServiceAccount:
      name: <Privileged_Service_Account>@<Project_Name>.iam.gserviceaccount.com
```

Apply the ProviderConfig to a managed resource with a `providerConfigRef`:

```yaml
apiVersion: storage.gcp.upbound.io/v1beta1
kind: Bucket
metadata:
  name: my-gcp-bucket
spec:
  forProvider:
    location: US
  providerConfigRef:
    name: impersonation-providerconfig
```

### GCP Workload Identity {#gcp-workload-identity}

When running in Google Kubernetes Engine (GKE), the Provider may use [workload identity][workload-identity] for authentication.

:::tip
Workload identity is only supported with Crossplane running in GKE.
:::

#### Configure the GCP service account

Enable workload identity and link the GCP IAM service account:

```shell
gcloud iam service-accounts add-iam-policy-binding \
  <Service_Account_Email_Address> \
--role  roles/iam.workloadIdentityUser    \
--member "serviceAccount:<Project_Name>.svc.id.goog[crossplane-system/<Kubernetes_Service_Account>]" \
--project <Project_Name>
```

#### Create a DeploymentRuntimeConfig

```yaml
apiVersion: pkg.crossplane.io/v1beta1
kind: DeploymentRuntimeConfig
metadata:
  name: workload-identity-runtimeconfig
spec:
  serviceAccountTemplate:
    metadata:
      annotations:
        iam.gke.io/gcp-service-account: <GCP_IAM_service_account_email>
      name: <Kubernetes_service_account_name>
```

#### Apply the DeploymentRuntimeConfig

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-gcp-storage
spec:
  package: xpkg.upbound.io/upbound/provider-gcp-storage:v2.1.0
  runtimeConfigRef:
    name: workload-identity-runtimeconfig
```

#### Create a ProviderConfig

```yaml
apiVersion: gcp.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  projectID: <Project_Name>
  credentials:
    source: InjectedIdentity
```

## Kubernetes authentication

The Upbound Official Kubernetes Provider supports multiple authentication methods.

### Kubernetes Upbound Identity {#kubernetes-upbound-identity}

:::note
This method is only supported in control planes running on [Upbound Cloud Spaces][upbound-cloud-spaces].
:::

Use this method to interact with [Upbound APIs][upbound-apis] using
provider-kubernetes. Upbound Identity supports the following authentication
methods with Upbound:

- A user's personal access token (PAT)
- A token generated from a robot

#### Create an access token

<Tabs>
<TabItem value="robot" label="Robot">

This method creates a Robot, the Upbound-equivalent of a service account, and uses its identity to authenticate and perform actions.

1. Login to Upbound:

```shell
up login
```

2. Create a robot:

```shell
up robot create "provider-kubernetes" --description="Robot used for authenticating to Upbound by provider-kubernetes"
```

3. Create and store an access token for this robot as an environment variable:

```shell
export UPBOUND_TOKEN=$(up robot token create "provider-kubernetes" "provider-kubernetes-token" --file - | jq -r '.token')
```

:::note
Follow the [`jq` installation guide][jq-install] if your machine doesn't include it by default.
:::

4. Assign the robot [to a team][to-a-team] and use Upbound RBAC to [grant the team a role][grant-the-team-a-role] for permissions.

</TabItem>

<TabItem value="pat" label="Personal Access Token">

Create a personal access token and store it as an environment variable:

```shell
export UPBOUND_TOKEN="YOUR_API_TOKEN"
```

</TabItem>
</Tabs>

#### Generate a kubeconfig for Upbound APIs

Upbound APIs are Kubernetes-compatible. Generate a kubeconfig for the context you want to interact with:

- [Generate a kubeconfig for a Space][generate-a-kubeconfig-for-a-space]
- [Generate a kubeconfig for a control plane in a Space][generate-a-kubeconfig-for-a-control-plane-in-a-space]

Set the desired context path below depending on your use case. Generate a kubeconfig according to the token method you followed in the prior section.

<Tabs>
<TabItem value="robot" label="Robot">

1. Login to Upbound with the robot access token:

```shell
up login -t $UPBOUND_TOKEN
```

2. Set your Upbound context:

```shell
up ctx org/space/group/control-plane
up ctx . -f - > upbound-context.yaml
```

</TabItem>

<TabItem value="user" label="User account">

1. Login to Upbound:

```shell
up login
```

2. Set your Upbound context:

```shell
up ctx org/space/group/control-plane
up ctx . -f - > upbound-context.yaml
```

</TabItem>
</Tabs>

Store the generated context as an environment variable:

```shell
export CONTROLPLANE_CONFIG=upbound-context.yaml
```

#### Create secrets

In the control plane where you've installed provider-kubernetes, store the tokens created in the earlier step as secrets:

```shell
kubectl -n crossplane-system create secret generic cluster-config --from-file=kubeconfig=$CONTROLPLANE_CONFIG
kubectl -n crossplane-system create secret generic upbound-credentials --from-literal=token=$UPBOUND_TOKEN
```

#### Create a ProviderConfig

```yaml
apiVersion: kubernetes.crossplane.io/v1alpha1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    secretRef:
      key: kubeconfig
      name: cluster-config
      namespace: crossplane-system
    source: Secret
  identity:
    secretRef:
      key: token
      name: upbound-credentials
      namespace: crossplane-system
    source: Secret
    type: UpboundTokens
```

### Kubernetes Injected Identity {#kubernetes-injected-identity}

Use this method for a control plane to manage resources in itself using a `cluster-admin` role.

#### Create a ProviderConfig

<!-- vale Google.Headings = YES -->
```yaml
apiVersion: kubernetes.crossplane.io/v1alpha1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: InjectedIdentity
```

#### Create a DeploymentRuntimeConfig

```yaml
apiVersion: pkg.crossplane.io/v1beta1
kind: DeploymentRuntimeConfig
metadata:
  name: provider-kubernetes
spec:
  serviceAccountTemplate:
    metadata:
      name: provider-kubernetes
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: provider-kubernetes-cluster-admin
subjects:
  - kind: ServiceAccount
    name: provider-kubernetes
    namespace: crossplane-system
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
```

Reference this DeploymentRuntimeConfig in the Provider:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-kubernetes
spec:
  package: xpkg.upbound.io/upbound/provider-kubernetes:v1.2.0
  runtimeConfigRef:
    apiVersion: pkg.crossplane.io/v1beta1
    kind: DeploymentRuntimeConfig
    name: provider-kubernetes
```
<!-- vale Google.Headings = NO -->
### Kubernetes Injected Identity with Cloud Provider Credentials {#kubernetes-injected-identity-cloud}
<!-- vale Google.Headings = YES -->

This method authenticates the Kubernetes provider to a remote provider with
cloud provider credentials. You can use EKS, GKE, AWS, or Upbound Cloud Spaces
with OIDC.


The provider supports the following identity types for authentication:

- `AWSWebIdentityCredentials`: For EKS clusters using AWS IAM roles
- `GoogleApplicationCredentials`: For GKE clusters using Google service accounts
- `AzureServicePrincipalCredentials`: For AKS clusters using Azure service principals
- `AzureWorkloadIdentityCredentials`: For AKS clusters using Azure workload identity
- `UpboundTokens`: For Upbound APIs using Upbound authentication

This section walks through the AWS Web Identity approach. You can use this guide
for both Upbound Cloud Spaces OIDC and EKS OIDC.

#### Create an AWS IAM Role

Create an [AWS IAM Role][aws-iam-role] with a **Custom trust policy** for the OIDC connector.

<Tabs>
<TabItem value="upbound" label="Upbound Cloud Spaces">

For control planes running in Upbound Cloud Spaces, create an IAM role in AWS
with a trust policy that allows the provider running in your control plane to
assume the role via Upbound's OIDC service.

1. Follow the [AWS Upbound OIDC setup](#aws-upbound-oidc) to add Upbound as an
   OpenID Connect provider in your AWS account if you haven't already.

2. Create an IAM role with the following **trust policy**. This policy
   establishes a federated trust relationship with Upbound's OIDC provider
   (`proidc.upbound.io`) and restricts role assumption to only the specific
   provider in your control plane:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::$AWS_ACCOUNT_ID:oidc-provider/proidc.upbound.io"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "proidc.upbound.io:aud": "sts.amazonaws.com",
          "proidc.upbound.io:sub": "mcp:$ORG/$CONTROL_PLANE_NAME*:provider:upbound-provider-kubernetes"
        }
      }
    }
  ]
}
```

Replace the following values:
- `$AWS_ACCOUNT_ID`: Your AWS account ID
- `$ORG`: Your Upbound organization name
- `$CONTROL_PLANE_NAME`: Your control plane name

The `Federated` principal references Upbound's OIDC provider, and the
`Condition` ensures only your specific provider can assume this role.

3. Attach the necessary AWS permissions to this role (for example, permissions
   to access EKS clusters).

</TabItem>

<TabItem value="eks" label="Running in EKS">

:::important
When running in EKS, you must first configure [IRSA](#aws-irsa) or [EKS Pod
Identity][eks-pod-identity] for the provider. This guide assumes you have
already completed the IRSA or Pod Identity setup. 
:::

For providers running directly in EKS, use the EKS cluster OIDC provider. Follow
the [IRSA setup](#aws-irsa) for creating the IAM role trust policy and
configuring the provider's service account.

</TabItem>
</Tabs>

#### Configure target EKS cluster access

Configure your EKS cluster to allow the IAM role to access it. 

Use one of the following methods:
- [EKS Access Entries][eks-access-entries] (recommended)
- [aws-auth ConfigMap][aws-auth-configmap]

Assign appropriate Kubernetes permissions (for example, `system:masters` group
for full access or create a custom Role/RoleBinding).

#### Configure the Provider

<Tabs>
<TabItem value="upbound" label="Upbound Cloud Spaces">

For control planes running in Upbound Cloud Spaces, create a
DeploymentRuntimeConfig to inject the Upbound OIDC token and AWS credentials:

```yaml
apiVersion: pkg.crossplane.io/v1beta1
kind: DeploymentRuntimeConfig
metadata:
  name: aws-audience
spec:
  deploymentTemplate:
    spec:
      template:
        metadata:
          annotations:
            proidc.cloud-spaces.upbound.io/audience: sts.amazonaws.com
        spec:
          containers:
          - name: package-runtime
            env:
            - name: AWS_WEB_IDENTITY_TOKEN_FILE
              value: /var/run/secrets/upbound.io/provider/token
            - name: AWS_ROLE_ARN
              value: arn:aws:iam::$AWS_ACCOUNT_ID:role/$ROLE_NAME
            - name: AWS_REGION
              value: $AWS_REGION
      selector: {}
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-kubernetes
spec:
  package: xpkg.upbound.io/upbound/provider-kubernetes:v1.2.0
  runtimeConfigRef:
    name: aws-audience
```

Replace `$AWS_ACCOUNT_ID`, `$ROLE_NAME`, and `$AWS_REGION` with your values.

</TabItem>

<TabItem value="eks" label="Running in EKS">

:::important
This assumes you have already configured [IRSA](#aws-irsa) or [EKS Pod
Identity][eks-pod-identity] for the provider-kubernetes package. The provider's
service account must have the appropriate IAM role annotation. 
:::

For providers running directly in EKS with IRSA, install the provider with your
IRSA DeploymentRuntimeConfig:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-kubernetes
spec:
  package: xpkg.upbound.io/upbound/provider-kubernetes:v1.2.0
  runtimeConfigRef:
    name: irsa-runtimeconfig
```

EKS automatically injects the web identity token when the service account has
the `eks.amazonaws.com/role-arn` annotation. Refer to the [IRSA
section](#aws-irsa) for the complete setup.

</TabItem>
</Tabs>

#### Create a kubeconfig secret

Generate a kubeconfig for your EKS cluster using the AWS CLI:

```shell
aws eks update-kubeconfig \
  --region $AWS_REGION \
  --name $CLUSTER_NAME \
  --profile $AWS_PROFILE \
  --kubeconfig eks-kubeconfig.txt
```

Create a Secret containing the kubeconfig for your EKS cluster. Use an empty
user configuration in the kubeconfig, as the provider reads AWS credentials
from environment variables:

```yaml
apiVersion: v1
kind: Secret
metadata:
  namespace: crossplane-system
  name: cluster-config
type: Opaque
stringData:
  kubeconfig: |
    apiVersion: v1
    clusters:
    - cluster:
        certificate-authority-data: $CERTIFICATE_AUTHORITY_DATA
        server: https://$EKS_CLUSTER_ENDPOINT
      name: $EKS_CLUSTER_ARN
    contexts:
    - context:
        cluster: $EKS_CLUSTER_ARN
        user: $EKS_CLUSTER_ARN
      name: $EKS_CLUSTER_ARN
    current-context: $EKS_CLUSTER_ARN
    kind: Config
    preferences: {}
    users:
    - name: $EKS_CLUSTER_ARN
      user: {}
```

Replace the following placeholders with values from your generated kubeconfig:
- `$CERTIFICATE_AUTHORITY_DATA`: The base64-encoded certificate authority data for your EKS cluster
- `$EKS_CLUSTER_ENDPOINT`: Your EKS cluster endpoint (for example, `ABC123.gr7.us-west-2.eks.amazonaws.com`)
- `$EKS_CLUSTER_ARN`: Your EKS cluster ARN (for example, `arn:aws:eks:us-west-2:123456789012:cluster/my-cluster`)

#### Create a ProviderConfig

Create a ProviderConfig that uses the Secret credentials and AWS Web Identity
for authentication:

```yaml
apiVersion: kubernetes.crossplane.io/v1alpha1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: cluster-config
      key: kubeconfig
  identity:
    source: InjectedIdentity
    type: AWSWebIdentityCredentials
```

## Helm authentication

The Upbound Official Helm Provider supports multiple authentication methods for
accessing Kubernetes clusters.

### Helm Injected Identity with Cloud Provider Credentials {#helm-injected-identity-cloud}


This method authenticates the Helm provider to a remote provider with
cloud provider credentials. You can use EKS, GKE, AWS, or Upbound Cloud Spaces
with OIDC.


The provider supports the following identity types for authentication:

- `AWSWebIdentityCredentials`: For EKS clusters using AWS IAM roles
- `GoogleApplicationCredentials`: For GKE clusters using Google service accounts
- `AzureServicePrincipalCredentials`: For AKS clusters using Azure service principals
- `AzureWorkloadIdentityCredentials`: For AKS clusters using Azure workload identity
- `UpboundTokens`: For Upbound APIs using Upbound authentication

This section walks through the AWS Web Identity approach. You can use this guide
for both Upbound Cloud Spaces OIDC and EKS OIDC.

#### Create an AWS IAM Role

Create an [AWS IAM Role][aws-iam-role] with a **Custom trust policy** for the OIDC connector.

<Tabs>
<TabItem value="upbound" label="Upbound Cloud Spaces">

For control planes running in Upbound Cloud Spaces, create an IAM role in AWS
with a trust policy that allows the provider running in your control plane to
assume the role via Upbound's OIDC service.

1. Follow the [AWS Upbound OIDC setup](#aws-upbound-oidc) to add Upbound as an
   OpenID Connect provider in your AWS account if you haven't already.

2. Create an IAM role with the following **trust policy**. This policy
   establishes a federated trust relationship with Upbound's OIDC provider
   (`proidc.upbound.io`) and restricts role assumption to only the specific
   provider in your control plane:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::$AWS_ACCOUNT_ID:oidc-provider/proidc.upbound.io"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "proidc.upbound.io:aud": "sts.amazonaws.com",
          "proidc.upbound.io:sub": "mcp:$ORG/$CONTROL_PLANE_NAME*:provider:upbound-provider-helm"
        }
      }
    }
  ]
}
```

Replace the following values:
- `$AWS_ACCOUNT_ID`: Your AWS account ID
- `$ORG`: Your Upbound organization name
- `$CONTROL_PLANE_NAME`: Your control plane name

The `Federated` principal references Upbound's OIDC provider, and the
`Condition` ensures only your specific provider can assume this role.

3. Attach the necessary AWS permissions to this role (for example, permissions
   to access EKS clusters).

</TabItem>

<TabItem value="eks" label="Running in EKS">

:::important
When running in EKS, you must first configure [IRSA](#aws-irsa) or [EKS Pod
Identity][eks-pod-identity] for the provider. This guide assumes you have
already completed the IRSA or Pod Identity setup. 
:::

For providers running directly in EKS, use the EKS cluster OIDC provider. Follow
the [IRSA setup](#aws-irsa) for creating the IAM role trust policy and
configuring the provider's service account.

</TabItem>
</Tabs>

#### Configure target EKS cluster access

Configure your EKS cluster to allow the IAM role to access it. 

Use one of the following methods:
- [EKS Access Entries][eks-access-entries] (recommended)
- [aws-auth ConfigMap][aws-auth-configmap]

Assign appropriate Kubernetes permissions (for example, `cluster-admin` role for
full access or create a custom Role/RoleBinding).

#### Configure the Provider

<Tabs>
<TabItem value="upbound" label="Upbound Cloud Spaces">

For control planes running in Upbound Cloud Spaces, create a
DeploymentRuntimeConfig to inject the Upbound OIDC token and AWS credentials:

```yaml
apiVersion: pkg.crossplane.io/v1beta1
kind: DeploymentRuntimeConfig
metadata:
  name: helm-aws-audience
spec:
  deploymentTemplate:
    spec:
      template:
        metadata:
          annotations:
            proidc.cloud-spaces.upbound.io/audience: sts.amazonaws.com
        spec:
          containers:
          - name: package-runtime
            env:
            - name: AWS_WEB_IDENTITY_TOKEN_FILE
              value: /var/run/secrets/upbound.io/provider/token
            - name: AWS_ROLE_ARN
              value: arn:aws:iam::$AWS_ACCOUNT_ID:role/$ROLE_NAME
            - name: AWS_REGION
              value: $AWS_REGION
      selector: {}
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-helm
spec:
  package: xpkg.upbound.io/upbound/provider-helm:v1.1.0
  runtimeConfigRef:
    name: helm-aws-audience
```

Replace `$AWS_ACCOUNT_ID`, `$ROLE_NAME`, and `$AWS_REGION` with your values.

</TabItem>

<TabItem value="eks" label="Running in EKS">

:::important
This assumes you have already configured [IRSA](#aws-irsa) or [EKS Pod
Identity][eks-pod-identity] for the provider-helm package. The provider's
service account must have the appropriate IAM role annotation. 
:::

For providers running directly in EKS with IRSA, install the provider with your
IRSA DeploymentRuntimeConfig:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-helm
spec:
  package: xpkg.upbound.io/upbound/provider-helm:v1.1.0
  runtimeConfigRef:
    name: irsa-runtimeconfig
```

EKS automatically injects the web identity token when the service account has
the `eks.amazonaws.com/role-arn` annotation. Refer to the [IRSA
section](#aws-irsa) for the complete setup.

</TabItem>
</Tabs>

#### Create a kubeconfig secret

Generate a kubeconfig for your EKS cluster using the AWS CLI:

```shell
aws eks update-kubeconfig \
  --region $AWS_REGION \
  --name $CLUSTER_NAME \
  --profile $AWS_PROFILE \
  --kubeconfig eks-kubeconfig.txt
```
Create a Secret containing the kubeconfig for your EKS cluster. Use an empty
user configuration in the kubeconfig, as the provider reads AWS credentials
from environment variables:

```yaml
apiVersion: v1
kind: Secret
metadata:
  namespace: crossplane-system
  name: helm-cluster-config
type: Opaque
stringData:
  kubeconfig: |
    apiVersion: v1
    clusters:
    - cluster:
        certificate-authority-data: $CERTIFICATE_AUTHORITY_DATA
        server: https://$EKS_CLUSTER_ENDPOINT
      name: $EKS_CLUSTER_ARN
    contexts:
    - context:
        cluster: $EKS_CLUSTER_ARN
        user: $EKS_CLUSTER_ARN
      name: $EKS_CLUSTER_ARN
    current-context: $EKS_CLUSTER_ARN
    kind: Config
    preferences: {}
    users:
    - name: $EKS_CLUSTER_ARN
      user: {}
```

Replace the following placeholders with values from your generated kubeconfig:
- `$CERTIFICATE_AUTHORITY_DATA`: The base64-encoded certificate authority data for your EKS cluster
- `$EKS_CLUSTER_ENDPOINT`: Your EKS cluster endpoint (for example, `ABC123.gr7.us-west-2.eks.amazonaws.com`)
- `$EKS_CLUSTER_ARN`: Your EKS cluster ARN (for example, `arn:aws:eks:us-west-2:123456789012:cluster/my-cluster`)

#### Create a ProviderConfig

Create a ProviderConfig that uses the Secret credentials and AWS Web Identity
for authentication:

```yaml
apiVersion: helm.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: helm-cluster-config
      key: kubeconfig
  identity:
    source: InjectedIdentity
    type: AWSWebIdentityCredentials
```

[upbound-cloud-spaces]: /self-hosted-spaces/overview
[aws-iam-console]: https://console.aws.amazon.com/iam
[identity-providers-add-provider]: https://console.aws.amazon.com/iamv2/home#/identity_providers/create
[aws-iam-role]: https://console.aws.amazon.com/iamv2/home#/roles
[aws-account-id]: https://docs.aws.amazon.com/signin/latest/userguide/console_account-alias.html
[download-your-aws-access-key]: https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/welcome.html
[aws-iam-role-chaining]: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_terms-and-concepts.html#iam-term-role-chaining
[assumerolewithwebidentity]: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html
[iam-oidc-provider]: https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
[trust-policy]: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_terms-and-concepts.html#term_trust-policy
[aws-instructions]: https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
[aws-trust-policies-blog]: https://aws.amazon.com/blogs/security/how-to-use-trust-policies-with-iam-roles/
[aws-iam-roles-for-service-accounts]: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
[eks-pod-identity]: https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html
[eks-pod-identity-agent]: https://docs.aws.amazon.com/eks/latest/userguide/pod-id-agent-setup.html
[azure-portal]: https://portal.azure.com/
[microsoft-entra-id]: https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/Overview
[subscriptions]: https://portal.azure.com/#view/Microsoft_Azure_Billing/SubscriptionsBlade
[microsoft-azure-service-principal-documentation]: https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal
[gcp-iam-admin-console]: https://console.cloud.google.com/iam-admin/iam
[workload-identity-federation]: https://console.cloud.google.com/iam-admin/workload-identity-pools
[service-accounts]: https://console.cloud.google.com/iam-admin/serviceaccounts
[download-your-gcp-service-account-key]: https://cloud.google.com/iam/docs/keys-create-delete#creating
[token-for-a-service-account]: https://cloud.google.com/iam/docs/create-short-lived-credentials-direct#sa-credentials-oauth
[gcloud-cli]: https://cloud.google.com/sdk/gcloud/reference/auth/print-access-token
[provider-gcp-github-repository]: https://github.com/crossplane-contrib/provider-upjet-gcp/tree/main/examples/providerconfig
[service-account-impersonation]: https://cloud.google.com/iam/docs/service-account-overview#impersonation
[gcp-service-account]: https://cloud.google.com/iam/docs/service-account-overview
[gcp-documentation-to-create-a-new-service-account]: https://cloud.google.com/iam/docs/service-accounts-create
[gcp-iam-policy-binding]: https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
[gcp-iam-service-account-policy-binding]: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/add-iam-policy-binding
[gcp-service-account-impersonation-documentation]: https://cloud.google.com/iam/docs/service-account-impersonation
[workload-identity]: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
[upbound-apis]: /cloud-spaces/howtos/gitops-on-upbound/#gitops-for-upbound-resources
[jq-install]: https://jqlang.github.io/jq/download/
[to-a-team]: /manuals/platform/robots/#assign-a-robot-to-a-team
[grant-the-team-a-role]: /manuals/platform/teams/
[generate-a-kubeconfig-for-a-space]: /manuals/cli/howtos/context-config/#generate-a-kubeconfig-for-a-space
[generate-a-kubeconfig-for-a-control-plane-in-a-space]: /manuals/cli/howtos/context-config/#generate-a-kubeconfig-for-a-control-plane-in-a-group
[eks-access-entries]: https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html
[aws-auth-configmap]: https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html
[eks-pod-identity]: https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html
[aws-oidc]: /manuals/packages/providers/aws-auth/aws-oidc
[aws-keys]: /manuals/packages/providers/aws-auth/aws-access-keys
[aws-webidentity]: /manuals/packages/providers/aws-auth/aws-web-identity
[aws-irsa]: /manuals/packages/providers/aws-auth/aws-irsa
[aws-pod-identity]: /manuals/packages/providers/aws-auth/aws-pod-identity
