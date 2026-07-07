---
title: Scalability and performance
sidebar_label: Scalability & performance
description: How to size, scale, and keep Insights up.
---

## Sizing (outline)

- Small, medium, and large tiers, each with target replica counts and resource
    limits, plus a chart to help you pick. Fill from `production/sizing.md`.

## High availability (outline)

- `hub-api` replicas, PodDisruptionBudgets, and topology spread.
- Notes on keeping the database up.

## Autoscaling (outline)

- HPA for `hub-api`. Scale the database on its own.

## Performance (outline)

- How the connector syncs, and the cost of its first pass.
- Query paging (`pageSize`, `page`, `.metadata.continue`).

[prod]: ./overview.md
