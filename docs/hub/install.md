---
title: Installing Hub
sidebar_position: 2
description: Install Hub with Helm against external Postgres and OIDC.
---

This page walks you through installing and managing a self-hosted version of the
Hub. Through this process, you will set up a PostgreSQL database, connect an
OIDC provider and configure your ingress routes.

## Prerequisites

Before starting, work through [the prerequisites page](/hub/install-prereqs) and
confirm each item is ready. This page assumes you have:

- A Kubernetes cluster with a Gateway API or Ingress controller installed and a
  real CA-signed TLS certificate for the hostnames you intend to use
- DNS records for the hostnames `api.<your-domain>` and `ui.<your-domain>`
  pointing at the cluster's load balancer or Gateway address
- A reachable PostgreSQL database with credentials Hub can use. See [the
  databases overview](/hub/db-overview) for version, extension, and
  authentication-mode guidance
- An OIDC provider registered with Hub's callback URL
  `https://api.<your-domain>/oidc/callback`, with a group claim configured. See
  [the OIDC overview](/hub/oidc-configuration) for what Hub needs and how to set it up
  per-provider

You should also know:

- **Your OIDC issuer URL, client ID, and client secret.** Hub validates the
  issuer's discovery document at startup.
- **Your Postgres connection details.** Host, port, database name, user, SSL
  mode, and either a password or an IAM role for the `hub-api` ServiceAccount.

## Install

### 1. Create the Namespace

```bash
kubectl create namespace hub
```

The rest of this guide installs all Hub resources into `hub`. Substitute your
own namespace name if you prefer.

### 2. Create the Postgres Credentials Secret

Skip this step if you are using AWS RDS with IAM authentication. Instead, follow
the corresponding section on the database section for your specific provider.

For password authentication, create a Secret holding the database password under
the key `password`:

```bash
kubectl -n hub create secret generic hub-api-postgres \
  --from-literal=password='<your-postgres-password>'
```

You will reference this Secret from `values.yaml` in step 4 via
`hub-api.postgresql.auth.passwordSecretRef`.

:::note
Hub does not require the Secret name `hub-api-postgres`. Any Secret in the same
namespace as the release works as long as the key holding the password matches
the `key` field you set in values.
:::

### 3. Create the OIDC Client-Secret Secret

Hub reads the OIDC client secret directly out of Helm values when it builds the
bootstrap configuration. To keep the client secret out of your `values.yaml`
file (and out of source control), pass it on the `helm install` command line via
`--set-file` or `--set` rather than committing it. If your workflow requires the
value to live in a Kubernetes Secret you reconcile separately, create it now:

```bash
kubectl -n hub create secret generic hub-api-oidc \
  --from-literal=clientSecret='<your-oidc-client-secret>'
```

You can then pass the value to Helm at install time by extracting it from the
Secret:

```bash
OIDC_CLIENT_SECRET=$(kubectl -n hub get secret hub-api-oidc \
  -o jsonpath='{.data.clientSecret}' | base64 -d)
```

The variable `OIDC_CLIENT_SECRET` is used by the `helm install` command in step
5.

### 4. Write `values.yaml`

Save the following as `values.yaml` and fill in the placeholders. The template
includes only the keys you need to change for a self-hosted install. Defaults
cover everything else.

