---
title: External registries
sidebar_position: 3
description: Connect Hub to private or public OCI registries so the catalog can authenticate and enrich the packages your control planes install.
---

Connect Hub to your own OCI registries, such as private Artifactory
instances, public registries, or air-gapped mirrors. This allows Hub to
authenticate to them and index images you declare or observe on connected
control planes into the Catalog.

:::note
External registry connection is an alpha feature. It's
disabled by default, and the APIs may change in incompatible ways between
releases. See the [feature lifecycle](../../reference/feature-releases.md).
:::

## Concepts

Two resources describe how Hub reaches a registry.

| Resource | What it declares |
| --- | --- |
| `Connection` | How Hub authenticates to a registry: a host, an optional path scope, and credentials. |
| `Repository` | What to index: the full OCI path of a repository, and optionally which `Connection` to use for it. |

Both resources belong to a realm. For example, credentials
declared in one realm are never used to pull for another implicitly.

## How the catalog uses connections

When a connected control plane installs a Crossplane package,
Hub records its data in the catalog by pulling
the package's manifest and content layers from the registry.

Cataloguing is independent of whether the control plane's own image pull
succeeds. A connected control plane uses its own `packagePullSecrets`, while Hub pulls
with the realm keychain.

### The realm keychain

Within a realm, all `Connection` resources form a keychain. When Hub needs to
pull an image, for cataloguing or to verify a `Connection`, it selects the
`Connection` whose `scope` is the longest prefix of the image path. One realm can
hold multiple credentials for the same host, each scoped to a different path.

A `Repository` can opt out of keychain resolution by pinning a single
`Connection` with `spec.connectionRef`. Pin a connection when policy requires
that a repository's credentials can't be resolved via the keychain.

## Enable the feature

The registry API requires the `Registry` feature gate for the
`Connection` and `Repository` resources. See [Enable and configure
Catalog](./configuration.md), which covers the Helm values and how to verify
them. For the full gate catalog, see [Feature
flags](../../reference/feature-flags.md).

Confirm the registry group is available via `/apis/registry.hub.upbound.io/v1alpha1`:

```json
{
  "kind": "APIResourceList",
  "apiVersion": "v1",
  "groupVersion": "registry.hub.upbound.io/v1alpha1",
  "resources": [
    {
      "name": "connections",
      "singularName": "",
      "namespaced": true,
      "kind": "Connection",
      "verbs": [
        "create",
        "delete",
        "get",
        "list",
        "update"
      ]
    },
    {
      "name": "connections/verify",
      "singularName": "",
      "namespaced": true,
      "kind": "ConnectionVerification",
      "verbs": [
        "create"
      ]
    },
    {
      "name": "repositories",
      "singularName": "",
      "namespaced": true,
      "kind": "Repository",
      "verbs": [
        "create",
        "delete",
        "get",
        "list",
        "update"
      ]
    }
  ]
}
```

## Using the API

Every operation below is a REST call to your Hub API base URL, authenticated with
a bearer token in the `Authorization` header. Each one lists its method and path,
the JSON request body where it takes one, and the JSON response it returns.
Placeholders like `<realm>` and `<name>` mark values you supply.

## Create a Connection

A `Connection` declares a registry host, an optional `scope`, and an auth method.
The two currently supported methods are `Anonymous` and `Static`. The Hub performs
anonymous requests by default if there is no matching `Connection` on the
keychain, so it's not required unless you want to force requests to be anonymous.

**Endpoint**

```http
POST /apis/registry.hub.upbound.io/v1alpha1/namespaces/<realm>/connections
```

### Static credentials for private registries

Prefer a scoped access token or identity token over an account password where the
registry supports it.

**Request**

```json
{
  "apiVersion": "registry.hub.upbound.io/v1alpha1",
  "kind": "Connection",
  "metadata": {"name": "artifactory-my-team", "namespace": "<realm>"},
  "spec": {
    "host": "artifactory.example.com",
    "scope": "artifactory.example.com/my-team",
    "authMethod": "Static",
    "static": {
      "username": "hub-puller",
      "password": "<access-or-identity-token>"
    }
  }
}
```

The following rules apply and are validated:

- `spec.scope` defaults to `spec.host` when unset. Set it to a `host/path` prefix
  to scope a credential to part of a registry.
- Set `spec.insecure: true` only for registries that serve the OCI distribution
  API over plain HTTP. Hub connects over HTTPS by default. All active connections
  for the same realm and host must agree on this value.
- `authMethod: Static` requires `spec.static` with at least a username and one
  secret field. `authMethod: Anonymous` must not include `spec.static`.

## Verify a Connection

The `verify` action tests a `Connection` synchronously against the live registry.
It has two tiers.

### Tier 1: Reachability and authentication

**Endpoint**

```http
POST /apis/registry.hub.upbound.io/v1alpha1/namespaces/<realm>/connections/<name>/verify
```

**Request**

```json
{
  "apiVersion": "registry.hub.upbound.io/v1alpha1",
  "kind": "ConnectionVerification"
}
```

**Response**

```json
{
  "apiVersion": "registry.hub.upbound.io/v1alpha1",
  "kind": "ConnectionVerification",
  "status": {
    "reachable": true,
    "authenticated": true
  }
}
```

### Tier 2: Authorization probe

Add a `testImage` to check that the credential is authorized to pull a specific
image, not just that it authenticates.

**Endpoint**

