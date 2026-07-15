---
title: Store configurations
sidebar_position: 1
description: Product documentation for using the Repositories feature in Upbound.
---


Upbound repositories lets you centrally store control plane artifacts, extensions, and build dependencies as part of an integrated Upbound experience.

This guide shows you how to:

- Create a repository on Upbound
- Build and push a control plane project's artifact (a Configuration) to the repository
- Deploy the artifact to a control plane

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
up repository create `quickstart-project-repo`
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

## Build a Configuration

Use the up CLI to scaffold a control plane project and build it to produce a Configuration.

1. Run the following command to create a new control plane project in your
   current working directory:

```ini
up project init quickstart-project
```

2. Change your current directory to `quickstart-project`. Run the following command in your terminal:
```ini
cd quickstart-project
```

3. Run the following command to build the project and produce a Configuration package.
```ini
up project build
```

This command builds your configuration and stores it in the `_output` directory.

## Push the Configuration

Now you can push the Configuration to your repository. Run the following command to push the configuration package to your repository:
```ini
up project push --repository=quickstart-project-repo
```

:::tip
Upbound automatically tags your package with a [semver][semver] tag. You can override this with the `--tag=""` option of the push command.
:::

## Install the Configuration from the repository

To install the Configuration from your repository onto a control plane, apply the following manifest to a control plane:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: quickstart-project
spec:
  package: "xpkg.upbound.io/<org-name>/quickstart-project"
```


[up-cli]: /manuals/cli/overview

[semver]: https://semver.org/
