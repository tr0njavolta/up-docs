---
title: Connect a control plane
sidebar_label: Connect a control plane
sidebar_position: 2
description: Register a control plane so Hub can watch, index, and query it.
---

<Standard />

## What a connection does

- Registering a control plane starts a `hub-connector` inside it. The connector
    watches resources and **pushes** state to `hub-api`. Hub never dials back.
- The connector tracks the resource inventory, each resource's health, and the
    installed package versions.
- Hub is read-only. It shows fleet state without managing the control plane
    lifecycle. No `Connection` kind exists. The real resources are `ControlPlane`
    and `RegistrationToken`.
- You can connect UXP, Spaces, upstream Crossplane, and generic Kubernetes clusters.

## Before you begin

- A running Hub install (see [overview][overview]).
- The `hub-api` URL and token-exchange URL from that install.
- `kubectl` access to the target control plane.

## Procedure (verified commands, needs prose pass)

1. Apply a `ControlPlane` to Hub.

   ```yaml
   apiVersion: hub.upbound.io/v1alpha1
   kind: ControlPlane
   metadata:
     name: production
     namespace: default
   spec:
     identityProviders:
       - name: oidc
         userMappingType: Exact
   ```

2. Mint a `RegistrationToken`. Hub writes the token to the resource's
    `status` and shows it once.

   ```yaml
   apiVersion: hub.upbound.io/v1alpha1
   kind: RegistrationToken
   metadata:
     generateName: production-
     namespace: default
   spec:
     controlPlaneRef:
       name: production
   ```

   Store it in a Secret under the key `registrationToken`.

3. Install the connector on the target cluster.

   ```shell
   helm install hub-connector <connector-chart-ref> \
     --namespace hub --create-namespace \
     --set connector.hubApiUrl=<hub-api-url> \
     --set connector.tokenExchangeUrl=<token-exchange-url> \
     --set connector.credentials.secretRef.name=hub-connector-credentials
   ```

4. Verify with `kubectl get controlplanes.hub.upbound.io -n default`. The control
    plane appears in the Console within a few minutes.

Alt path to document: registering from the Console UI, which displays the token.

## Key resources

| Kind | Purpose |
|---|---|
| `ControlPlane` | A registered control plane. |
| `RegistrationToken` | One-time token authorizing a connector to register. |

## Open questions and placeholders

- `<connector-chart-ref>`, `<hub-api-url>`, and `<token-exchange-url>` come from
    release notes or install output.
- Confirm the Console registration walkthrough and add screenshots.

## Next steps

- [Query API][queryApi]
- [Navigate the Console][navigating]

[overview]: /hub/overview
[navigating]: /hub/navigating
[queryApi]: /hub/query-api
