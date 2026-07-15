---
title: Repository Management
sidebar_position: 3
description: How to create, list, and delete repositories
---


This page describes how to view and manage Upbound repositories.

## Viewing repositories

To view a list of repositories:

<Tabs>
    <TabItem value="up" label="up">

    1. Run the following command to list repositories:

    ```shell
    up repository list
    ```
 
 </TabItem>

    <TabItem value="Console" label="Console">
    Open the Repositories page in the Upbound Console. This page is available at `console.upbound.io/<org-name>/repositories`.

    </TabItem>

</Tabs>

## Update repository settings

Repositories have either `public` or `private` visibility:

* `public` visibility means that any published versions of your package have a public listing page in the Marketplace and authorized credentials aren't required to pull.
* `private` visibility means that any published versions of your package have a listing page that only you and other collaborators in your organization can see. Packages require authorized credentials to pulled.

Once created, you can't change these repository settings.

To delete a repository, do the following:


<Tabs>

    <TabItem value="up" label="up">

    1. Run the following command to list repositories:

    ```shell
    up repository list
    ```
    
    2. Run the following command to delete the repository:
  
  ```shell
    UPBOUND_REPO_NAME=<repo-name>
    up repo delete ${UPBOUND_REPO_NAME} --force
    ```

    </TabItem>

    <TabItem value="Console" label="Console">

    1. Open the Repositories page in the Upbound Console.
    2. Select the repository from the list.
    3. Select **Settings**.
    4. Select **Delete Repository**
    5. Confirm deletion by again selecting **Delete Repository**.

    </TabItem>


</Tabs>


## Update repository permissions

To update the permissions for who can access and perform actions on a repository, do the following:


<Tabs>
    <TabItem value="up" label="up">
    Run the following command to list teams:
    ```ini
    up team list
    ```

    Run the following command to grant a permission:
    ```shell
    UPBOUND_TEAM_NAME=<team-name>
    UPBOUND_REPO_NAME=<repo-name>
    UPBOUND_REPO_PERMISSION=<permission>
    up repository permission grant ${UPBOUND_TEAM_NAME} ${UPBOUND_REPO_NAME} ${UPBOUND_REPO_PERMISSION}
    ```
    
    Run the following command to revoke a permission:
    ```shell
    UPBOUND_TEAM_NAME=<team-name>
    UPBOUND_REPO_NAME=<repo-name>
    up repository permission revoke ${UPBOUND_TEAM_NAME} ${UPBOUND_REPO_NAME}
    ```
    </TabItem>

    <TabItem value="Console" label="Console">
    To grant a permission to one or more teams, do the following:
    
    1. Open the Repositories page in the Upbound Console.
    2. Select the repository from the list.
    3. Select **Permissions**.
    4. Select **Create Permission**
    5. Select the role you want to grant.
    6. Select all teams you wish to grant the role to.
    7. Select **Create Permissions**.
    
    To revoke a permission from a team, do the following:
    
    1. Open the Repositories page in the Upbound Console.
    2. Select the repository from the list.
    3. Select the **"more actions" ellipsis** button next to the team you wish to revoke.
    4. Select **Remove**.
    </TabItem>
</Tabs>
