---
mdx:
  format: md
---

Run a project on a development control plane for testing.

The `run` command builds and runs a project on a development control plane for
testing.

This command:

- Builds all embedded functions defined in the project
- Creates or uses an existing development control plane
- Pushes packages to the container registry
- Installs the project configuration on the control plane
- Updates kubeconfig to use the development control plane

#### Development Control Planes

There are two kinds of development control planes:

1. Local development control planes, which run in a KIND cluster on the
   development machine.
2. Cloud development control planes, which run in Upbound Cloud Spaces.

Cloud development control planes are used by default when the current `up`
context is an Upbound Cloud Space. Use `up ctx` to update the current context.
Local development control planes are used by default otherwise, and can be
explicitly requested using the `--local` flag.

Local development control planes always use UXP v2.0 or newer, defaulting to the
latest version available. The default UXP version for cloud development control
planes depends on your project version: v1.x for v1alpha1 projects or v2.x for
v2alpha1 projects. The default version can be overridden with the
`--control-plane-version` flag.

It is also possible to run a project on an arbitrary UXP cluster referenced by
the current kubeconfig context by using the `--use-current-context` flag. Note
that this can be destructive, as it will create resources and install packages
in your cluster; it is not recommended to use `up project run` on shared or
production clusters.

#### Examples

Run the project using the default development control plane type (see above):

```shell
up project run
```

Run the project on a control plane with a specific name, using the default
type. The control plane will be created if it doesn't exist:

```shell
up project run --control-plane-name=my-dev-cp
```

Force a local development control plane to be used instead of a cloud
development control plane:

```shell
up project run --local
```

Create a local development control plane with an ingress controller enabled.
The Web UI will be accessible at localhost on a randomly assigned port:

```shell
up project run --local --ingress
```

Create a local development control plane with ingress mapped to specific port.
The Web UI will be accessible at http://127-0-0-1.nip.io:8080:

```shell
up project run --local --ingress --ingress-port=8080:80
```

Run a project using the current kubeconfig context:

```shell
up project run --use-current-context
```

Override the repository specified in the project file to push to a different
container registry. Note that when using a local development control plane
packages are side-loaded, avoiding the need to push:

```shell
up project run --repository=xpkg.upbound.io/example/my-project
```

Run on a Spaces control plane with a specific name, allowing a non-development
control plane to be used. This works with disconnected Spaces as well as Cloud
Spaces:

```shell
up project run --force --control-plane-name=my-cp
```

Override the default UXP version used for a Spaces development control plane,
for example to test a v1 project on a v2 control plane:

```shell
up project run --control-plane-version=v1.20.1-up.1
```

Apply `imageconfig.yaml` before installing the configuration and
`providerconfig.yaml` after installing the configuration:

```shell
up project run --init-resources=imageconfig.yaml --extra-resources=providerconfig.yaml
```


#### Usage

`up project run [flags]`
#### Flags

| Flag | Short Form | Description |
| ---- | ---------- | ----------- |
| `--project-file` | `-f` | Path to project definition file. |
| `--repository` | | Repository for the built package. Overrides the repository specified in the project file. |
| `--no-build-cache` | | Don't cache image layers while building. |
| `--build-cache-dir` | | Path to the build cache directory. |
| `--max-concurrency` | | Maximum number of functions to build and push at once. |
| `--tag` | `-t` | Tag for the built package. If not provided, a tag of the form v0.0.0-{timestamp} will be generated. |
| `--control-plane-group` | | The control plane group that the control plane to use is contained in. This defaults to the group specified in the current context. |
| `--control-plane-name` | | Name of the control plane to use. It will be created if not found. Defaults to the project name. |
| `--control-plane-version` | | Version of Crossplane to use for the control plane. By default, the latest compatible version will be used. |
| `--skip-control-plane-check` | | Allow running on a non-development control plane. |
| `--local` | | Use a local dev control plane, even if Spaces is available. |
| `--local-registry-path` | | Directory to use for local registry images. The default is system-dependent. |
| `--no-update-kubeconfig` | | Do not update kubeconfig to use the dev control plane as its current context. |
| `--use-current-context` | | Run the project with the current kubeconfig context rather than creating a new dev control plane. |
| `--cache-dir` | | Directory used for caching dependencies. |
| `--public` | | Create new repositories with public visibility. |
| `--timeout` | | Maximum time to wait for the project to become ready in the control plane. Set to zero to wait forever. |
| `--ingress` | | Enable ingress controller for the local dev control plane. |
| `--ingress-port` | | Port mapping for the local dev control plane (e.g., '8080:80'). If not specified, a random available port will be selected when ingress is enabled. |
| `--cluster-admin` | | Allow Crossplane cluster admin privileges in the local dev control plane. Defaults to true. |
| `--init-resources` | | Paths to additional resource manifests that should be applied before installing the project. |
| `--extra-resources` | | Paths to additional resource manifests that should be applied after installing the project. |
| `--set-helm-values` | | Set custom Crossplane helm chart values for the local dev control plane, specified as key=value pairs. |
| `--helm-values` | | Path to a YAML file containing custom Crossplane helm chart values for the local dev control plane. |
