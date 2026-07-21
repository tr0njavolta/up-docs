---
title: OIDC configuration
sidebar_position: 3
description: Configure Hub against an external OIDC provider.
---

This page explains what Hub requires from an OIDC provider, the order to
configure it, and how to pick a provider-specific sub-guide.

Hub delegates all human authentication to an external OIDC provider. The
provider issues ID tokens to users logging in to the Hub UI. Hub trusts those
tokens and reads identity and group claims to drive authorization.

## What Hub requires from your OIDC provider

Any [OIDC-compliant][oidc-compliant] provider that meets the
following criteria works with Hub:
<!-- vale Google.WordList = NO -->
- **OIDC discovery.** The provider publishes a
  `.well-known/openid-configuration` document at a stable issuer URL. Hub
  fetches this document at startup to learn the authorization, token, and JWKS
  endpoints.
- **Authorization code flow.** Hub uses the redirect-based authorization code
  flow for browser sign-in. You register Hub as a client (sometimes called an
  "application" or "app registration") and receive a client ID and client
  secret.
- **Email claim.** The ID token must include an `email` claim and an
  `email_verified` claim. Hub uses the email as the canonical username and
  rejects logins where `email_verified` isn't `true`.
- **Group claim.** The ID token must include a claim that lists the user's group
  memberships. The claim name is configurable on the IdentityProvider resource.
  The default is `groups`. Group values are what you bind to Hub roles to grant
  privileges within the system.
- **Redirect URI.** The provider must accept Hub's callback URL as a registered
  redirect URI. The callback is always `<externalURL>/oidc/callback`, where
  `<externalURL>` is the public base URL of `hub-api` (set via
  `hub-api.api.externalURL`).
<!-- vale Google.WordList = YES -->

