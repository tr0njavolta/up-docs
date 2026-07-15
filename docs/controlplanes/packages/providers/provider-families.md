---
title: Provider families
sidebar_position: 1
description: Install and configure Crossplane Provider families
---

Upbound packages each of the official providers for Amazon AWS, Google GCP and Microsoft Azure as a "family." 

A provider family organizes the provider's resources into unique packages, organized by a common set of services.

Provider families reduce the resources required to install and run providers and
improve performance over a single monolithic provider.

## Provider family requirements

Provider families have the following requirements and restrictions:

* Crossplane version 1.12.1 or [UXP][uxp] version 1.12.1-up.1 or later
* Remove existing [monolithic providers][monolithic-providers] matching the new provider family.

:::warning
If a provider family installs into a cluster with an existing monolithic provider, the family provider doesn't take effect. 

The monolithic provider continues to own all provider resource endpoints until it's removed.

For information on migrating from monolithic providers to provider families read the 
[family providers migration guide][family-providers-migration-guide]
:::

## Installing a provider family

<!-- vale write-good.Passive = NO -->
:::important
Backport releases of Official Providers require at least a `Standard` subscription to Upbound and a package pull secret to be placed on your control plane. Main releases published within the last 12 months are available to all users. Learn more in the [package policies][package-policies].
:::
<!-- vale write-good.Passive = YES -->

Installing a provider family is identical to installing other Crossplane providers.
Create a Provider object with the provider package to install.

For example, to install the provider family AWS S3 provider:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: upbound-provider-aws
spec:
  package: xpkg.upbound.io/upbound/provider-aws-s3:v1.16.0
```

Install multiple services with multiple Provider objects. For example to install both AWS S3 and EC2 providers:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: upbound-provider-aws-s3
spec:
  package: xpkg.upbound.io/upbound/provider-aws-s3:v1.16.0
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: upbound-provider-aws-ec2
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v1.16.0
```

:::tip
Browse the [Upbound Marketplace][upbound-marketplace] to find the provider services to install. 
:::

<details>

<summary>Install Providers in an offline environment</summary>

To install Providers in an offline environment set 
<Hover label="air" line="7">skipDependencyResolution: true</Hover> in
the Provider.

<div id="air">
```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: upbound-provider-aws-s3
spec:
  package: xpkg.upbound.io/upbound/provider-aws-s3:v1.16.0
  skipDependencyResolution: true
```
</div>

When installing multiple providers, apply `skipDependencyResolution` to every
Provider.

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: upbound-provider-aws-s3
spec:
  package: xpkg.upbound.io/upbound/provider-aws-s3:v1.16.0
  skipDependencyResolution: true
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: upbound-provider-aws-ec2
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v1.16.0
  skipDependencyResolution: true
```

</details>

View the installed providers with `kubectl get providers`

```shell {copy-lines="1",label="getproviders"}
kubectl get providers
NAME                          INSTALLED   HEALTHY   PACKAGE                                               AGE
upbound-provider-aws-ec2      True        True      xpkg.upbound.io/upbound/provider-aws-ec2:v1.16.0      25m
upbound-provider-aws-s3       True        True      xpkg.upbound.io/upbound/provider-aws-s3:v1.16.0       25m
upbound-provider-family-aws   True        True      xpkg.upbound.io/upbound/provider-family-aws:v1.16.0   24m
```

The first provider installed of a family also installs an extra
<Hover label="getproviders" line="5">provider-family</Hover> Provider.
The `provider-family` provider manages the ProviderConfig
for all other providers in the same family. 

<!-- vale write-good.Passive = NO -->
:::tip
Each family provider declares a dependency on the *latest available version* of the corresponding `provider-family`,
which is automatically resolved and installed by the Crossplane package manager.

This means installing an older family provider may pull in a newer
`provider-family`. This version mismatch is expected and safe to ignore.


If you still want to control the version of the `provider-family`, consider using the
<Hover label="air" line="7">skipDependencyResolution: true</Hover> option as described in the
**Install Providers in an offline environment** section above.
:::
<!-- vale write-good.Passive = YES -->

## Using ControllerConfigs

The [ControllerConfig][controllerconfig] applies settings to a Provider Pod. With family providers
each provider is a unique Pod running in the cluster. 

When using ControllerConfigs with family providers, each provider needs
a ControllerConfig applied.

For example, both providers reference the same 
<Hover label="cc" line="8">controllerConfigRef.name</Hover >

<div id = "cc">
```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: upbound-provider-aws-s3
spec:
  package: xpkg.upbound.io/upbound/provider-aws-s3:v1.16.0
  controllerConfigRef:
    name: my-controllerconfig
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: upbound-provider-aws-ec2
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v1.16.0
  controllerConfigRef:
    name: my-controllerconfig
---
apiVersion: pkg.crossplane.io/v1alpha1
kind: ControllerConfig
metadata:
  name: my-controllerconfig
```
</div>

[uxp]: /manuals/uxp/overview/
[monolithic-providers]: /manuals/packages/providers/monolithic
[family-providers-migration-guide]: /manuals/packages/providers/migration
[upbound-marketplace]: https://marketplace.upbound.io/providers?tier=official
[controllerconfig]: https://docs.crossplane.io/latest/packages/#speccontrollerconfigref
[package-policies]: /manuals/packages/policies
