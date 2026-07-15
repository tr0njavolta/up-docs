---
title: Users
sidebar_position: 4
description: Creating and managing Upbound users
---

User accounts in Upbound belong to individuals. Each user can be a member of one or more [teams][teams], which have permissions on control planes within an [organization][organization]. A user can be a member of multiple organizations.

## Account settings

<!-- vale Google.FirstPerson = NO -->
<!-- Allow `My Account` -->
You can change your account settings by clicking the profile photo in the top
right and selecting **My Account** in the Upbound Console.
<!-- vale Google.FirstPerson = YES -->
![Options available in the Account menu](/img/edit-account.png)

## Change account information

The [Account Settings][account-settings] screen allows you to change your password, connect to GitHub, Google or email for authentication or delete your Upbound account.

<!-- vale gitlab.Substitutions = NO -->
<!-- allow lowercase kubernetes in the URL -->
:::warning
You use API Tokens to log in with the [Up command-line][up-command-line]. You can't use this token as a [Kubernetes image pull secret][kubernetes-image-pull-secret]
:::
<!-- vale gitlab.Substitutions = YES -->

## Create an account

Use the [Upbound registration page][upbound-registration-page] to
create a new user account.
<!-- vale Google.Headings = NO -->

### 1. Choose a registration method

Register with Upbound with your GitHub account, Google account or email.
<!-- ![Choose to sign up with GitHub, Google or Email](/img/signup.png) -->



### 2. Complete the registration form
Complete the form and agree to the Terms and Conditions.

<!-- ![Upbound account creation registration form](/img/completed_form.png) -->


### 3. Confirm your email
Upbound sends you an email containing a 6-digit PIN. Provide this PIN to confirm your email address.


### 4. Create your organization
<!-- ![Example form to insert email confirmation PIN](/img/confirm_pin.png) -->
After submitting your pin you can create your first organization. An organization lets multiple users share Upbound resources and collaborate. Create your first organization to invite teammates and manage control planes together.

![Upbound organization creation form](/img/create-organization.png)


Clicking `Create Organization` sends you to the [Upbound Console][upbound-console].

To make changes to your account login to [accounts.upbound.io][accounts-upbound-io]
<!-- vale Google.Headings = YES -->

## Delete an account

<!-- vale Google.FirstPerson = NO -->
Selecting [Delete Account][delete-account] in the
**My Account** pane sends a deletion request to Upbound support.
<!-- vale Google.FirstPerson = YES -->

Organizations associated with this account aren't deleted.

If the user is the primary account for an organization, contact [Upbound
support][upbound-support] to transfer organization ownership.

[teams]: /manuals/platform/teams
[organization]: /manuals/platform/organizations
[up-command-line]: /manuals/cli/overview
[kubernetes-image-pull-secret]: /manuals/marketplace/authentication#kubernetes-image-pull-secrets
[upbound-support]: /reference/usage/support

[account-settings]: https://accounts.upbound.io/settings
[upbound-registration-page]: https://www.upbound.io/register/?utm_source=docs&utm_medium=cta&utm_campaign=docs_iam
[accounts-upbound-io]: https://accounts.upbound.io
[delete-account]: https://accounts.upbound.io/settings/delete
[upbound-console]: https://console.upbound.io/

