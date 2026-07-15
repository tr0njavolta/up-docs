---
title: Publish packages
sidebar_position: 2
description: Product documentation for using the Repositories feature in Upbound.
---


Upbound repositories lets you centrally store control plane artifacts,
extensions, and build dependencies as part of an integrated Upbound experience.

This guide shows you how to:

- Create a repository on Upbound
- Build and push a Crossplane package to a repository
- Publish the package in the repository to the Marketplace for public consumption

## Prerequisites

<!-- vale gitlab.FutureTense = NO -->
For this guide, you'll need:
<!-- vale gitlab.FutureTense = YES -->

- The [up CLI][up-cli] installed
- An account on Upbound

## Create a repository

Create a repository to store the Configuration created as part of this guide.


<Tabs>
<TabItem value="up" label="up">
1. Run the following command to create a new repository named `quickstart-project-repo`:
```ini
up repository create quickstart-project-repo
```

2. Verify your repository exists with the `up repository list` command:
```ini
up repository list
```
</TabItem>

<TabItem value="Console" label="Console">
1. Open the Repositories page in the Upbound Console.
2. Select `Create Repository`.
3. Name the repository _`quickstart-project-repo`_.
4. Select Create.


The repository list now shows your new repository.
</TabItem>
</Tabs>

## Build a package

Build a package using `crossplane xpkg build`.

The `crossplane xpkg build` command expects a `crossplane.yaml` file to provide the metadata for the package file.

The default name is the `metadata.name` value in the `crossplane.yaml` file.

```shell
crossplane xpkg build
xpkg saved to /home/vagrant/pkg/test-config-15ab02d92a30.xpkg
```

Provide a specific package name with `crossplane xpkg build --name <package name>`.

By default `crossplane xpkg build` saves the package to the current directory. Specify a specific location with `crossplane xpkg build -o <path>`.

The [`crossplane xpkg build` command reference][crossplane-xpkg-build-command-reference] contains all available options.

## Push a package to the repository

Before pushing, authenticate to `xpkg.upbound.io` using a robot token.
Personal API tokens return a 401 error. See [authenticate to push packages][auth-push] for setup steps.

Push a package to the Upbound Marketplace using the `crossplane xpkg push` command.

The `crossplane xpkg push` command requires:

* The repository to push a package to.
* A package version tag. The package version tag is a <a href="https://semver.org/">semantic versioning</a> number determining package upgrades and dependency requirements.

The push command syntax is
`crossplane xpkg push <repository>:<version tag> -f <xpkg file>`.

For example, to push a package with the following parameters:
* Repository `upbound-docs/my-repo`
* Version `v0.2`
* Package file named `my-package.xpkg`

Use the following `crossplane xpkg push` command:

```shell
crossplane xpkg push upbound-docs/my-repo:v0.2 -f my-package.xpkg
xpkg pushed to upbound-docs/my-repo:v0.2
```

:::note
You need to <a href="https://accounts.upbound.io/login">log in to the Marketplace</a> to see packages in private repositories.
:::

The package is now available from the Upbound Marketplace. View the Marketplace listing at:
`https://marketplace.upbound.io/<package_type>/<organization or user>/<repository>/`

For example, the Upbound AWS Official Provider is a `provider` package in the `upbound` organization's `provider-aws` repository. The package address is <a href="https://marketplace.upbound.io/providers/upbound/provider-aws/">`https://marketplace.upbound.io/providers/upbound/provider-aws/`</a>

## Publishing public packages

Upbound reviews all public packages, and new repositories have a default publishing policy of requiring a one-time manual approval. Contact the Upbound team via the `#upbound` channel in the [Crossplane Slack][crossplane-slack] to request Upbound to review your package.

Upbound needs the following information before considering a package:

* Public Git repository of the package.
* The Upbound account to list as an owner and point of contact.
* The Upbound repository name.

Publish status indicates whether a package version appears in the [Marketplace][marketplace], while privacy indicates who can access it.

| | Published | Not Published |
| ---- | ---- | ---- |
<!-- | <b>Public</b> | **Pull:** Anyone<br>**View:** Anyone | **Pull:** Anonymous<br>**View:** No one | -->
<!-- | <b>Private</b> | **Pull:** Authorized<br>**View:** Authorized | **Pull:** Authorized<br>**View:** No one | -->


### Troubleshooting
<details>

<summary>A package is in the repository to but not in the Marketplace. Can users pull the package?</summary>

Published packages don't need to be visible to pull. Verify pulling a package with any OCI client like [docker][docker] or [crane][crane].

</details>

<details>

<summary>The package status lists ACCEPTED in the Marketplace but isn't visible.</summary>

__ACCEPTED__ means the package is available for publishing to the Marketplace, but not yet visible to others. Users can still pull the package.

</details>

<details>

<summary>The package status lists REJECTED in the Marketplace.</summary>

A status of __REJECTED__ means that the package isn't available for publishing to the Marketplace. Select the status badge to get more information on why Upbound rejected the package. Users can still pull the package.

</details>

<details>

<summary>Why are only some package versions published?</summary>

The Marketplace only publishes release versions with valid [semver][semver] tags.

</details>

### Add annotations to your package

The Upbound Marketplace automatically renders specific metadata annotations into listing pages. Upbound recommends that all package maintainers add these annotations into their `crossplane.yaml`. Adding annotations ensures listing have all the required information like licenses, links to source code, and contact information for maintainers.

Upbound supports all annotations specified in the <a href="https://github.com/crossplane/crossplane/blob/master/contributing/specifications/xpkg.md#object-annotations">xpkg specification</a>.

[up-cli]: /manuals/cli/overview
[marketplace]: /manuals/marketplace/overview
[auth-push]: /manuals/marketplace/authentication#authenticate-to-push-packages
[crossplane-xpkg-build-command-reference]: https://docs.crossplane.io/latest/cli/command-reference/#xpkg-build
[crossplane-slack]: https://slack.crossplane.io/
[docker]: https://docs.docker.com/get-docker/
[crane]: https://github.com/google/go-containerregistry/blob/main/cmd/crane/README.md
[semver]: https://semver.org/
