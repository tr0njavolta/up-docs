---
title: Authentication
sidebar_position: 3
description: How to authenticate to the Upbound Marketplace to access private packages.
---

Pulling private packages or pushing packages to an Upbound Marketplace private
repository requires authentication to Upbound.

Installing private Kubernetes resources requires an [image pull secret][image-pull-secret].

:::important
Authenticating to the Upbound Marketplace for private packages requires an
[Upbound account][upbound-account]. 
:::

## Prerequisites

Install the [Up command-line][up-command-line] to generate Kubernetes secrets
and to use Upbound Marketplace private resources.

## Log in with the Up command-line

Use `up login` to authenticate a user to the Upbound Marketplace.

```shell
up login
```

## Configure Docker to use the up credential helper

If you use Docker or any other OCI client, you can configure it to use Upbound
credentials to interact with the Marketplace.

Install the docker-credential-up credential helper:

```shell
curl -sL "https://cli.upbound.io" | BIN=docker-credential-up sh
```

:::tip
Read the [up CLI configuration][up-cli-configuration] documentation for more installation options.
:::

For Docker, add `up` to your Docker `config.json`. This allows your client to
use Upbound credentials to interact with the Marketplace:

```json
{
	"credHelpers": {
		"xpkg.upbound.io": "up"
	}
}            
```

## Authenticate to push packages

Pushing packages to the Upbound Marketplace requires a robot token.
Personal API tokens and `up login` credentials aren't supported as Docker credentials.

:::note
You can use either the `docker-credential-up` helper **or** robot credentials to
authenticate to `xpkg.upbound.io`. If you have the credential helper
configured for `xpkg.upbound.io`, it takes precedence over `docker login` and
may cause unexpected errors when interacting with Marketplace. Remove or scope it
before following the steps below. 
:::

### Create a robot token

1. Go to `https://accounts.upbound.io/o/<your-org>/robots` and create a robot account.

2. Copy the robot's **access ID** and **token**. You can't retrieve the token again after leaving the page.

3. Assign the robot to a team that has write permission on the target repository.
   See [manage repository permissions][team-repo-permissions] for instructions.

### Log in with docker

Use `docker login` with the robot credentials:

```shell
docker login xpkg.upbound.io -u <robot-access-id> -p <robot-token>
```

You can run [`crossplane xpkg push`][crossplane-xpkg-push] to push packages to the Marketplace.

<!-- vale Microsoft.HeadingAcronyms = NO -->
### Authenticate in CI
<!-- vale Microsoft.HeadingAcronyms = YES -->

In a CI pipeline, use the [`docker/login-action`][docker-login-action] with your
robot credentials stored as secrets:

```yaml
- name: Log in to Upbound Marketplace
  uses: docker/login-action@v3
  with:
    registry: xpkg.upbound.io
    username: ${{ secrets.UPBOUND_ROBOT_ACCESS_ID }}
    password: ${{ secrets.UPBOUND_ROBOT_TOKEN }}
```

## Kubernetes image pull secrets

Packages in private repositories require a Kubernetes image pull secret.
The image pull secret authenticates Kubernetes to the Upbound Marketplace,
allowing Kubernetes to download and install packages.

Generating an image pull secret requires either a user account _token_.

:::important
A user account token uses your current `up login` profile.
Logging out with `up logout` deactivates the token.
:::

Use the command `up controlplane pull-secret create` to generate a token and
Kubernetes _Secret_ in the _upbound-system_ namespace.

```shell
up ctp pull-secret create
WARNING: Using temporary user credentials that will expire within 30 days.
upbound-system/package-pull-secret created
```
Verify the secret with `kubectl describe secret -n upbound-system package-pull-secret`

```shell
kubectl describe secret -n upbound-system package-pull-secret
Name:         package-pull-secret
Namespace:    upbound-system
Labels:       <none>
Annotations:  <none>

Type:  kubernetes.io/dockerconfigjson

Data
====
.dockerconfigjson:  1201 bytes
```

## Use an image pull secret

Use an image pull secret by providing a <Hover label ="pps"
line="8">spec.packagePullSecrets</Hover> in a <Hover label="pps"
line="2">Configuration</Hover> or Provider manifest.

Use an image pull secret by providing a <Hover label="pps"
line="8">spec.packagePullSecrets</Hover> in a <Hover label="pps"
line="2">Configuration</Hover> or `Provider` manifest.

This example installs a private <Hover label="pps"
line="2">Configuration</Hover> named <Hover label="pps"
line="6">secret-configuration</Hover> from the Upbound image repository using
image pull secret named <Hover label="pps" line="8">package-pull-secret</Hover>.

<div id = "pps">
```yaml {copy-line="all"}
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: platform-ref-aws
spec:
  package: xpkg.upbound.io/secret-org/secret-configuration:v1.2.3
  packagePullSecrets:
    - name: package-pull-secret
```
</div>

[crossplane-xpkg-push]: https://docs.crossplane.io/latest/cli/command-reference/#xpkg-push
[upbound-account]: /manuals/platform/users
[up-command-line]: /manuals/cli/overview
[up-cli-configuration]:/manuals/cli/howtos/profile-config/#configure-docker-credential-helper
[image-pull-secret]: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/#registry-secret-existing-credentials
[team-repo-permissions]: /manuals/platform/teams/#manage-repository-permissions
[docker-login-action]: https://github.com/docker/login-action
