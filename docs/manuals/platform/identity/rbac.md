---
title: Upbound RBAC
sidebar_position: 7
description: A guide to implementing and configuring access control in Upbound
plan: "standard"
slug: /manuals/platform/rbac
---

<Standard />

This guide provides an overview of role-based access control (RBAC) in Upbound. RBAC lets you control access to your Upbound resources and control planes based on the roles of individual users in your organization.
<!-- vale off -->
:::tip
To learn how to manage access to resources in a control plane, read the [documentation][documentation] on authorizing actions on resources in control planes
:::
<!-- vale on -->

<!-- vale Microsoft.HeadingAcronyms = NO -->
## Enable Upbound RBAC
<!-- vale Microsoft.HeadingAcronyms = YES -->

:::tip
This section only applies to administrators who've deployed a self-hosted Space.
:::

For administrators who have deployed [self-hosted Spaces][self-hosted-spaces], you can enable Upbound RBAC at install or upgrade time. Configure the feature in the Spaces helm chart:

```yaml
--set "features.alpha.upboundRBAC.enabled=true"
```

<!-- vale write-good.Passive = NO -->
Upbound RBAC is enabled by default in Upbound Cloud Spaces.
<!-- vale write-good.Passive = YES -->

<!-- vale write-good.TooWordy = NO -->
## Authorize access to control plane group resources
<!-- vale write-good.TooWordy = YES -->

### Roles

Upbound RBAC roles define sets of permissions with three built-in roles at the group level:

- Admin
- Editor
- Viewer

These roles apply at three levels:
- Organization
- Control Plane Groups
- Control Planes

Review the table for permissions for each role:


| CONTROLPLANE ROLES | VIEWER | EDITOR | CONTROLLER | ADMIN |
|---|---|---|---|---|
| `whoami`, `can-i`, and discover APIs | Read | Read | Read | Read |
| Namespaces | Read | Read | Create + Read | CRUD |
| Events | Read | Read | CRUD | CRUD |
| Secrets Connection Details | Read | CRUD | CRUD | CRUD |
| *.crossplane.io APIs | Read | CRUD | CRUD | CRUD |
| MRs, Compositions, Claims | Read | CRUD | CRUD | CRUD |
| ConfigMaps | ✗ | CRUD | CRUD | CRUD |
| External Secrets Operator (ESO) APIs | Read | Read* | Read* | CRUD |
| CRDs | Read | Read | Read | Read + Update |
| Pods | ✗ | Read + Delete | ✗ | Read + Delete |
| Deployments | ✗ | Read | ✗ | Read |
| ReplicaSets | ✗ | Read | ✗ | Read |
| ControllerRevisions | Read | CRUD | CRUD | CRUD |
| Services | ✗ | Read | ✗ | Read |
| Webhook Configurations | ✗ | Read | ✗ | Read |
| ValidatingAdmissionPolicies | ✗ | Read | ✗ | Read |
| Leases | ✗ | ✗ | CRUD | CRUD |
| ClusterRoles | ✗ | ✗ | ✗ | CRUD |
| ClusterRoleBindings | ✗ | ✗ | ✗ | CRUD |
| Roles | ✗ | ✗ | ✗ | CRUD |
| RoleBindings | ✗ | ✗ | ✗ | CRUD |
| ServiceAccounts | ✗ | ✗ | ✗ | CRUD |

:::note
Editor and Controller lack Read permissions on `quayaccesstokens`, `stssessiontokens` ESO generator types.
:::

### View group role permissions


<Tabs>
<TabItem value="Console" label="Console">
1. On the **Control Planes** screen in the Console, select which **Space** and **group** context you wish to be in.
2. Select the **Settings** pane of the control plane group.
3. In the **Team access** card of the settings page, view the teams and their permissions for this group.
</TabItem>

<TabItem value="Space API" label="Space API">
Use the [up CLI][up-cli] to set your kubecontext to the desired Space, then run the following:

```sh
kubectl get objectrolebindings
NAME            AGE
default-zcntk   14s
```

Each role permission granted to a team gets represented with an `objectrolebinding` Space API resource.
</TabItem>
</Tabs>

### Assign group role permissions


<Tabs>
<TabItem value="Console" label="Console">
1. On the **Control Planes** screen in the Console, select which **Space** and **group** context you wish to be in.
2. Select the **Settings** pane of the control plane group view.
3. Select **Add Teams**
4. Select which role you wish to grant.
5. Select which teams you wish to apply the role to, then select the **Add Selected to Group** button.
</TabItem>

<TabItem value="Space API" label="Space API">
Use the [up CLI][up-cli-1] to set your kubecontext to the desired Space, then create an `objectrolebinding`. The example below gives control plane group editor access to the `UpboundTeam` with the UUID of `918a6338-abbe-420d-81cf-9e87642a87c6`:

```yaml
apiVersion: authorization.spaces.upbound.io/v1alpha1
kind: ObjectRoleBinding
metadata:
  name: my-binding
  namespace: ctp-group-1
spec:
  object:
    apiGroup: core
    resource: namespaces
    name: ctp-group-1
  subjects:
  - kind: UpboundTeam
    name: 918a6338-abbe-420d-81cf-9e87642a87c6
    role: editor
```
</TabItem>
</Tabs>

### Delete group role permissions


<Tabs>
<TabItem value="Console" label="Console">
1. On the **Control Planes** screen in the Console, select which **Space** and **group** context you wish to be in.
2. Select the **Settings** pane of the control plane group view.
3. Select the settings button on the right side the team you wish to delete.
4. Select **Remove**
</TabItem>

<TabItem value="Space API" label="Space API">
Use the [up CLI][up-cli-2] to set your kubecontext to the desired Space, then delete the desired `objectrolebinding`. The example below deletes the permission created in the previous section:

```sh
kubectl delete objectrolebinding default-zcntk
objectrolebinding.authorization.spaces.upbound.io "default-zcntk" deleted
```
</TabItem>
</Tabs>


[documentation]: /manuals/platform/k8s-rbac
[self-hosted-spaces]: /self-hosted-spaces/howtos/deployment-reqs
[up-cli]: /manuals/cli/concepts/contexts
[up-cli-1]: /manuals/cli/concepts/contexts
[up-cli-2]: /manuals/cli/concepts/contexts