:::note
If your provider emits groups under a non-standard claim name, see
[Provider-specific configuration](#provider-specific-configuration) for the
Hub-side deviation. (Entra ID emits `groups` only when explicitly configured;
Google Workspace doesn't emit groups in the ID token at all.)
:::

## Setup order

Configure OIDC in four stages, in this order. Skipping ahead leaves you
debugging across systems that can't yet see each other.

### 1. Provider-side

Done in your OIDC provider's console or API, before touching Hub.

- Create the users and groups you want to grant access to. At minimum, create
  the group you plan to bind to the Hub `org-admin` role.
- Configure the provider to emit group memberships in the ID token under a claim
  you control. Note the claim name.
- Register Hub as a client application. Record the client ID and client secret.
- Configure the redirect URI as `<externalURL>/oidc/callback`. You must know the
  public hostname of `hub-api` before this step.
- Look up the well-known discovery URL (the issuer URL) for the provider. This
  is the value you give to Hub.

### 2. Hub-side

Done in your Helm values, after you configure the provider.
<!-- vale write-good.Passive = NO -->
<!-- vale write-good.Weasel = NO -->
- Set `hub-api.api.externalURL` to the public base URL of `hub-api`. The
  redirect URI you registered in stage 1 must match this exactly.
- Set the OIDC values under `hub-api.api.sampleEmailBasedOIDCConfig`:
  - `providerName`. A short identifier used as a prefix on usernames and group
    names (such as `entra`, `google`, `cognito`). Defaults to `oidc`.
  - `issuerURL`. The issuer URL from stage 1.
  - `clientID`. The client ID from stage 1.
  - `clientSecret`. The client secret from stage 1. Provided via Helm values,
    this value is written into the bootstrap Secret. For production, supply the
    secret through your secret management workflow rather than committing it to
    values.
  - `allowedDomain`. Optional. If set, Hub rejects logins whose email doesn't
    end in `@<allowedDomain>`.
- Run `helm install` or `helm upgrade`. Hub generates an `IdentityProvider`
  resource named after `providerName` and applies it on startup.
- Create an `OrganizationRoleBinding` that binds your administrator group
  (prefixed with `<providerName>:`) to the `org-admin` role. Without this
  binding, the first user to log in has no permissions.
<!-- vale write-good.Weasel  = YES -->
<!-- vale write-good.Passive = YES -->

### 3. End-user login

Done from the browser, after you install the chart.

- Navigate to the Hub UI at the URL you configured.
- Sign in. The provider authenticates you and redirects back to Hub.
- Confirm Hub recognizes your identity and group memberships. A user with the
  bound administrator group sees the full UI. A user without any bound group
  sees an empty workspace.

## Provider-specific configuration

Register the Hub application in your provider following that provider's own
documentation. Hub needs no special setup beyond a confidential
authorization-code client with the `openid`, `email`, and `profile` scopes and
the redirect URI from [Setup Order](#setup-order).

Once the application exists, the only Hub-side settings that differ between
providers are the `issuerURL` and how group memberships reach the ID token.
Everything else in the `hub-api.api.sampleEmailBasedOIDCConfig` block from
stage 2 stays the same. The deviations for each provider are below.

### Standards-compliant providers

Providers that emit a `groups` claim out of the box (Keycloak, Auth0, Okta,
Dex, and similar) need no deviation.

- `issuerURL`: the `issuer` value published in the provider's
  `.well-known/openid-configuration`.
- Groups: emitted by default under the claim name `groups`. No override needed.

The `sampleEmailBasedOIDCConfig` block works as documented in stage 2.

<!-- vale Google.Headings = NO -->
### Amazon Cognito
<!-- vale Google.Headings = YES -->

See the [Amazon Cognito Developer Guide][amazon-cognito-developer-guide]
for user pool and app client setup.
<!-- vale write-good.Passive = NO -->
- `issuerURL`: `https://cognito-idp.<region>.amazonaws.com/<user-pool-id>`.
- Groups: membership is published under `cognito:groups`, not
  `groups`. The generated `IdentityProvider` maps only the username claim, so
  supply a customised provider via `hub-api.bootstrap.files` that overrides the
  group claim:
<!-- vale write-good.Passive = YES -->

  ```yaml
  claimMappings:
    username:
      claim: email
    groups:
      claim: "cognito:groups"
  ```

  With `providerName: cognito`, a Cognito group `admin` becomes the Hub subject
  `cognito:admin`.

<!-- vale Google.Headings = NO -->
### Microsoft Entra ID
<!-- vale Google.Headings = YES -->

See [Register an application with Microsoft Entra ID][register-an-application-with-microsoft-entra-id].
<!-- vale write-good.Passive = NO -->
- `issuerURL`: `https://login.microsoftonline.com/<tenant-id>/v2.0`. The `/v2.0`
  suffix is required, since Hub expects the v2.0 token format.
- Groups: the `groups` claim is omitted unless you add a groups optional
  claim under the app registration's **Token configuration**. Emit **Group ID**,
  so groups arrive as object IDs (UUIDs); bind role bindings to
  `<providerName>:<group-object-id>`. Once emitted, the claim is named `groups`,
  so no claim-mapping override is needed. Users belonging to more than ~150
  groups exceed the token overage limit and receive no `groups` claim at all.
  Prefer narrow security groups dedicated to Hub.
<!-- vale write-good.Passive = YES -->

<!-- vale Google.Headings = NO -->
### Google Workspace
<!-- vale Google.Headings = YES -->

See [Setting up OAuth 2.0][setting-up-oauth-2-0] for
OAuth client setup.

- `issuerURL`: `https://accounts.google.com` (fixed).
- Groups: group membership from Workspace never appears in the ID token.
  Choose one of:
  - **Bind to users.** Skip groups and bind roles to individual users by email
    (`<providerName>:alice@example.com`).
  - **Custom claim.** Inject a `groups` claim upstream (Cloud Identity custom
    attribute or an identity broker), then map it under
    `validation.claimMappings`.

## Next step

With your provider configured, set up the database Hub stores its state in:

- [Databases][overview]. Postgres requirements and per-provider
  provisioning.

Once your database is ready, [install Hub][install] to apply these values
and bind an administrator group to the `org-admin` role.

[amazon-cognito-developer-guide]: https://docs.aws.amazon.com/cognito/latest/developerguide/
[install]: /hub/howtos/install
[oidc-compliant]: https://openid.net/connect/
[overview]: /hub/howtos/databases/overview
[register-an-application-with-microsoft-entra-id]: https://learn.microsoft.com/entra/identity-platform/quickstart-register-app
[setting-up-oauth-2-0]: https://support.google.com/cloud/answer/6158849
