---
title: Public preview and alpha features
sidebar_label: Feature flags
description: How to enable preview features and what to expect.
---

## What preview features are

- Some capabilities sit behind feature flags as public preview or alpha.
    They're off by default.

:::warning
Upbound can change or remove preview and alpha features without notice, and they
may introduce breaking changes between releases. Don't depend on them in
production.
:::

## How to enable a flag

<Tabs>
<TabItem value="cli" label="up CLI (recommended)">

- Outline: `up hub configure` or an equivalent flag-setting command. **Open:** the
    `up` CLI path for Hub is product-intended but not yet in the current eng docs.
    Confirm the command before publishing.

</TabItem>
<TabItem value="helm" label="Helm">

- Set the flag as a Helm value on the `hub` chart:

  ```shell
  helm upgrade hub <chart-ref> -n hub --reuse-values \
    --set hub-api.catalog.enabled=true
  ```

</TabItem>
</Tabs>

## What flags exist

| Flag | Enables | Status |
|---|---|---|
| `hub-api.catalog.enabled` | Catalog API | preview |
| `hub-api.catalog.ingest.enabled` | Catalog ingestion | preview |
| `hub-api.catalog.enrichment.enabled` | Catalog enrichment | preview |
| _…_ | _complete from values reference_ | |

- Note: a flag that's off typically returns `404` on its endpoints.
- Open: document the OFREP feature-flag endpoint if it's user-facing.

## Next steps

- [Query API][queryApi] (Catalog endpoints)

[queryApi]: ./query-api.md