```yaml
global:
  # Apex domain Hub is served from. Subcharts compose
  # <subdomain>.<domain> hostnames from this value.
  gateway:
    enabled: true
    # Set to true if you want this chart to render the Gateway
    # resource. Leave false when you manage the Gateway separately
    # and only want HTTPRoutes attached to it.
    create: false
    # Required when create=true. Identifies the GatewayClass your
    # cluster's controller has registered (for example "envoy",
    # "istio", "cilium").
    gatewayClassName: ""
    domain: <your-domain>
    # parentRef points at an existing Gateway. Remove these values
    # below if you set create=true.
    parentRef:
      name: <your-gateway-name>
      namespace: <your-gateway-namespace>
    listeners:
      https:
        enabled: true
        port: 443
        tls:
          mode: Terminate
          # TLS certificate Hub serves on api.<your-domain> and
          # ui.<your-domain>. Reference a Secret of type
          # kubernetes.io/tls in the Gateway's namespace.
          certificateRefs:
            - kind: Secret
              name: <your-tls-secret>

hub-api:
  api:
    # Externally reachable base URL for hub-api. Used to compose
    # the OIDC callback URI (<externalURL>/oidc/callback) and
    # surfaced to hub-webui for browser redirects.
    externalURL: https://api.<your-domain>

    # OIDC identity provider. issuerURL and clientID must be set
    # for hub-api to bootstrap an IdentityProvider at startup.
    sampleEmailBasedOIDCConfig:
      providerName: oidc
      issuerURL: <your-oidc-issuer-url>
      clientID: <your-oidc-client-id>
      # Client secret is injected on the helm install command line
      # via --set, not committed here.
      clientSecret: ""
      # Optional. Restrict logins to a single email domain.
      allowedDomain: <your-email-domain>

  postgresql:
    # Either set connectionString OR host + database + user + auth.
    # Leave connectionString empty to use the structured form below.
    connectionString: ""
    host: <your-postgres-host>
    port: 5432
    database: hub
    user: hub
    # Set to require (or stricter) when your database enforces TLS.
    sslmode: require
    auth:
      # password (default) or iam. Use iam with cloud=aws on RDS;
      # see databases/aws-rds.md.
      mode: password
      # Reference to the Secret created in step 2.
      passwordSecretRef:
        name: hub-api-postgres
        key: password
```

A few notes on the template:

- `global.gateway.create` controls whether the chart owns the Gateway resource.
  If your platform team already manages a shared Gateway, leave `create: false`
  and point `parentRef` at it. If you want the chart to render a dedicated
  Gateway, set `create: true` and supply `gatewayClassName`.
- `hub-api.api.externalURL` must match the hostname clients (browsers and CLI
  tools) use to reach `hub-api`.
- `hub-api.postgresql.connectionString` takes precedence over the structured
  `host`/`port`/`database`/`user`/`sslmode` keys.

:::note
The chart exposes many more values than the ones shown here. See [the values
reference](/hub/reference) for the full surface. Anything not set in
`values.yaml` falls back to the chart default.
:::

### 5. Install the Chart

Install the chart with `values.yaml` and the OIDC client secret passed inline:

```bash
helm install hub <chart-ref> \
  --namespace hub \
  --values values.yaml \
  --set hub-api.api.sampleEmailBasedOIDCConfig.clientSecret="$OIDC_CLIENT_SECRET"
```

If you did not extract the OIDC client secret into a shell variable in step 3,
substitute the literal value (quoted) for `$OIDC_CLIENT_SECRET`.

Wait for the install to finish and for all Pods to become Ready:

```bash
kubectl -n hub wait --for=condition=ready pod --all --timeout=5m
```

On first install, `hub-api` runs a migration init container against your
Postgres database before the main container starts. The wait above blocks until
that migration completes.

## Verify the Install

Confirm Hub is up and you can reach it before registering any control planes.

Check that all Hub Pods are Ready:

```bash
kubectl -n hub get pods
```

You should see Ready replicas for `hub-api` and `hub-webui`. The `hub-connector`
Deployment is included in the umbrella chart but is not used by `hub-api`
itself. It activates only when you install a connector on an observed cluster.

Open `https://ui.<your-domain>` in a browser. You should be redirected to your
OIDC provider for login, then returned to the Hub UI.

If that flow succeeds, you should arrive at the Hub home page but have no access
to resources since a fresh install has no registered control planes or role
bindings by default. The next section will add those.

## Configure

The bootstrap steps below register your first ControlPlane and grant your OIDC
admin group organisation-wide admin rights.

### Bootstrap the First ControlPlane

