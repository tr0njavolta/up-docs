---
title: "Get Started"
sidebar_position: 5
description: "A guide to deploying an internal development platform powered by Upbound control planes"
---

This solution demonstrates how to configure Upbound control planes to power a
streamlined, self-service platform for your engineering teams. Clone and tailor
it to your needs to roll out an Internal Developer Platform (IDP). An IDP enables
developers to spin up resources that are production-ready,
policy-compliant, and governed by Upbound's control mechanisms and proven
patterns.

This guide helps you deploy this solution.

## Before you begin

This quickstart assumes a basic understanding of Crossplane, Backstage, and ArgoCD concepts. For more information, see their respective documentation pages:

- Crossplane: https://docs.crossplane.io/latest/get-started/get-started-with-composition/
- Backstage: https://backstage.io/docs/features/techdocs/
- ArgoCD: https://argo-cd.readthedocs.io/en/stable/


### Prerequisites

Before you start to deploy this solution, you need to have the following:

- An [Upbound Account][registerAccount] and Organization created
- [AWS credentials][awsCreds] stored at `/Users/$USER/.aws/aws.json`
- A Unix-like system (macOS/Linux/WSL)
- Docker Desktop
- kubectl
- Upbound CLI [up][upCli]

<!-- vale off -->
:::important
This solution involves deploying backend Kubernetes infrastructure for components of the platform. Only AWS EKS is currently implemented, but the same concepts demonstrated in the solution may be applied to Azure and GCP. 
:::
<!-- vale on -->

### Clone this repository

Building out your Internal Developer Platform (IDP) with Upbound couldn't be easier with the starter kit. To get started, first fork the starter kit implementation found at https://github.com/upbound/solution-idp and clone it.

```shell
# Update the repository to your fork
git clone https://github.com/upbound/solution-idp.git
cd solution-idp
```
<!-- vale Google.Headings = NO -->
### Install Task CLI
<!-- vale Google.Headings = YES -->

This project leverages [Task][taskfile] for automating setup steps. Install it if you don't have it on your machine.

```shell
brew install go-task/tap/go-task
```

### Login to Upbound

The first step in deployment is to authenticate your `up` CLI. Login with the following command:

```shell
up login
```

### Select an Upbound Space for deployment

Select the Upbound Space to the control planes responsible for bootstrapping and managing the IDP. You can either choose a Cloud Space or self-hosted Upbound Space.
<Tabs>

<TabItem value="Cloud Space" label="Cloud Space">

This command uses Upbound's AWS US East Cloud Space, but you can choose any other Cloud Space if you like:

```shell
up ctx $UPBOUND_ORGANIZATION/upbound-aws-us-east-1/default
```

</TabItem>
<TabItem value="Self-Hosted Space" label="Self-Hosted Space">

Update this command to refer to a self-hosted Space you've already deployed and connected to the Upbound Console:

```shell
up ctx $UPBOUND_ORGANIZATION/$SELF_HOSTED_SPACE_NAME/default
```

</TabItem>

</Tabs>

## Bootstrap your environment

### Configure launch variables

Configure the variables defined in `/state/solution-idp-non-prod/Taskfile.yaml`:

```shell
vars:
  AWS_CREDENTIALS_PATH: 
  UPBOUND_ORG: 
  UPBOUND_ORG_TEAM: 
  SPACE: 
  ROOT_GROUP_NAME: "solution-idp-non-prod"
  ROOT_CTP_NAME: "bootstrap"
  GIT_REPO: 
  GIT_REVISION: "main"
```
<!-- vale Google.WordList = NO -->
Here's an explanation for each variable above:
<!-- vale Google.WordList = YES -->

- `AWS_CREDENTIALS_PATH`: Path to your AWS credentials used by the bootstrap control plane in a _ProviderConfig_
- `UPBOUND_ORG`: Your Upbound Organization. You can find this by running `up org list`.
- `UPBOUND_ORG_TEAM`: The Upbound organization team to house the robot accounts Backstage uses for authentication.
- `SPACE`: Upbound Space that hosts the bootstrap and frontend control planes
- `ROOT_GROUP_NAME`: Root Upbound group name to house bootstrap control plane. Default: `solution-idp-non-prod`
- `ROOT_CTP_NAME`: Root control plane responsible for bootstrapping this solution. Default: `boostrap`
- `GIT_REPO`: The Git repository URL of the forked starter kit
- `GIT_REVISION`: target branch of GIT_REPO. Default: main

### Execute the bootstrap

After you populate the variables, bootstrap your environment:

```shell
cd state/solution-idp-non-prod
task bootstrap-all
```

The bootstrap process takes 3 to 5 minutes. After the command finishes, go to your space and observe the two newly created control plane groups:

![starterGroups][starterGroups]

Next go to the bootstrap control plane in `solution-idp-non-prod` group and validate that the `frontend` composite resource (XR) shows synced and ready:

![frontendCtp][frontendCtp]

Once the `frontend` XR is ready, go to the `frontend` control plane group:

![controlplaneView][controlplaneView]

Then validate that all the XRs become synced and ready:

![readyResources][readyResources]

## Visit the development portal

Once everything gets fully provisioned, visit the development portal for your platform:

![backstage][backstage]

## Clean up

To clean up the platform, delete the root `Application` from the bootstrap control plane, then delete all the `XEnvironments` from the bootstrap control plane.

[taskfile]: https://taskfile.dev/
[registerAccount]: https://www.upbound.io/register/?utm_source=docs&utm_medium=cta&utm_campaign=docs_idp
[awsCreds]: https://docs.aws.amazon.com/sdkref/latest/guide/feature-static-credentials.html
[design]: /solutions/design
[upCli]: /manuals/cli/overview
[starterGroups]: /img/solutions/starter-groups.png
[frontendCtp]: /img/solutions/frontend-ctp.png
[controlplaneView]: /img/solutions/control-plane-view.png
[readyResources]: /img/solutions/ready-resources.png
[backstage]: /img/solutions/backstage.png
