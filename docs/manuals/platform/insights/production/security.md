---
title: Security guidelines
sidebar_label: Security
description: Security guidance for a production Insights deployment.
---

## Authentication (outline)

- OIDC authenticates humans. Use one provider per deployment. See [set up
    OIDC][oidc].
- Connectors authenticate with per-control-plane registration tokens.

## Authorization (outline)

- A three-tier model. Bind OIDC groups to roles.
- Insights scopes query results to `kubectl`-equivalent visibility.
- Open: resolve the role-name mismatch (`org-admin` vs `admin`) with engineering.

## Transport and secrets (outline)

- CA-signed TLS at the gateway. No plaintext `hubApiUrl` outside the local demo.
- Where registration tokens and OIDC client secrets live, and how they rotate.

## Network (outline)

- Connectors are push-only. `hub-api` never dials into observed clusters.

[oidc]: ../install/oidc/overview.md
