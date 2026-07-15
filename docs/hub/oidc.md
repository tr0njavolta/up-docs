---
title: Connect control planes to external services
sidebar_position: 9
description: A guide for authenticating control plane with external services, including using OIDC
---

<!-- vale gitlab.SentenceLength = NO -->
Control planes in Upbound use [Crossplane providers][crossplane-providers] to interact with external services. External services could be hyper scale cloud providers, version control services, ticketing platforms, or anything else that has a public API. Control planes can connect to an unlimited number of external services--provided there's a Crossplane provider in the [Marketplace][marketplace].
<!-- vale gitlab.SentenceLength = YES -->

## How to connect to an external service

### Install a provider on your control plane

Install a Crossplane provider or Configuration on your control plane as explained in the [control plane management][control-plane-management] documentation.

### Configure the provider

Crossplane providers use a [`ProviderConfig`][providerconfig] Kubernetes object to supply credentials to authenticate with external services. For example, [Upbound's AWS provider][upbound-s-aws-provider] offers a [`ProviderConfig`][providerconfig--1] that supports [supplying credentials][supplying-credentials] via a Kubernetes `Secret`, environment variable, file, and more.

### Connect to multiple accounts within a service

You can create multiple `ProviderConfigs` for a single provider in a control plane via the Upbound Console or by a direct connection through the CLI.

For example, imagine you have `team-a` and `team-b` sharing a single control plane. Suppose each team should only be able to create resources in their respective cloud account in AWS. You would create two ProviderConfigs as demonstrated below:

```yaml
# This is the ProviderConfig that will get used by team-a
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: team-a-config
spec:
  credentials:
    secretRef:
      key: credentials
      name: team-a-account-creds
      namespace: upbound-system
    source: Secret
---
# This is the ProviderConfig that will get used by team-b
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: team-b-config
spec:
  credentials:
    secretRef:
      key: credentials
      name: team-b-account-creds
      namespace: upbound-system
    source: Secret
```

When a team creates resources with the control plane, reference the appropriate ProviderConfig to use from the `spec.providerConfigRef` field of any managed resource.

<!-- vale Google.WordList = NO -->
:::tip
The example above demonstrates ProviderConfigs using static account credentials.
**Don't use this auth method for production purposes.** Instead, configure your
providers to use Upbound Identity, based on OIDC and described below.
:::
<!-- vale Google.WordList = YES -->

## Use OpenID Connect with Upbound

Providers in Upbound control planes can also use an `Upbound` credential source called **Provider Identity**. The `Upbound` credential source uses OpenID Connect (`OIDC`) to authenticate to providers without requiring users to store credentials on Upbound. This authentication method is comparable to ["workload identity"][workload-identity] offered by some managed Kubernetes services.

[OpenID Connect (OIDC)][openid-connect-oidc] is a protocol that's built on top of [OAuth 2.0][oauth-2-0]. It serves to establish the identity of an entity in one environment that's attempting to access resources in another.

### Configure Upbound identity for a provider

To configure a provider on a control plane to use Upbound Identity, use the auth method called `Upbound`. Exact configuration varies depending on the provider. Find examples below for AWS, Azure, and GCP:

#### Upbound identity for AWS example

First, add Upbound as an OpenID Connect provider in your AWS account. Then, create a ProviderConfig on your control plane with the following configuration:

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
        roleARN: <arn:aws:iam::12345969492:role/your-role>
```
:::tip
Read the [provider-aws authentication][provider-aws-authentication] documentation for full setup instructions.
:::

#### Upbound identity for Azure example

First register Upbound with Azure Active Directory in your Azure account. Then, create a ProviderConfig on your control plane with the following configuration:

```yaml
apiVersion: azure.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  clientID: <client-id>
  tenantID: <tenant-id>
  subscriptionID: <subscription-id>
  credentials:
    source: Upbound
```

:::tip
Read the [provider-azure authentication][provider-azure-authentication] documentation for full setup instructions.
:::

#### Upbound identity for GCP example

First, configure Upbound for workload identity federation in your GCP account. Then, create a ProviderConfig on your control plane with the following configuration:

```yaml
apiVersion: gcp.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  projectID: <your-gcp-project>
  credentials:
    source: Upbound
    upbound:
      federation:
        providerID: projects/<project-id>/locations/global/workloadIdentityPools/<identity-pool>/providers/<identity-provider>
        serviceAccount: <service-account-name>@<project-name>.iam.gserviceaccount.com>
```

:::tip
Read the [provider-gcp authentication][provider-gcp-authentication] documentation for full setup instructions.
:::

## Deploy Upbound OIDC tokens to arbitrary provider and function packages

Create a [_DeploymentRuntimeConfig_][_deploymentruntimeconfig_] in a control plane on Upbound:

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
            proidc.cloud-spaces.upbound.io/audience: my-audience-name
      selector:
        matchLabels: {}
```

Install your desired provider or function and reference the _DeploymentRuntimeConfig_. The example below demonstrates doing this with [provider-helm][provider-helm]:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-helm
spec:
  package: xpkg.upbound.io/crossplane-contrib/provider-helm:v0.21.1
  runtimeConfigRef:
    name: aws-audience
```

The provider or function pod now contains an Upbound OIDC token with the audience set to `my-audience-name`. The token in `/var/run/secrets/upbound.io/provider/token` applies to both provider and function pods.

:::warning
You can't customize the audience on AWS, Azure, and GCP Official providers because the audience is automatic.
:::

## OIDC explained

OIDC calls the two parties the **OpenID Providers (OPs)** and **Relying Parties (RPs)**. Control planes define these roles as follows:

- **OpenID Provider**: Upbound
- **Relying Party**: an external service that supports OIDC, for example, AWS, Azure or GCP

Users set up a _trust relationship_ between Upbound and the external service. Upbound uses the trust relationship instead of storing credentials for an external service in the control plane.

Upbound injects an _identity token_ into the file system of every provider `Pod`. Upbound sends the token to the external service and exchanges it for a short-lived credential. Upbound uses the short-lived credential to perform operations against the external service.

### Creating trust relationships

Every OIDC relying party implements its own mechanism for establishing a trust relationship and associating permissions. Typically, the process involves the following broad steps:

1. Specifying the _issuer_. For Upbound, this is `https://proidc.upbound.io`.
2. Specifying an _audience_. This may vary by relying party.
3. Creating a role or service account that an entity possessing a valid identity
   token can assume.
4. Associating permissions with the role or service account.

Different OIDC relaying parties may define valid tokens differently. Typically it involves writing a policy that restricts what _subject_ can assume the role or service account.

<!-- vale gitlab.SentenceLength = NO -->
:::warning
Authoring a policy with appropriate access controls is critical to ensure that only your provider in your control plane is able to assume the role or service account.
:::
<!-- vale gitlab.SentenceLength = YES -->

Identity tokens are [JSON Web Tokens (`JWTs`)][json-web-tokens-jwts]. The OIDC _claims_ supported by Upbound are available in the OIDC metadata endpoint at `https://proidc.upbound.io/.well-known/openid-configuration`.

```json
{
  "issuer": "https://proidc.upbound.io",
  "jwks_uri": "https://proidc.upbound.io/.well-known/jwks",
  "response_types_supported": [
    "id_token"
  ],
  "subject_types_supported": [
    "public"
  ],
  "id_token_signing_alg_values_supported": [
    "RS256"
  ],
  "claims_supported": [
    "sub",
    "aud",
    "exp",
    "iat",
    "iss",
    "jti",
    "nbf"
  ]
}
```

OIDC relying parties use this information to validate identity tokens. Relying parties use the `jwks_uri` to ensure that the OIDC provider signed the identity token with their private key. The private key must correspond to one of the public keys from `https://proidc.upbound.io/.well-known/jwks`.

The `iss` and `aud` claims of an identity token should match the _issuer_ and _audience_ configured for the relying party. The `sub` should be a valid _subject_ based on the authored policy. For providers running in Upbound control planes, the _subject_ adheres to the following format.

```
mcp:<account>/<mcp-name>:provider:<provider-name>
```

For example, the following would be a valid _subject_ for `provider-aws` in a control plane named `prod-1` in the `my-org` account.

```
mcp:my-org/prod-1:provider:provider-aws
```
<!-- vale write-good.TooWordy = NO -->
You can include an optional `group` field in the trust path as an additional
security measure. This ensures the control plane has the correct name _and_
correct group to prevent cross-group impersonation from another administrator in another
group.
<!-- vale write-good.TooWordy = YES -->

Add the following control plane annotation to include the `group` field:

```
proidc.cloud-spaces.upbound.io/group-scoped: "true"
```

Then use the following _subject_:

```
mcp:<organization>/<space>/<group>/<controlPlane>:<provider>
```

The claims for an identity token injected into the file system of a provider in a control plane looks like the following.

```json
{
  "iss": "https://proidc.upbound.io",
  "sub": "mcp:my-org/prod1:provider:provider-aws",
  "aud": [
    "sts.amazonaws.com"
  ],
  "exp": 1680124165,
  "nbf": 1680120565,
  "iat": 1680120565,
  "jti": "YL1ouQ5KJiTY2QShIRczqQ=="
}
```
<!-- vale write-good.TooWordy = NO -->
:::tip
Identity tokens injected into a provider `Pod` are valid for 1 hour. These
tokens automatically refresh before expiration to ensure there is no
interruption in service.
:::
<!-- vale write-good.TooWordy = YES -->

## Add Upbound OIDC to a Crossplane provider

Any provider that can run in a control plane can support the `Upbound` credential source. Upbound injects identity tokens into the file system of every provider `Pod` whether they support OIDC or not. A provider wishing to support OIDC can access its identity token in the `/var/run/secrets/upbound.io/provider/token` file.

View [this Pull Request][this-pull-request] for a reference implementation.


[control-plane-management]: /self-hosted-spaces/concepts/control-planes
[provider-azure-authentication]:/manuals/packages/providers/authentication#azure-upbound-oidc
[provider-gcp-authentication]:/manuals/packages/providers/authentication#gcp-upbound-oidc
[crossplane-providers]: https://docs.crossplane.io/latest/packages/providers/
[marketplace]: https://marketplace.upbound.io/providers
[providerconfig]: https://docs.crossplane.io/latest/packages/providers/#provider-configuration
[upbound-s-aws-provider]: https://marketplace.upbound.io/providers/upbound/provider-family-aws/latest
[providerconfig--1]: https://marketplace.upbound.io/providers/upbound/provider-aws/latest/resources/aws.upbound.io/ProviderConfig/v1beta1
[supplying-credentials]: https://marketplace.upbound.io/providers/upbound/provider-aws/latest/resources/aws.upbound.io/ProviderConfig/v1beta1#doc:spec-credentials-source
[workload-identity]: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
[openid-connect-oidc]: https://openid.net/connect/
[oauth-2-0]: https://oauth.net/2/
[provider-aws-authentication]:/manuals/packages/providers/authentication#aws-upbound-oidc
[_deploymentruntimeconfig_]: https://docs.crossplane.io/latest/packages/providers/#runtime-configuration
[provider-helm]: https://marketplace.upbound.io/providers/upbound/provider-helm/
[json-web-tokens-jwts]: https://www.rfc-editor.org/rfc/rfc7519
[this-pull-request]: https://github.com/upbound/provider-aws/pull/278