```http
POST /apis/registry.hub.upbound.io/v1alpha1/namespaces/<realm>/connections/<name>/verify
```

**Request**

```json
{
  "apiVersion": "registry.hub.upbound.io/v1alpha1",
  "kind": "ConnectionVerification",
  "spec": {"testImage": "artifactory.example.com/my-team/provider-aws:v1.18.0"}
}
```

**Response**

```json
{
  "apiVersion": "registry.hub.upbound.io/v1alpha1",
  "kind": "ConnectionVerification",
  "status": {
    "reachable": true,
    "authenticated": true,
    "authorized": {
      "testImage": "artifactory.example.com/my-team/provider-aws:v1.18.0",
      "result": "ok"
    }
  }
}
```

`status.authorized.result` is one of:

| Result | Meaning |
| --- | --- |
| `ok` | The image is pullable with this credential. |
| `forbidden` | Authenticated, but the registry refused the pull (scope denied). |
| `not_found` | The test image doesn't exist. |
| `transient` | A network or 5xx error. Retry. |

## Use cases

### Private Artifactory for one team

Create a `Static` connection scoped to the team's path
(`artifactory.example.com/my-team`) in that team's realm. Hub enriches every
package the team's control planes install with the team's credential, and no
other realm can use it.

### Multiple credentials on one host

Declare several connections in the same realm with different `scope` prefixes on
the same host:

```json
// Connection A
{"spec": {"host": "artifactory.example.com", "scope": "artifactory.example.com/my-team"}}

// Connection B
{"spec": {"host": "artifactory.example.com", "scope": "artifactory.example.com/team-b"}}
```

## Manage credentials

Hub redacts secrets on read. `GET` and `LIST` return `"***"` in place of every
secret field (`password`, `auth`, `identityToken`, `registryToken`). To keep a
secret unchanged on update, send `"***"` for that field; send a new value to
rotate it.

To check a connection's health, read its status. `status.lastVerifiedAt` and
`status.lastVerificationError` reflect the most recent verify or enrichment
attempt attributable to it. `status.repositories` lists the repositories in the
realm associated with the connection.

**Endpoint**

```http
GET /apis/registry.hub.upbound.io/v1alpha1/namespaces/<realm>/connections/<name>
```

**Response**

```json
{
  "apiVersion": "registry.hub.upbound.io/v1alpha1",
  "kind": "Connection",
  "metadata": {"name": "artifactory-my-team", "namespace": "<realm>"},
  "spec": {
    "host": "artifactory.example.com",
    "scope": "artifactory.example.com/my-team",
    "authMethod": "Static",
    "static": {"username": "hub-puller", "password": "***"}
  },
  "status": {
    "lastVerifiedAt": "2026-07-20T18:04:00Z",
    "repositories": ["provider-aws"]
  }
}
```

### Delete a connection or repository

**Endpoints**

```http
DELETE /apis/registry.hub.upbound.io/v1alpha1/namespaces/<realm>/repositories/<name>
DELETE /apis/registry.hub.upbound.io/v1alpha1/namespaces/<realm>/connections/<name>
```

## API reference

### Connection spec

| Field | Required | Description |
| --- | --- | --- |
| `host` | yes | Registry hostname, optionally with a port. |
| `authMethod` | yes | `Anonymous` or `Static`. |
| `static` | when `Static` | Credential material: `username`, `password`, `auth`, `identityToken`, `registryToken`. |
| `scope` | no | Docker-config `auths` key: a host or `host/path` prefix. Defaults to `host`. Longest-prefix match wins. |
| `insecure` | no | Use plain HTTP instead of HTTPS. Default `false`. |
| `displayName` | no | Human-readable name for user interfaces. |
| `description` | no | Free-form text. |

### Repository spec

| Field | Required | Description |
| --- | --- | --- |
| `repository` | yes | Full OCI repository path. |
| `connectionRef.name` | no | Pin auth to a single `Connection`. The realm keychain is used when unset. |

### Connection verify response (status)

| Field | Description |
| --- | --- |
| `reachable` | Registry answered the `/v2/` check. |
| `authenticated` | Credential completed the token exchange, or anonymous `/v2/` returned `200`. |
| `authorized` | Present only when a `testImage` was supplied: `{testImage, result}`. |
| `message` | Human-readable summary. |

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `404` on the registry API group | Enable the `Registry` gate (`hub-core.api.featureFlags.gates.Registry=true`). |
| `401` on Hub API calls | The bearer token expired. Obtain a fresh one. |
| Verify succeeds but enrichment fails with an auth error | The `Connection` `scope` must be a prefix of the image path, and the `Connection` must be in the same realm as the control plane. |
| Verify tier-2 returns `forbidden` | The credential authenticates but isn't authorized to pull that image. Grant read on the repository. |
| `connection refused` from Hub | The registry host must be reachable from Hub's network. |
| Static auth rejected at create | `authMethod: Static` requires `spec.static` with a username and a secret. `Anonymous` must omit `spec.static`. |

## Roadmap

- `WorkloadIdentity` method for passwordless authentication is reserved in the API
for registries supporting it, and not yet implemented.
- Background scanning of declared repositories, periodically mirroring tags from
the upstream registry into the catalog, is planned.

## See also

- [Catalog overview](overview.md)
- [Enable and configure Catalog](configuration.md)
- [Catalog API overview](reference.md)
- [Feature flags](../../reference/feature-flags.md)