Apply a ControlPlane resource for the cluster (or clusters) you will register a
`hub-connector` against. The example below registers a `production` ControlPlane
in the `default` realm and trusts your OIDC IdentityProvider for user
lookups on that ControlPlane.

Save as `bootstrap-controlplane.yaml`:

**TODO - set up the connection to the Hub API server to apply resources**

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

Apply it:

```bash
kubectl apply -f bootstrap-controlplane.yaml
```

The `spec.identityProviders[].name` value must match the `providerName` you set
in `hub-api.api.sampleEmailBasedOIDCConfig.providerName`. Hub uses that
IdentityProvider to resolve users referenced by role bindings on this
ControlPlane.

### Mint a Registration Token

After the ControlPlane is created, mint a registration token for it. The token
is what `hub-connector` presents when it first contacts `hub-api`:

```bash
kubectl create -f - <<'EOF'
apiVersion: hub.upbound.io/v1alpha1
kind: RegistrationToken
metadata:
  generateName: production-
  namespace: default
spec:
  controlPlaneRef:
    name: production
EOF
```

Read the issued token off the resource's status and store it somewhere safe. The
token is shown once. You will hand it to the `hub-connector` install on the
observed cluster. The [architecture
reference](/hub/architecture#authentication-flow) describes the
token-exchange flow the connector uses. The [demo
quickstart](/hub/connect-second-cluster#install-hub-connector-in-the-second-cluster)
shows the standalone connector install pattern that carries over here, with the
connector's `connector.hub.url` pointing at your gateway instead of a
Docker-network address.

### Bootstrap the Admin OrganizationRoleBinding

Grant your OIDC admin group organisation-wide admin rights. The `name` on the
`Group` subject must match the value Hub sees in the OIDC token's group claim,
prefixed with `<providerName>:`. With `providerName: oidc` and an OIDC group
named `hub-admins`, the subject name is `oidc:hub-admins`.

Save as `bootstrap-org-admin.yaml`:

```yaml
apiVersion: authorization.hub.upbound.io/v1alpha1
kind: OrganizationRoleBinding
metadata:
  name: org-admin
roleRef:
  name: org-admin
subjects:
  - kind: Group
    name: oidc:<your-admin-group-name>
```

Apply it:

```bash
kubectl apply -f bootstrap-org-admin.yaml
```

:::note
The chart also accepts `hub-api.bootstrap.files` for delivering ControlPlanes,
IdentityProviders, and OrganizationRoleBindings as part of the Helm release.
Applying them post-install with `kubectl` (as above) keeps role bindings out of
the chart values and makes them easier to change without a Helm upgrade.
:::

### Confirm Admin Access

Refresh `https://ui.<your-domain>` in the browser you logged in with above. The
role binding takes effect immediately:

- A member of the admin group bound above sees the `production` ControlPlane in
  the ControlPlane list (with no resources yet, since it has no connector
  attached) and has full admin actions available.
- A member of any other group sees the ControlPlane list but has no actions
  available until additional role bindings are applied.

If login completes but the UI shows "no permissions", confirm:

1. The group in your OIDC token matches the subject `name` in
   `bootstrap-org-admin.yaml` (including the `<providerName>:` prefix).
2. Your OIDC provider is sending the group claim. Inspect the JWT at the
   provider's debug endpoint or in your browser's network tab.

## Next Step

You have a working self-hosted Hub. Before letting traffic that matters depend
on it, work through [the production overview](/hub/production-overview) for
sizing, high availability, autoscaling, RBAC, and upgrade guidance.

To attach a control plane, install the standalone `hub-connector` chart on the
observed cluster with the registration token you minted above. The [demo
quickstart](/hub/connect-second-cluster#install-hub-connector-in-the-second-cluster)
shows a worked example of the same install pattern against a Docker-network
address; for self-hosted installs the connector's `connector.hub.url` and
`connector.hub.tokenExchangeUrl` point at the public hostname of your gateway
instead, and `connector.hub.allowInsecure` stays at its default of `false`.
