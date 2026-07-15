---
title: Upbound Console
sidebar_position: 1
description: An introduction to the Console feature of Upbound
plan: "standard"
---

<Standard />

Upbound's Console is the command and control center for users to operate their
organization's internal cloud platforms. The Console consolidates management of
your internal cloud platforms under a single pane of glass. You can view usage
and logs, debug control plane operations, and more across all your control
planes.

## Dashboard

The default landing page for the Console is the control plane dashboard. On the
dashboard is a table view of your control planes showing key details such as
name, status, configuration version, and creation date. You can search the table
by control plane name to filter down the table.

Above the dashboard is Upbound's top navigation bar. Wherever you are in the product, the navigation bar allows you to access:

- Control plane dashboard
- Configurations list
- Organization settings and management
- Help and documentation
- the Upbound Marketplace
- Account management and an org picker (if you belong to several organizations)

![Upbound Console Dashboard](/img/console-dashboard.png)

<!-- vale Google.Headings = NO -->
## Control Plane Explorer
<!-- vale Google.Headings = YES -->

Clicking into a control plane brings you to the control plane explorer. From the control plane explorer you can learn how to integrate the control plane.

![Upbound Control Plane Dashboard](/img/ctp-dashboard-new.png)

<!-- vale Google.Headings = NO -->
## Control plane and configuration creation
<!-- vale Google.Headings = YES -->

You can create new control planes from the dashboard.

Creating a new control plane from the Console:

![Upbound Control Plane Dashboard](/img/new-ctp-console.png)

### Resource structure

Control plane resource URLs follow this pattern:

```shell
/<YOUR_ORGANIZATION_NAME>/spaces/<YOUR_SPACE_NAME>/groups/<YOUR_GROUP_NAME>/controlPlanes/<YOUR_CONTROL_PLANE_NAME>/definitions/<RESOURCE_TYPE>
```

For example, to view a composition in a specific control plane:

```shell
/upbound/spaces/upbound-aws-us-east-1/groups/default/controlPlanes/upbound:upbound-aws-us-east-1:default:ctp-test/definitions/composition
```
:::important
Resource-specific URLs have changed from the previous Console experience. Old
bookmarks and deep links to specific resources may not work. Use the Console
interface to navigate or search for resources.
:::

### Graph and list views

For Claims (`XRCs`), Composite Resources (`XRs`), and Managed Resources (`MRs`), you
can toggle between a list view and graph view using the toolbar.

![Upbound Control Plane Views](/img/new-ctp-views.png)

The graph view displays all resources of the selected type and shows their
relationships visually. Click on any resource tile in the graph to open a detail
drawer.


![Upbound Control Plane Views](/img/new-ctp-graph.png)

:::important
The graph view doesn't update automatically with real-time changes. Use the
refresh button to reload the graph with current data.
:::

List views include refresh controls in the header. You can:

* Refresh manually
* Set an auto refresh interval
* Pause auto refresh

![Upbound Control Plane Refresh](/img/new-ctp-refresh.png)

## Resource details

When you open a resource, the console displays:

* **Details**: Kind, API Version, created date, and scope
* **Status**: List of status conditions and timestamps with messages
* **Printer Columns**: Kubernetes `additionalPrinterColumns` data
* **Events**: Events related to the resource with optional filters
* **YAML**: Resource definition
* **Referenced By**: Resources that reference this resource

![Upbound Control Plane Resources](/img/new-ctp-resource-drawer.png)

### Pipeline view

Compositions, Composition Revisions, Functions, and Function Revisions include a
details drawer with a Pipeline section. This shows the ordered steps that
execute, including step names and associated resources or functions.


![Upbound Control Plane Pipeline](/img/new-ctp-pipeline.png)

### Events

Use the Events tab to filter for specific information in your control plane.


![Upbound Control Plane Events](/img/new-ctp-resource-events.png)

## Provider configurations

The Console displays Provider Configurations in a read-only list view. The
Console doesn't provide interfaces to create, update, or delete Provider
Configurations.

![Upbound Control Plane Providers](/img/new-ctp-providers.png)

To manage your Provider Configurations, use `kubectl` and refer to the
[`ProviderConfig` documentation][providerconfig].

## Secrets

The updated Secrets view displays External Secrets in a table format showing the
secret name, secret store, and creation date.

![Upbound Control Plane Secrets](/img/new-ctp-secrets.png)

You can select the secret for more information.

<!-- vale gitlab.SubstitutionWarning = NO -->
![Upbound Control Plane Secret Info](/img/new-ctp-secret-info.png)
<!-- vale gitlab.SubstitutionWarning = YES -->

## Organization and team management

In the top right dropdown, you can navigate to your organization management
settings.

![Upbound Control Plane Console Dropdown](/img/new-console-dropdown.png)

You can create new team members, assign roles, and more.

![Upbound Control Plane Console Management](/img/new-console-mgmt.png)

## Account management

Clicking on your account profile and selecting `Manage Account` takes you to your personal account settings.

### Create a personal access token

You can create a personal access token (`PAT`) from the Account Settings view. Select `API Tokens` in the left-side menu and then select `Create New Token`. Use personal access tokens to authenticate to Upbound with the `up` CLI.

![Upbound Control Plane Account Management](/img/ctp-create-token.png)

[providerconfig]: /self-hosted-spaces/concepts/control-planes/#configure-crossplane-providerconfigs
