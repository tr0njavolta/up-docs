---
title: Manage your up CLI profile
sidebar_position: 10
description: "Use the Up CLI to switch between profiles"
---

This guide explains how to interact with your Upbound profile in the `up` CLI.

## List profiles

You can list your `up` profiles and see which one is currently selected:

```shell
$ up profile list
CURRENT   NAME          TYPE           ORGANIZATION
*         default       cloud          my-org
```

## Create a profile

To create a cloud profile for a given organization, use `up login`:

```shell
up login --profile test --organization <your-upbound-org>
```

By default, `up login` opens browser window for interactive login. If opening a
browser window isn't possible, the command returns link to copy and paste into a
browser to log in. Then returns a one-time authentication code to paste into
your terminal. You can also log in non-interactively by passing the
`--username`and `--password` flags or the `--token` flag.

Initializing a self-hosted Space with `up space init` automatically creates a
disconnected profile associated with the Space. You can also create a new
disconnected profile manually based on a kubeconfig context pointed at the
Space:

```shell
up profile create <profile name> --type=disconnected --kubeconfig <kubeconfig path> --kubecontext <context name>
```

The `--kubeconfig` and `--kubecontext` flags are optional; if not given, the
`up` CLI uses your default kubeconfig and current context.

## Set the current profile

By default, `up` executes commands against the `current` profile. To select the
current profile, run the following:

```shell
up profile use <profile-name>
```
<!-- vale gitlab.SentenceLength = NO -->
If you select a kubeconfig context with `up ctx` while using a given
profile, that kubeconfig context restores to your kubeconfig the next
time you switch the profile with `up profile use`.
<!-- vale gitlab.SentenceLength = YES -->

## Update a profile's organization

You can change a profile's associated organization if needed:

```shell
up profile set organization <new-organization>
```

Then, run `up login` again to authenticate against the new organization.

## Invalidate session tokens

`up` uses session tokens for authentication after login.

:::warning
Tokens are private authentication data. Don't share your token.
:::

For currently active tokens, revoke the token with `up logout --profile <profile-name>`.

For inactive tokens, use the [Upbound Password Reset](https://accounts.upbound.io/resetPassword) and select "Delete all active sessions" to revoke all tokens.

## Configure Docker credential helper

`up` can build and push Crossplane packages. If pushing to the Upbound
Marketplace, you can use the credentials acquired via `up login`.

If you prefer to use Docker or any other OCI client, you can add the following
to your Docker `config.json` file after downloading `docker-credential-up`. This
allows your client to use Upbound credentials to interact with the Marketplace.

Instructions for installing `docker-credential-up` are available in the [CLI
installation documentation][cli]

```json
{
	"credHelpers": {
		"xpkg.upbound.io": "up"
	}
```

[cli]: /manuals/cli/overview
