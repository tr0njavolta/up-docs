---
title: Creating and Pushing Packages
sidebar_position: 2
description: How to create, configure and push packages to the Upbound Marketplace
---

Upbound Marketplace provides a collection of packages that speed up development workflows and reduce setup time. Build upon pre-built packages and use repositories to share your own packages with your team or other developers.

This guide shows you how to build and push a package to the Marketplace.

## Prerequisites

* Building and pushing packages require the `crossplane` CLI.
* Pushing packages requires an [Upbound account][upbound-account].

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

## Push a package
Before pushing a package you must [login][login] to the Upbound Marketplace using `docker login`. You can also use
`up login` with a configured [credential helper][credential-helper].

### Create a repository

Upbound hosts packages in an Upbound _repository_. Create a repository with the [`up repository create`][up-repository-create] command.

For example, to create a repository called `my-repo`
```shell
up repository create my-repo
upbound-docs/my-repo created
```
Repositories have either `public` or `private` visibility:
* `public` visibility means that any published versions of your package have a public listing page in the Marketplace and authorized credentials aren't required to pull.
* `private` visibility means that any published versions of your package have a listing page that only you and other collaborators in your organization can see. Packages require authorized credentials to pulled.

:::tip
All newly created repositories are public by default. To create a private repository, use the `--private` flag.
:::

View any existing repositories with `up repository list`.
```shell
up repo list
NAME         TYPE            PUBLIC   UPDATED
my-repo      configuration   true     23h
```
### Add annotations to your package
The Upbound Marketplace automatically renders specific metadata annotations into listing pages. Upbound recommends that all package maintainers add these annotations into their `crossplane.yaml`. Adding annotations ensures listing have all the required information like licenses, links to source code, and contact information for maintainers.

Upbound supports all annotations specified in the <a href="https://github.com/crossplane/crossplane/blob/master/contributing/specifications/xpkg.md#object-annotations">xpkg specification</a>.

### Push a package to the repository
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
You need to <a href="https://accounts.upbound.io/login">login to the
Marketplace</a> to see packages in private repositories. 
:::

The package is now available from the Upbound Marketplace's backing registry for
pulling. If you wish to publish a Marketplace listing page, see [Publishing
public packages][public-packages].

For example, the Upbound AWS Official Provider is a `provider` package in the
`upbound` organization's `provider-aws` repository. The package address is <a
href="https://marketplace.upbound.io/providers/upbound/provider-aws/">`https://marketplace.upbound.io/providers/upbound/provider-aws/`</a>

## Publishing public packages

Users can now publish their own Marketplace listing pages with the [`up
repository update`][up-repo-update] command with the `--publish` flag. This requires `up` CLI version `v0.39.0` or later.

Your repository's listing page is automatically generated at: `https://marketplace.upbound.io/<package_type>/<organization or user>/<repository>/`

:::info
Report packages that violate the Terms of Service using the "Report this package" link at the bottom left corner of a listing.
:::

The table below illustrates the relationship between accessing an image and
publishing a public Marketplace listing page.

|             | Published                                    | Not Published                         |
|-------------|----------------------------------------------|---------------------------------------|
| **Public**  | **Pull:** Anyone<br/>**View:** Anyone       | **Pull:** Anonymous<br/>**View:** No one |
| **Private** | **Pull:** Authorized<br/>**View:** Authorized | **Pull:** Authorized<br/>**View:** No one |

## Add documentation, icons, and other assets to your package

Users may also provide their additive package content, which renders on the listing page for that package version.

The Marketplace currently supports optionally adding an icon, release notes, readme, additional documentation, and SBOMs.
By convention, organize these files in a directory-of-directories hierarchy,
typically in the source tree. For example, the following is a valid layout for each supported extension:

```text
extensions
├── docs
│   └── developing.md
├── icons
│   └── icon.svg
├── readme
│   └── readme.md
└── release-notes
│   └── release_notes.md
├── sbom
│   └── sbom.spdx.json
```

Then, to add these assets to your package version, use the `up` CLI:

```shell
up alpha xpkg append --extensions-root=./extensions xpkg.upbound.io/<your account>/<your repository>:<version>
```

:::warning
`xpkg append` an alpha feature, and requires `up` CLI version `v0.39.0` or later. See
[`up alpha xpkg append`][up-alpha-xpkg-append] for complete
documentation and conventions.
:::

## Troubleshooting

<details>

    <summary>A package is in the repository but not in the Marketplace. Can users pull the package?</summary>

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


[upbound-account]: /manuals/platform/users#create-an-account
[login]: /manuals/marketplace/authentication
[up-repository-create]: /reference/cli-reference
[credential-helper]: /manuals/cli/howtos/profile-config/#configure-docker-credential-helper
[public-packages]: #publishing-public-packages
[up-alpha-xpkg-append]: /reference/cli-reference
[up-repo-update]: /reference/cli-reference
[crossplane-providers]: /manuals/packages/providers/
[control-plane-configurations]: /manuals/packages/configurations
[composition-functions]: /manuals/packages/functions
[kubernetes-controller]: https://kubernetes.io/docs/concepts/architecture/controller/
[aws-provider-package]: https://github.com/crossplane-contrib/provider-aws/tree/master/package
[crossplane-xpkg-build-command-reference]: https://docs.crossplane.io/latest/cli/command-reference/#xpkg-build
[crossplane-slack]: https://slack.crossplane.io/
[docker]: https://docs.docker.com/get-docker/
[crane]: https://github.com/google/go-containerregistry/blob/main/cmd/crane/README.md
[semver]: https://semver.org/
