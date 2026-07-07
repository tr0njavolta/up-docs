---
title: Set up OIDC
sidebar_label: Overview
description: Configure an OIDC provider for Insights authentication.
---

## What Insights needs from OIDC

- OIDC discovery and the authorization-code flow.
- `email` and `email_verified` claims.
- A configurable group claim (default `groups`).
- Redirect URI `<externalURL>/oidc/callback`.

Insights supports one OIDC provider per deployment. Insights delegates sessions to
the provider. It doesn't own the session lifecycle.

## Supported providers

| Provider | Guide |
|---|---|
| Microsoft Entra ID | [Entra ID][entra] |
| Keycloak | [Keycloak][keycloak] |
| Generic OIDC | [Generic][generic] |

## Setup order

1. Create the app or client in your provider.
2. Configure the redirect URI and group claim.
3. Set the OIDC values in `values.yaml` and install or upgrade.
4. Verify login and group-to-role mapping.

[entra]: ./entra-id.md
[keycloak]: ./keycloak.md
[generic]: ./generic.md
