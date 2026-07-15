---
title: FAQ
sidebar_position: 50
description: Frequently asked questions related to Upbound Official providers
---

This page provides answers to the most common questions about Upbound Official Providers.

<!-- vale off -->
## Questions

<details>

    <summary>I'm using an Official Provider version published before March 25, 2025. Can I still pull it?</summary>

    Yes. The Official Provider [pull policy][pull-policy] only applies to Official Providers published after March 25, 2025.

</details>

<details>

    <summary>Can I pull an Official Provider release by full tag?</summary>

    Yes. The guidance shared in the documentation recommends anonymous or Individual tier users to use the convenience tags for Official Providers. For example:

```bash
    crossplane xpkg install provider xpkg.upbound.io/upbound/provider-aws-s3:v1 
```

    However, you may choose to still reference the latest release by full major.minor.patch tag scheme:

```bash
    crossplane xpkg install provider xpkg.upbound.io/upbound/provider-aws-s3:v1.19.0 
```

    For customers with a subscription to Upbound, you're encouraged to use a pinning-and-update strategy based on the full tag scheme that makes sense for you.

    Upbound advises anonymous and Individual tier users to use the `vMajor` tag scheme. It's durable to the change that occurs monthly when a new version of Official Providers gets released.
 </details>

<details>

    <summary>What's the relationship between an Official Provider and a community provider?</summary>

    Some Upbound Official Providers are downstream builds of provider source which exists upstream in [crossplane-contrib][crossplane-contrib]. [Provider-aws][provider-aws] is an example.

    While the providers share a common source, Upbound supplements Official Providers by building from a private pipeline that supplements Official Provider images with additional value-add. The community providers are free-use images built and published by the Crossplane community. Official Providers are built and published by Upbound, and have a commercial license.

</details>

<details>
    <summary>Can I mirror an Official Provider release?</summary>
   
   Yes. Upbound's policy doesn't prohibit the use of an artifact registry to mirror Official Provider releases.
 </details>

<details>
    <summary>Can I still pull an Official Provider release without needing an Upbound account?</summary>

Yes, however, it's only the latest release that can be pulled anonymously. When a new release _N_ is published, access is cut off from the _N-1_ for anonymous and Individual tier users.
 </details>

<details>
    <summary>I don't want to use Official Providers; what are my options?</summary>
    
    Use the community-built, free access releases of providers published to `crossplane-contrib`. If you're not interested in a subscription, you should use the new releases of the same provider source published under the `crossplane-contrib` org, available on both the Upbound Marketplace (`xpkg.upbound.io`) and `xpkg.crossplane.io`.

</details>

<details>

    <summary>Do the policies defined for Official Providers apply to other Upbound-published package types?</summary>

    The policy is currently geared towards Official Providers, but there are other package types currently published by Upbound: _Configurations_, _Functions_, and more to come.

    We don't have plans to roll out policy changes for other package types right now. We're committed to not breaking users who're taking dependencies on things like `function-patch-and-transform`. Official packages must be published by Upbound under the `upbound` org on the Marketplace.

    Any package–whether a function, provider, etc.–whose source exists in upstream `crossplane-contrib` must comply with [Crossplane governance policies][crossplane-governance-policies] and have public, free builds available for use by the community. That includes repos where Upbound is the maintainer.
 
</details>

<details>

    <summary>How do I migrate from Upbound Official Providers to the equivalent community provider?</summary>

    You can migrate from Upbound Official Providers to the community provider equivalent by following these instructions:

    1. Given a control plane that already has Official Providers installed on it, install the equivalent community family package with a manual revision activation policy. This is demonstrated below for provider-aws:
    ```yaml
        apiVersion: pkg.crossplane.io/v1
    kind: Provider
    metadata:
      name: crossplane-contrib-provider-family-aws
    spec:
      package: xpkg.crossplane.io/crossplane-contrib/provider-family-aws:v1.21.1
      revisionActivationPolicy: Manual
```

    Doing the above puts your control plane into the following state:

    ```yaml
    NAME                                     INSTALLED   HEALTHY   PACKAGE                                                             AGE
    crossplane-contrib-provider-family-aws   False       True      xpkg.crossplane.io/crossplane-contrib/provider-family-aws:v1.21.1   3s
    provider-aws-s3                          True        True      xpkg.upbound.io/upbound/provider-aws-s3:v1.21.1                     50s
    upbound-provider-family-aws              True        True      xpkg.upbound.io/upbound/provider-family-aws:v1.21.1                 46s
    ```

    2. Edit the `provider-aws-s3` package field to `xpkg.crossplane.io/crossplane-contrib/provider-aws-s3:v1.21.1`.

    3. Delete the `upbound-provider-family-aws` provider.

    4. Edit the `crossplane-contrib-provider-family-aws` `revisionActivationPolicy` and set it to `Automatic`. This should then result in a successful migration:
```yaml
    NAME                                     INSTALLED   HEALTHY   PACKAGE                                                             AGE
    crossplane-contrib-provider-family-aws   True        True      xpkg.crossplane.io/crossplane-contrib/provider-family-aws:v1.21.1   2m50s
    provider-aws-s3                          True        True      xpkg.crossplane.io/crossplane-contrib/provider-aws-s3:v1.21.1       3m37s 
    ```

</details>
<!-- vale on -->


[pull-policy]: /manuals/packages/policies

[crossplane-contrib]: https://github.com/crossplane-contrib
[provider-aws]: https://github.com/crossplane-contrib/provider-upjet-aws
[crossplane-governance-policies]: https://github.com/crossplane/crossplane/blob/main/GOVERNANCE.md
