---
title: Signature Verification
sidebar_position: 1
description: Learn how to verify signatures for Official Providers from the Marketplace
---

Upbound Official Providers contain verifiable signatures, attestations, and an
SBOM (software bill of materials). This approach lets you confirm the origin of
each package version and verify that its contents remain unchanged and intact
from a security standpoint. This article explains how to verify the signature on these packages.

## Prerequisites

Upbound recommends using [cosign][cosign] to verify the signature and attestations of an Official Provider.

If you're running UXP, enable these features first:

```yaml
helm upgrade crossplane --install \
upbound-stable/universal-crossplane \
--debug \
--namespace crossplane-system \
--create-namespace --set args='{--enable-signature-verification,--enable-dependency-version-upgrades}'
```

## Attestations

To provide attestations per version of a package, specify the correct tag or
digest and registry when pulling attestations from an image with cosign. Use the
`cosign verify-attestation` command to verify the SBOM attestation of the
image for the package.
signatures

```bash
cosign verify-attestation xpkg.upbound.io/upbound/<provider>@sha256:<digest> \
--certificate-identity https://github.com/upbound/upbound-official-build/.github/workflows/supplychain.yml@refs/heads/main \
--certificate-oidc-issuer https://token.actions.githubusercontent.com  \
--type spdxjson > attestation.json
```

<!-- vale write-good.Passive = NO -->

Official Provider SBOMs are produced in the SPDX format, specified by `--type spdxjson`. Upon successful execution, the output verifies the SBOM attestation signature in the Rekor transparency log.
<!-- vale write-good.Passive = YES -->


## Verify signatures

Upbound performs keyless signing for Official providers using Sigstore, and you can similarly verify package signatures using `cosign`.

```bash
cosign verify xpkg.upbound.io/upbound/<provider>@sha256:<digest> \
--certificate-identity https://github.com/upbound/upbound-official-build/.github/workflows/supplychain.yml@refs/heads/main \
--certificate-oidc-issuer https://token.actions.githubusercontent.com  \
```

## Using `ImageConfig` in Crossplane for Verification

Starting in Crossplane 1.18, you can enable and configure an `ImageConfig` resource to automatically verify package signatures in your Crossplane cluster.

For example, the following configuration verifies images matching
`spec.matchImages.prefix` using GitHub as the certificate issuer for the email
identity.

```yaml
apiVersion: pkg.crossplane.io/v1beta1
kind: ImageConfig
metadata:
  name: verify-upbound-official
spec:
  matchImages:
    - prefix: "xpkg.upbound.io/upbound/<the-signed-image>:"
  verification:
    provider: Cosign
    cosign:
      authorities:
        - name: verify upbound official build
          keyless:
            identities:
              - issuer: https://token.actions.githubusercontent.com
                subject: https://github.com/upbound/upbound-official-build/.github/workflows/supplychain.yml@refs/heads/main
```
<!-- vale write-good.TooWordy = NO -->
<!-- vale write-good.Passive = NO -->
If signature verification is enabled, Crossplane sets a Verified status
condition on the ProviderRevision resource once verification either succeeds or
is skipped. 
<!-- vale write-good.TooWordy = YES -->
<!-- vale write-good.Passive = YES -->

For example:

```yaml
  - lastTransitionTime: "2024-10-23T16:43:05Z"
    message: Signature verification succeeded with ImageConfig named "verify-upbound-official"
    reason: VerificationSucceeded
    status: "True"
    type: SignatureVerificationComplete
```

For further details on verifying signatures with Crossplane, refer to the [Crossplane documentation][crossplane-documentation].


[cosign]: https://docs.sigstore.dev/cosign/system_config/installation/
[crossplane-documentation]: https://docs.crossplane.io/latest/packages/image-configs/#configuring-signature-verification
