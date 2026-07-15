---
title: OIDC with Keycloak
sidebar_label: Keycloak
description: Configure Keycloak as the OIDC provider for Hub.
---

## Steps (outline)

1. Create a realm and an OIDC client in Keycloak.
2. Set the redirect URI `<externalURL>/oidc/callback`.
3. Add a group membership mapper (`groups` claim).
4. Capture the issuer URL, client ID, and client secret.
5. Set the OIDC values in `values.yaml` and install/upgrade.
6. Verify login and group mapping.

[oidc]: /hub/oidc-configuration
