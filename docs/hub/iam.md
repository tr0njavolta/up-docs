---
title: Upbound IAM
sidebar_position: 2
tier: "standard"
---

Upbound allows administrators to deploy Role-based Access Control (RBAC)
for greater security and resource management. With Identity and Access
Management (IAM) and RBAC in Upbound, you can define and enforce access
control policies across your infrastructure.

## Benefits

Some benefits of implementing IAM in Upbound are:

- Centralized access control
- Consistency
- Permission management
- Scalability

## Core concepts

### Identity types

Upbound supports the following identity types:

- [Users][users] - Accounts representing a single user.
- [Organizations][organizations] - A top-level collection of
  users and teams.
- [Teams][teams] - A sub-group within an organization.
- [Robots][robots] - Non-user accounts designed for
  automation.


### Permissions model

Upbound uses an organization-based access model with two primary organization-scoped roles:

- Admins: Have full permissions to view and change all resources within the organization.
- Members: Can only view and interact with resources that admins have explicitly granted access to.


#### Administrators

Organization administrators have every available permission within the organization. Permissions include, but aren't limited to:

- Repository management (create repositories; push packages; download private packages)
- Manage membership (invite or remove users from the org; manage assigned roles)
- Team management (create teams; assign permissions; associate robots; team settings)
- Robot management (create robots; delete robots)
- Organization settings
- Delete organizations
- View and interact with the Upbound console

#### Members

Members can only view resources that administrators have granted access to. They can't create robot accounts or teams. By default, members don't have permission to view the console, but admins can grant them access to specific areas.

Upbound manages access to resources with role permissions. Each
organizations administrator can assign membership to a user to have access to
the following resources:

<!-- vale Upbound.Spelling = NO -->

|              | Create | List    | Read    | Update | Delete |
| ------------ | ------ | ------- | ------- | ------ | ------ |
| Organization | Anyone | Member+ | Member+ | Admin  | Admin  |
| User         | Anyone | Member+ | Self    | Self   | Self   |
| Membership   | Admin  | Member+ | Member+ | Admin  | Admin  |
| Robots       | Admin  | Member+ | Member+ | Admin  | Admin  |
| Teams        | Admin  | Member+ |         |        |        |
| Spaces       |        |         |         |        |        |
| Configs      | Admin  | Admin   | Admin   | Admin  | Admin  |
| Repos        | Admin  | Member+ | Member+ | Admin  | Admin  |

<!-- vale Upbound.Spelling = YES -->



## Authentication
Upbound offers three authentication methods for accessing the system.

Depending your operational model, you can choose:

* Upbound Identity (with Connected or Cloud Spaces)
* Kubernetes Authentication (with Connected or Disconnected Spaces)
* Custom OIDC (with Connected or Disconnected Spaces)

Each authentication method results in a username string and a set of groups, each represented as a string like the [Kubernetes authentication strategies][kubernetes-authentication-strategies].

<!-- vale Google.WordList = NO -->

* **Subject**: The username, represented by the `sub` claim, can be either `upbound:user:<name>` or `upbound:robot:<name>`.
* **Team Memberships**: User groups, represented by the `groups` claim, include `upbound:team:<UUID>` for each team the user belongs to.
* **Organization Role**: The user's role within the organization, also represented by the `groups` claim, can be `upbound:org-role:admin` or `upbound:org-role:member`.

### Kubernetes authentication

The Kubernetes authentication mode allows your users to use the `up` CLI to authenticate directly to the hub Kubernetes cluster.

Kubernetes supports several [authentication strategies][authentication-strategies], including:

* **Client certificates**: For long-lived credentials.
<!-- vale Microsoft.Terms = NO -->
* **Cloud provider OIDC tokens**: Tokens that have an identity in both the cloud provider and Kubernetes
<!-- vale Microsoft.Terms = YES -->
* **Kubernetes ServiceAccounts**

You can use all these methods with `up` to access the Spaces API and control planes if you have hub authentication enabled (enabled by default).

