---
title: OIDC with a generic provider
sidebar_label: Generic
description: Configure any standards-compliant OIDC provider for Insights.
---

## Requirements

- OIDC discovery endpoint and authorization-code flow.
- `email` and `email_verified` claims.
- A configurable group claim (default `groups`).

## Steps (outline)

1. Create an OIDC client in your provider.
2. Set the redirect URI `<externalURL>/oidc/callback`.
3. Map the group claim.
4. Capture the issuer URL, client ID, and client secret.
5. Set the OIDC values in `values.yaml` and install/upgrade.
6. Verify login and group mapping.

[oidc]: ./overview.md
