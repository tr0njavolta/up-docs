---
title: Query API
sidebar_position: 2
description: The Query API
tier: "standard"
---

The Query API is now compatible with UXP 2.0 and can operate in a
"single-tenant" mode.

Upbound enables the Query API by default, but you can disable it. All queries
made in the Crossplane WebUI use the Query API in the background.

<!-- vale off -->

## UXP Query API Explorer

<!-- vale on -->

import CrdDocViewer from '@site/src/components/CrdViewer';

### Query

The Query resource allows you to query objects in a single control plane.

<CrdDocViewer crdUrl="/crds/query/spaces.upbound.io_queries.yaml" />

<!-- ignore "aggregate" -->
<!-- vale write-good.TooWordy = YES -->


