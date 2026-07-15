---
title: Migrating to Upbound control planes
sidebar_position: 90
description: A guide to how to migrate to a control plane in Upbound
---

The Upbound migration tool is a [CLI command][cli-command] that helps you migrate your existing Crossplane control plane to a control plane in Upbound. This tool works for migrating from self-managed Crossplane installations as well as between Upbound managed control planes (MCPs).


To migrate a control plane to Upbound, you must:

1. Export your existing Crossplane control plane configuration/state into an archive file.
2. Import the archive file into a control plane running in Upbound.
The migration tool is available in the [up CLI][up-cli] as
`up controlplane migration export` and `up controlplane migration import` commands.

## Prerequisites

Before you begin, you must have the following:
- The [up CLI][up-cli-1] version 0.23.0 or later.

## Migration process

To migrate an existing Crossplane control plane to a control plane in Upbound, do the following:

1. Run the `up controlplane migration export` command to export your existing Crossplane control plane configuration/state into an archive file:

    ```bash
    up controlplane migration export --kubeconfig <path-to-source-kubeconfig> --output <path-to-archive-file>
    ```

    The command exports your existing Crossplane control plane configuration/state into an archive file.

::: note
By default, the export command doesn't make any changes to your existing Crossplane control plane state, leaving it intact. Use the `--pause-before-export` flag to pause the reconciliation on managed resources before exporting the archive file.

This safety mechanism ensures the control plane you migrate state to doesn't assume ownership of resources before you're ready.
:::

2. Use the control plane [create command][create-command] to create a managed
control plane in Upbound:

    ```bash
    up controlplane create my-controlplane
    ```

3. Use [`up ctx`][up-ctx] to connect to the control plane created in the previous step:

    ```bash
    up ctx "<your-org>/<your-space>/<your-group>/my-controlplane"
    ```

    The command configures your local `kubeconfig` to connect to the control plane.

4. Run the following command to import the archive file into the control plane:

    ```bash
    up controlplane migration import --input <path-to-archive-file>
    ```
<!-- vale write-good.Weasel = NO -->
:::note
By default, the import command leaves the control plane in an inactive state by pausing the reconciliation on managed
resources. This pause gives you an opportunity to review the imported configuration/state before activating the control plane.
Use the `--unpause-after-import` flag to change the default behavior and activate the control plane immediately after
importing the archive file.
:::
<!-- vale write-good.Weasel = YES -->


5. Review and validate the imported configuration/state. When you are ready, activate your managed
   control plane by running the following command:

    ```bash
    kubectl annotate managed --all crossplane.io/paused-
    ```

   At this point, you can delete the source Crossplane control plane.

## CLI options

### Filtering

The migration tool captures the state of a Control Plane. The only filtering
supported is Kubernetes namespace and Kubernetes resource Type filtering.

You can exclude namespaces using the `--exclude-namespaces` CLI option. This can prevent the CLI from including unwanted resources in the export.

```bash
--exclude-namespaces=kube-system,kube-public,kube-node-lease,local-path-storage,...

# A list of specific namespaces to exclude from the export. Defaults to 'kube-system', 'kube-public','kube-node-lease', and 'local-path-storage'.
```

You can exclude Kubernetes Resource types by using the `--exclude-resources` CLI option:

```bash
--exclude-resources=EXCLUDE-RESOURCES,...

# A list of resource types to exclude from the export in "resource.group" format. No resources are excluded by default.
```

For example, here's an example for excluding the CRDs installed by Crossplane functions (since they're not needed):

```bash
up controlplane migration export \
  --exclude-resources=gotemplates.gotemplating.fn.crossplane.io,kclinputs.template.fn.crossplane.io
```

:::warning
You must specify resource names in lowercase "resource.group" format (for example, `gotemplates.gotemplating.fn.crossplane.io`). Using only the resource kind (for example, `GoTemplate`) isn't supported.
:::

<!-- vale write-good.Passive = NO -->
:::tip Function Input CRDs

Exclude function input CRDs (`inputs.template.fn.crossplane.io`, `resources.pt.fn.crossplane.io`, `gotemplates.gotemplating.fn.crossplane.io`, `kclinputs.template.fn.crossplane.io`) from migration exports. Upbound automatically recreates these resources during import. Function input CRDs typically have owner references to function packages and may have restricted RBAC access. Upbound installs these CRDs during the import when function packages are restored.

:::
<!-- vale write-good.Passive = YES -->

After export, users can also change the archive file to only include necessary resources.

### Export non-Crossplane resources

Use the `--include-extra-resources=` CLI option to select other CRD types to include in the export.

## Restore

The following is an example of a successful import run. At the end of the import, all Managed Resources are in a paused state.

<details>

<summary>View the migration import</summary>

```bash
$ up controlplane migration import
Importing control plane state...
✓ Reading state from the archive... Done! 👀
✓ Importing base resources... 18 resources imported! 📥
✓ Waiting for XRDs... Established! ⏳
✓ Waiting for Packages... Installed and Healthy! ⏳
✓ Importing remaining resources... 50 resources imported! 📥
✓ Finalizing import... Done! 🎉
```

</details>

The importer restores all resources in the export archive. Managed Resources get imported with the `crossplane.io/paused: "true"` annotation set. Use the `--unpause-after-import` CLI argument to automatically un-pause resources that got
paused during backup, or remove the annotation manually.

### Restore order

The importer restores based on Kubernetes types. The restore order doesn't include parent/child relationships.

Because Crossplane Composites create new Managed Resources if not present on the cluster, all
Claims, Composites and Managed Resources get imported in a paused state. You can un-pause them after the restore completes.

To manually un-pause managed resources after an import, remove the annotation by running:

```bash
kubectl annotate managed --all crossplane.io/paused-
```

You can also run import again with the `--unpause-after-import` flag to remove the annotations.

```bash
up controlplane migration import --unpause-after-import
```


[cli-command]: /reference/cli-reference
[up-cli]: /reference/cli-reference
[up-cli-1]: /manuals/cli/overview
[create-command]: /reference/cli-reference
[up-ctx]: /reference/cli-reference
