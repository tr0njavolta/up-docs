---
title: Pull secrets
sidebar_position: 1
description: Learn how to configure access to backport releases of Official providers from
  the Marketplace
---

You must configure a pull secret on your control plane to pull backport releases of Official Providers. If you're on
Crossplane, UXP v1.18 or later, UXP v1.16.4, or UXP v1.17.3, use the ImageConfig API. Otherwise, configure a pull secret for each provider pod.

:::important
This policy only applies for provider versions published after March 25, 2025. Read the [access policy][access-policy] documentation for more information.
:::

### Crossplane and UXP v1.16+

:::tip
Crossplane `v1.18` introduced the `ImageConfig` API and backported it to `v1.16.4` and `v1.17.3`. Make sure you're running these versions before using this API.
:::

1. Login to your Upbound org account

```bash
up login
```
2. Create a [robot and robot token][robot-and-robot-token] using the up CLI:

```bash
up robot create provider-pull-bot
up robot token create provider-pull-bot provider-pull-token --file - | jq -r '.token'
```

:::note
Follow the [`jq` installation guide][jq-install] if your machine doesn't include
it by default. 
:::

3. Save the `Access ID` value of the output to a variable named `ID`. Save the `Token` value to a variable named `TOKEN`:

```bash
ID=<the ID outputted in the previous step>
TOKEN=<the token outputted in the previous ste>
```
4. Create a [pull secret][pull-secret] on your control plane:
```bash
kubectl -n crossplane-system create secret docker-registry up-provider-pull-secret --docker-server=xpkg.upbound.io --docker-username=$ID --docker-password=$TOKEN
```

5. Create an `ImageConfig` resource and reference the pull secret you created earlier:
```yaml
apiVersion: pkg.crossplane.io/v1beta1
kind: ImageConfig
metadata:
  name: official-provider-auth
spec:
  matchImages:
    - prefix: xpkg.upbound.io/upbound
      type: Prefix
  registry:
    authentication:
      pullSecretRef:
        name: up-provider-pull-secret
```

This pull secret matches all packages with the `xpkg.upbound.io/upbound` prefix
and provides the package pull secret when the control plane needs to pull the
provider image.

### Older Crossplane versions

If you're on an older version of Crossplane, you need to create a package pull secret and configure each Provider package to use it:


1. Login to your Upbound org account

```bash
up login
```

2. Create a [robot and robot token][robot-and-robot-token-1] using the up CLI:

```bash
up robot create provider-pull-bot
up robot token create provider-pull-bot provider-pull-token --output=-
```

3. Save the `Access ID` value of the output to a variable named `ID`. Save the `Token` value to a variable named `TOKEN`:

```bash
ID=<the ID outputted in the previous step>
TOKEN=<the token outputted in the previous ste>
```
4. Create a [pull secret][pull-secret-1] on your control plane:
```bash
kubectl -n crossplane-system create secret docker-registry up-provider-pull-secret --docker-server=xpkg.upbound.io --docker-username=$ID --docker-password=$TOKEN
```

5. **For each provider package installed on your control plane**, update it's `.spec` to reference the pull secret:
```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-s3
spec:
  packagePullSecrets:
    - name: up-provider-pull-secret
# Removed for brevity
```

[jq-install]: https://jqlang.org/download/
[access-policy]: /manuals/packages/policies
[robot-and-robot-token]: /manuals/platform/robots
[robot-and-robot-token-1]: /manuals/platform/robots
[pull-secret]: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/#registry-secret-existing-credentials
[pull-secret-1]: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/#registry-secret-existing-credentials