To enable or disable this feature, set `authentication.hubIdentities=true|false` as necessary. This feature uses the [TokenReview API][tokenreview-api].


### OIDC

<!-- vale Upbound.Spelling = NO -->
To grant principals in an OIDC-compliant directory (like Keycloak, Entra, Okta, etc.) access, there are two options:
<!-- vale Upbound.Spelling = YES -->

* If you're using Connected and Cloud Spaces, consider [enabling Directory Sync][enabling-directory-sync], which syncs your users from your directory into the Upbound Identity model and allows your entire organization to use the Upbound console.
* If you're using Disconnected Spaces, you can configure the space to [authenticate JWT tokens from your OIDC provider][authenticate-jwt-tokens-from-your-oidc-provider].

## Authorization

<!-- vale Microsoft.Terms = NO -->
Upbound uses identities to check for authentication across the platform. In the Cloud environment, Upbound grants identities organization roles to control access to features and resources with IAM policies.
<!-- vale Google.WordList = YES -->
<!-- vale Microsoft.Terms = YES -->

You can bind identities to Kubernetes RBAC and/or Upbound RBAC to control access to resources depending on your operational model. The authentication process produces a username and group list, which, combined with RBAC rules, determine the user's effective permissions for an API request.


Depending on your operational model, you can use either:
* Upbound RBAC (with Connected or Cloud Spaces)
* Kubernetes Hub Authorization (with Connected or Disconnected Spaces)

## Role-based access control

Upbound offers two primary models for implementing RBAC: the Kubernetes Hub model and the Upbound model. Understanding the differences and use cases for each is crucial for effective access management.

<!-- vale write-good.Passive = NO -->
The Kubernetes RBAC model is enabled by default. Upbound RBAC can be enabled with `features.alpha.upboundRBAC.enabled=true`.
<!-- vale write-good.Passive = YES -->

<!-- vale Microsoft.HeadingAcronyms = NO -->
<!-- vale Google.Headings = NO -->
### Kubernetes RBAC model
<!-- vale Microsoft.HeadingAcronyms = YES -->
<!-- vale Google.Headings = NO -->


The Kubernetes Hub model leverages native Kubernetes RBAC mechanisms and is ideal for:
- Single-Tenant Connected Spaces
- Disconnected Spaces
- Environments with existing Kubernetes infrastructure

Key features:
- Uses standard Kubernetes `ClusterRoles`, `Roles`, `ClusterRoleBindings`, and `RoleBindings`
- Allows fine-grained control over Kubernetes resources
- Integrates seamlessly with existing Kubernetes RBAC configurations

### Upbound model

<!-- vale Upbound.Spelling = NO -->
<!-- vale Google.WordList = NO -->
The Upbound model is a proprietary RBAC system designed specifically for Upbound's platform and is suitable for:
* Connected Spaces
* Cloud Spaces
* Scenarios requiring Upbound-specific resource management

Key features:
* Introduces Upbound-specific roles: controlplane group admin, controlplane group editor, and controlplane group viewer
* Provides a simplified, hierarchical approach to access management within the Upbound console UI
* Offers built-in integration with Upbound's unique resources and control planes
<!-- vale Upbound.Spelling = YES -->
<!-- vale Google.WordList = YES -->


[users]: /manuals/platform/users
[organizations]: /manuals/platform/organizations
[teams]: /manuals/platform/teams
[robots]: /manuals/platform/robots
[enabling-directory-sync]: /manuals/platform/sso
[authenticate-jwt-tokens-from-your-oidc-provider]: /manuals/platform/oidc


[kubernetes-authentication-strategies]: https://kubernetes.io/docs/reference/access-authn-authz/authentication/#authentication-strategies
[authentication-strategies]: https://kubernetes.io/docs/reference/access-authn-authz/authentication/#authentication-strategies
[tokenreview-api]: https://kubernetes.io/docs/reference/access-authn-authz/authentication/#webhook-token-authentication
