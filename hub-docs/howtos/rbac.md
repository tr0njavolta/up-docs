---
title: RBAC and OIDC group mapping
sidebar_position: 14
description: Bind OIDC groups to Hub roles across the organisation, realm, and control-plane tiers.
---

This page explains Hub's three-tier authorization model and how to bind OIDC
groups to Hub roles at each tier.

## Tenancy boundaries

Hub authorises requests across three nested tiers. Each tier owns its own grant
mechanism, and grants don't cascade between tiers.

**Organisation**. The Hub installation as a whole. Everything served from a
single `hub-api` is one organisation. Organisation-scoped state includes the set
of realms, the identity providers, and the organisation-level role bindings
themselves.

**Realm**. A logical grouping of control planes inside an organisation. Most Hub
API resources are realm-scoped (control plane registrations, realm-level role
bindings, and other per-tenant configuration all live in a realm). An
organisation can contain many realms. A common pattern is one realm per team or
environment.

<!-- vale write-good.Passive = NO -->
**Control plane**. An individual Kubernetes cluster (commonly a Crossplane
control plane) registered into a realm. The resources *inside* a control plane
(Crossplane Compositions, claims, providers, and any other custom resources) are
governed by that cluster's own Kubernetes RBAC. Hub doesn't own this tier.
<!-- vale write-good.Passive = YES -->

:::note
Grants don't cascade between tiers. An organisation administrator has no
automatic access inside any realm, and a realm administrator has no automatic
access inside any control plane. Bind users at every tier they need to operate
in.
:::

## Hub's role-binding resources

Hub provides one binding resource per tier it owns. Hub delegates the control-plane tier to the control plane's own RBAC.

| Tier | Hub binding | Scope | Built-in roles |
|------|-------------|-------|----------------|
| Organisation | `OrganizationRoleBinding` (ORB) | Cluster-scoped (Hub-wide) | `org-admin` |
| Realm | `RealmRoleBinding` (RRB) | Namespaced in the realm | `realm-admin`, `realm-editor`, `realm-viewer` |
| Control plane | None | Defers to the control plane's own RBAC | None |

`OrganizationRoleBinding` and `RealmRoleBinding` live in the
`authorization.hub.upbound.io/v1alpha1` API group. They accept the same shape of
`subjects` list. Each subject has a `kind` of `User` or `Group` and a `name`
matched against the identity Hub derives from the OIDC token.

## Group claim and OIDC mapping

When a user authenticates, Hub validates the OIDC token against the configured
`IdentityProvider` and constructs the identity used for authorization from the
token's claims.

Two `IdentityProvider` settings govern the group identity Hub sees:

- `spec.validation.claimMappings.groups.claim` selects which claim in the token
  carries the user's group membership. Most providers expose a `groups` claim
  once you configure the corresponding scope, app role, or group claim mapping
  on the provider side.
- Hub adds`spec.validation.userInfoPrefix` to every value it reads from
  the user and group claims. The prefix prevents collisions between providers
  and makes the source of an identity clear in audit logs and bindings.

The effective group identity Hub uses is `<userInfoPrefix><raw-group-value>`. If
`userInfoPrefix` is `corp:` and the OIDC token carries a `groups` claim of
`["platform-admins", "developers"]`, Hub sees the user as a member of groups
`corp:platform-admins` and `corp:developers`. Role bindings must use the
prefixed form in their `subjects[].name` fields.

Inspect a real token before writing bindings. Log in to the Hub UI. From the
browser's developer tools, copy the access token and decode it at a JWT
inspector. Confirm:

- The claim configured under `claimMappings.groups.claim` is present.
- It contains the values you expect for the signed-in user.
- The `userInfoPrefix` matches what your `IdentityProvider` declares.

If the claim is missing or empty, the fix is on the OIDC provider side. See [the
OIDC overview][oidc-configuration] for the provider-specific
group-claim setup.

## Configure organization-level access

Grant a group organisation-wide permissions by creating an
`OrganizationRoleBinding`. The resource is cluster-scoped, so it has no
`namespace`. The built-in organisation role is `org-admin`.

