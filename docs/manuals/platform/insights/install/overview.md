---
title: Install Insights
sidebar_label: Overview
description: Pick an install path and a deployment method.
---

## Pick an install path

| Path | Use when | Guide |
|---|---|---|
| Demo | Evaluate on your laptop, single KIND cluster | [Quickstart][demo] |
| Self-hosted | Real cluster on AWS, GCP, or Azure | [Self-hosted quickstart][selfhosted] |

## Deployment method

Both paths install with either the up CLI or Helm. The up CLI wraps the Helm
install and is the recommended path.

<Tabs>
<TabItem value="cli" label="up CLI (recommended)">

- Outline: `up hub install` installs the components and wires defaults.

</TabItem>
<TabItem value="helm" label="Helm">

- Install the umbrella `hub` chart:

  ```shell
  helm install hub <chart-ref> --namespace hub --create-namespace --values values.yaml
  ```

- The connector installs separately per control plane. See [connect a control
    plane][connect].

</TabItem>
</Tabs>

## Next steps

- [Self-hosted quickstart (AWS/GCP/Azure)][selfhosted]
- [Set up OIDC][oidc]
- [Production guidelines][prod]

[demo]: /getstarted/new-users/controlplanes-quickstart
[selfhosted]: ./self-hosted.md
[oidc]: ./oidc/overview.md
[connect]: ../connections.md
[prod]: ../production/overview.md
