---
title: Insights for AI assistants and agents
sidebar_label: AI assistants & agents
description: One API that lets assistants and agents query and act across the whole estate.
---

## One API for the estate

- Assistants and agents need one place to understand and act on infrastructure.
    Insights exposes a single API across every control plane.

## What the API gives an agent

- **One API to connect**. Query the entire estate through `hub.upbound.io/v1alpha1`.
- **Understands your APIs**. The schema of every defined type is available, so an
    agent knows what it can ask for (cross-link: [Query API][queryApi],
    `typedefinitions`).
- **Searches embedded knowledge**. Docs included in deployed packages are
    searchable through the Catalog (`catalog.hub.upbound.io/v1alpha1`).
- **Catalog and knowledge overlay**. Layer your own runbooks, policies, and context
    on top. Open: confirm what exists today vs planned.
- **Seconds, not SSH sessions**. One call replaces many clusters and raw YAML.

## Auth for agents

- Same authorization model as humans: scoped to what the identity can see.
- Open: how do agents authenticate (service identity or token)? Confirm.

## Next steps

- [Query API][queryApi]
- [Overview][overview]

[queryApi]: ./query-api.md
[overview]: ./overview.md
