---
title: Robots
sidebar_position: 6
description: Creating and assigning Upbound robot tokens
---

Robot accounts are non-user accounts with unique credentials and permissions. Organization _admins_ grant robot accounts access to individual repositories. Robot accounts access the repositories without using credentials tied to an individual user.

:::warning
Upbound strongly recommends using robot accounts for any Kubernetes related authentication. For example, providing secrets required to install Kubernetes manifests. Use Upbound user accounts only with the _up_ command-line or [Upbound console][upbound-console].
:::

## Create a robot
You can create robot account from the `Robots` tab in the org settings pane. You can also create robots using the [up CLI][up-cli].

## Assign a robot to a team

Make sure you've created the desired robot before assigning it to a team. To assign a robot to a team, do the following:

1. Go to the **Teams** tab in the org settings pane.
2. Select the team you want to assign a robot account.
3. Select the **Robot accounts** tab
4. Select the **Add Robot Account** button and select the robot you want.

## Frequently asked questions

<details>
<summary>What's the difference between a robot token and a personal access token?</summary>

A robot token is like a service account. They have their own identity like service principals in a cloud provider.

A [personal access token][personal-access-token] or "PAT" is a long-lived serialization of a specific Upbound user's identity. Your personal access token can do everything your user can do in Upbound. Only use PATs when necessary and never share them with others.

</details>
<details>
<summary>When should you use a robot token for interacting with Upbound?</summary>

In Upbound, robot tokens are currently scoped to inheriting Upbound Marketplace repository permissions from a [team][team] they're assigned to.

You should use a robot token for your Upbound Marketplace CI to push new tags or as a package pull secret for private repositories.
</details>

[up-cli]: /reference/cli-reference
[personal-access-token]: /manuals/console/upbound-console/
[team]: /manuals/platform/teams/#manage-repository-permissions
[upbound-console]: https://console.upbound.io/
