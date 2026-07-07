---
title: OIDC with Microsoft Entra ID
sidebar_label: Entra ID
description: Configure Microsoft Entra ID as the OIDC provider for Insights.
---

## Steps (outline)

1. Register an application in Entra ID.
2. Add the redirect URI `<externalURL>/oidc/callback`.
3. Configure a groups claim.
4. Capture the issuer URL, client ID, and client secret.
5. Set the OIDC values in `values.yaml` and install/upgrade.
6. Verify login and group mapping.

[oidc]: ./overview.md