Assuming `corp:` is the `userInfoPrefix` from your
`IdentityProvider` and `platform-admins` is the group value your OIDC provider
emits, save this as `org-admin-binding.yaml`:

```yaml
apiVersion: authorization.hub.upbound.io/v1alpha1
kind: OrganizationRoleBinding
metadata:
  name: platform-admins
roleRef:
  name: org-admin
subjects:
- kind: Group
  name: "corp:platform-admins"
```

Apply it against Hub's API:

```bash
kubectl --context hub apply -f org-admin-binding.yaml
```

List multiple subjects on a single binding to grant the same role to several groups:

```yaml
subjects:
- kind: Group
  name: "corp:platform-admins"
- kind: Group
  name: "corp:sre-oncall"
```

You can also bind individual users directly with `kind: User`. The `name` is the
prefixed username Hub derives from `claimMappings.username.claim` (in the
default configuration this is the email claim), so `name:
"corp:alice@example.com"`.

:::note
An `org-admin` ORB grants organisation-scoped capabilities only, such as
managing realms, identity providers, and Hub-wide settings. It doesn't grant
access to any realm's contents. You must grant the same subject a
`RealmRoleBinding` in every realm they need to operate in.
:::

## Configure realm-level access

Most Hub API resources live at the realm level: control plane registrations,
realm-level role bindings, and other per-tenant configuration. Grant a group
access to a realm by creating a `RealmRoleBinding` in the realm's namespace. The
namespace name **must match** the realm name.

Save this as `prod-east-viewer-binding.yaml`:

```yaml
apiVersion: authorization.hub.upbound.io/v1alpha1
kind: RealmRoleBinding
metadata:
  name: viewers
  namespace: prod-east
spec:
  roleRef:
    name: realm-viewer
  subjects:
  - kind: Group
    name: "corp:developers"
```

Apply it the same way:

```bash
kubectl --context hub apply -f prod-east-viewer-binding.yaml
```

Pick the role:

- **`realm-admin`**. Full control of realm-scoped resources, including the
  ability to register, update, and remove control planes within the realm.
- **`realm-editor`**. Read-write access to realm-scoped resources. Can't modify
  realm role bindings.
- **`realm-viewer`**. Read-only access to realm-scoped resources.

`spec.roleRef.name` must be one of those three values. Hub rejects bindings that
reference any other name.

<!-- vale write-good.Weasel = NO -->
Repeat the binding for each realm a group should access. A single
`RealmRoleBinding` covers exactly one realm.
<!-- vale write-good.Weasel = YES -->

:::note
A subject can hold different roles in different realms, such as `realm-admin` in
`prod-east` and `realm-viewer` in `prod-west`. Create one `RealmRoleBinding` per
realm.
:::

:::note
A `RealmRoleBinding` doesn't grant access to resources *inside* the control
planes registered to the realm. A `realm-viewer` can see *that* a control plane
exists. The control plane's own RBAC governs what they can see *inside*. The next section covers it.
:::

## Configure control-plane-level access

Hub doesn't provide a binding resource for this tier. Each control plane is
itself a Kubernetes cluster with its own RBAC. Hub defers to that cluster's
API server when deciding what resources to surface to a user.

To grant a user access to specific resources inside a control plane:

1. Inside the control plane, create a `Role` or `ClusterRole` granting the
   Kubernetes-level permissions you want, such as `get`, `list`, `watch` on a
   particular Crossplane API group.
2. Bind that role to the user or group with a `RoleBinding` or
   `ClusterRoleBinding`. The subject `name` uses the same prefixed identity Hub
   derives from the OIDC token (such as `corp:platform-admins`).

Hub queries the control plane's authorization API at request time. When a user
opens a control plane in the Hub UI, Hub shows them only what the
control plane's RBAC permits them to read.

Refer to your control plane's documentation for the RBAC primitives it exposes.
For a Crossplane managed control plane, this is standard Kubernetes RBAC against
the Crossplane resource types.

## Next step

- Revisit the OIDC group-claim setup if group identities don't surface as
  expected: [OIDC overview][oidc-configuration].
- Return to the [production hardening overview][production-overview].

[oidc-configuration]: /hub/howtos/oidc-configuration
[production-overview]: /hub/howtos/production-overview
