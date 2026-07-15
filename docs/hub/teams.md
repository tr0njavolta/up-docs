---
title: Teams
sidebar_position: 5
description: Creating and managing Upbound teams
---
Teams are groups of Upbound [users][users] within an [organization][organization]. Teams provide more fine-grained permissions controls for users and robots accessing control planes and repositories.

## Manage teams

Only organization admins can create teams, assign teams permissions, or view the full list of teams. Other users can view any teams marked as visible within the organization, plus any secret teams they're members of.

To manage teams:

1. Go to the **Teams** tab in the org settings pane
2. Select a team to go to its settings pane, which lists the team's members, robots, and permissions.

### Create a team

Create a team on Upbound in the **Teams** tab in the org settings pane and clicking the "+" button. Give your new team a name and select **Create Team**. Newly created teams have no members, robots, or permissions assigned.

### Delete a team

To delete a team:

1. Go to the **Org settings** pane.
2. Select the team from the **Teams** tab.
3. Select the **Settings** tab.
4. Select **Delete**

:::warning
Deleting a team permanently removes any permissions its members and robot accounts have and can't be undone.
:::

## Manage membership

Users can be members of more than one team inside an organization.

The following illustrates a user that's a member of two different organizations and multiple teams.
![A user in multiple groups and multiple organizations.][multiple-organizations]
<!-- vale Upbound.Spelling = NO -->
<!-- ignore "Lando" -->
The user _Lando_ has a unique _user account_.
Lando is a member of both _Organization-1_ and _Organization-2_.
Inside _Organization-1_, Lando belongs to _Team-A_ and _Team-B_.
Lando is only a member of _Team-Y_ inside _Organization-2_.
<!-- vale Upbound.Spelling = YES -->

### Add users

If the user isn't yet in the organization, invite them to join the organization. Once the user has accepted their invite you can add them to team. To do this:

1. Go to the **Org settings** pane.
2. Select the team from the **Teams** tab.
2. Select the team's **Members** tab.
3. Select **Add Team Member**.
4. You can select from the list of available members in the organization who don't already belong to this team. You can select multiple users at a time.

:::tip
The default role that will be assigned to a team member is `owner`. Select the role to open a menu and change it to `member` if you wish.
:::

### Remove users

To remove a user from a team:

1. Go to the **Org settings** pane.
2. Select the team from the **Teams** tab.
2. Select the team's **Members** tab.
3. Select the **edit** button next to the user's name in the team list.
4. Select **Remove From Team**.

### Robot management

You can manage adding and removing robots from teams. To assign a robot to a team, see instructions in the [robots documentation][robots-documentation].

## Manage repository permissions

Manage repository permissions for the Upbound Marketplace at the team level.

To create a new permission:

1. Go to the **Org settings** pane.
2. Select the team from the **Teams** tab.
2. Select the team's **Permissions** tab.
3. Select **Create Repository Permission**.


[users]: /manuals/platform/users
[organization]: /manuals/platform/organizations
[robots-documentation]: /manuals/platform/robots/#assign-a-robot-to-a-team
[multiple-organizations]: /img/user-org-team.png "A user can be in multiple orgs and multiple groups"
