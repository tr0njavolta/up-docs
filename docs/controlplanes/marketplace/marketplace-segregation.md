---
title: Segregate Marketplace Repository Access
sidebar_position: 2
description: A guide for segregating marketplace repository access.
---

Upbound allows organizations to segregate repository access to consume only
authorized artifacts like configuration packages,
[providers][crossplane-providers], functions and add-ons. SBOM, CVE, and other
relevant checks must pass to use these artifacts.

Controlled repository access uses `ImageConfig` to limit production control
planes from consuming unauthorized repositories and unsigned images.

## Example `ImageConfig`

The `ImageConfig` below is an example of a production control plane with
`Verification` restrictions:
```
kubectl describe imageconfigs.pkg.crossplane.io
```

```
Name:         verify-upbound-images
Namespace:
Labels:       <none>
Annotations:  <none>
API Version:  pkg.crossplane.io/v1beta1
Kind:         ImageConfig
Metadata:
  Creation Timestamp:  2025-12-02T21:22:09Z
  Generation:          1
  Resource Version:    1809
  UID:                 11149b5c-2ccc-4d2b-b7bd-cdea75f71ad9
Spec:
  Match Images:
    Prefix:  xpkg.upbound.io/upbound
    Type:    Prefix
  Verification:
    Cosign:
      Authorities:
        Keyless:
          Identities:
            Issuer:   https://token.actions.githubusercontent.com
            Subject:  https://github.com/upbound/upbound-official-build/.github/workflows/supplychain.yml@refs/heads/main
        Name:         Verify Images
    Provider:         Cosign
Events:               <none>
```

If you install unsigned Upbound packages, pods fail to start. The image doesn't pull and
the control plane marks the revision as unhealthy.

```
kubectl get pkgrev
```

```
NAME                                                                       HEALTHY   RUNTIME   IMAGE                                             STATE    AGE
providerrevision.pkg.crossplane.io/upbound-provider-datadog-0f38c6598970   False     False     xpkg.upbound.io/upbound/provider-datadog:v0.3.0   Active   3m24s
```

If you describe the revision, the status condition returns with signature
verification failure as expected.

```
Status:
  Applied Image Config Refs:
    Name:    verify-upbound-images
    Reason:  VerifyImage
  Conditions:
    Last Transition Time:  2025-12-02T21:23:40Z
    Message:               Waiting for signature verification to complete
    Observed Generation:   1
    Reason:                UnhealthyPackageRevision
    Status:                False
    Type:                  RuntimeHealthy
    Last Transition Time:  2025-12-02T21:23:40Z
    Observed Generation:   1
    Reason:                AwaitingSignatureVerification
    Status:                False
    Type:                  RevisionHealthy
    Last Transition Time:  2025-12-02T21:23:41Z
    Message:               Signature verification failed using ImageConfig named "verify-upbound-images": authority "Verify Images": signature verification failed with no signatures found
    Observed Generation:   1
    Reason:                SignatureVerificationFailed
    Status:                False
    Type:                  Verified
  Resolved Image:          xpkg.upbound.io/upbound/provider-datadog:v0.3.0
```

## Image signing


For more information about image signing, review the [sigstore-cosign]
repository.

## Benefits

Adding image verification provides the following benefits:

- Allows developers to push artifacts to multiple [marketplace] registries,
    including third-party enterprise locations. Production control planes only
    consume signed image versions
- Signs images that pass CI/CD pipeline tests automatically
- Use images between development and production repositories without moving
    them.
- Requires less complexity in team permissions, robot account and token
    management
- Allows any authorized consumer to pull signed images

:::warning
You **must** install the `ImageConfig` after creating a production control
plane.
:::

[crossplane-providers]: https://docs.crossplane.io/latest/packages/providers/
[image-configs]: https://docs.upbound.io/manuals/uxp/concepts/packages/image-configs/
[marketplace]: https://marketplace.upbound.io/providers
[sigstore-cosign]: https://github.com/sigstore/cosign
