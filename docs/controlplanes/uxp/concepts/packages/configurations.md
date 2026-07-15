---
title: Configurations
sidebar_position: 20
description: Packages combine multiple Crossplane resources into a single, portable,
  OCI image.
---

A _Configuration_ package is an 
[OCI container image][oci] containing a collection of
[Compositions][compositions], 
[Composite Resource Definitions][composite-resource-definitions]
and any required [Providers][providers] or 
[Functions][functions].

Configuration packages make your Crossplane configuration fully portable. 

:::important
Crossplane Providers and Functions are also Crossplane packages.  

This document describes how to install and manage configuration packages.  

Refer to the 
[Provider][providers] and 
[Functions][functions] chapters for
details on their usage of packages.
:::

## Install a Configuration

Install a Configuration with a Crossplane 
Configuration object by setting 
the spec.package value to the
location of the configuration package.

Use the `up` CLI to install a configuration into your control plane:

```shell
up ctp provider install xpkg.upbound.io/upbound/configuration-quickstart:v0.1.0
```

### Install as a configuration object

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: configuration-quickstart
spec:
  package: xpkg.upbound.io/upbound/configuration-quickstart:v0.1.0
```

:::tip
Crossplane supports installations with image digests instead of tags to get deterministic
and repeatable installations.

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: configuration-quickstart
spec:
  package: xpkg.upbound.io/upbound/configuration-quickstart@sha256:ef9795d146190637351a5c5848e0bab5e0c190fec7780f6c426fbffa0cb68358
```
:::

Crossplane installs the Compositions, Composite Resource Definitions and
Providers listed in the Configuration. 

### Install with Helm

Crossplane supports installing Configurations during an initial Crossplane
installation with the Crossplane Helm chart.

Use the
--set configuration.packages
argument with `helm install`.

For example, to install the Getting Started configuration,

```shell
helm install crossplane \
crossplane-stable/crossplane \
--namespace crossplane-system \
--create-namespace \
--set configuration.packages='{xpkg.upbound.io/upbound/configuration-quickstart:v0.1.0}'
```

### Install offline

Installing Crossplane packages offline requires a local container registry, such as
[Harbor][harbor] to host the packages. Crossplane only
supports installing packages from a container registry. 

Crossplane doesn't support installing packages directly from Kubernetes
volumes.

### Installation options

Configurations support multiple options to change configuration package related
settings. 

#### Configuration revisions

When installing a newer version of an existing Configuration Crossplane creates
a new configuration revision. 

View the configuration revisions with 
kubectl get configurationrevisions.

```shell
kubectl get configurationrevisions
NAME                            HEALTHY   REVISION   IMAGE                                             STATE      DEP-FOUND   DEP-INSTALLED   AGE
platform-ref-aws-1735d56cd88d   True      2          xpkg.upbound.io/upbound/platform-ref-aws:v0.5.0   Active     2           2               46s
platform-ref-aws-3ac761211893   True      1          xpkg.upbound.io/upbound/platform-ref-aws:v0.4.1   Inactive                               5m13s
```

Only a single revision is active at a time. The active revision determines the
available resources, including Compositions and Composite Resource Definitions. 

By default Crossplane keeps only a single _Inactive_ revision.

Change the number of revisions Crossplane maintains with a Configuration package 
revisionHistoryLimit. 

The revisionHistoryLimit
field is an integer.  
The default value is `1`.  
Disable storing revisions by setting 
revisionHistoryLimit to `0`.

For example, to change the default setting and store 10 revisions use 
revisionHistoryLimit: 10.

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: platform-ref-aws
spec:
  revisionHistoryLimit: 10
# Removed for brevity
```

#### Configuration package pull policy

Use a packagePullPolicy to
define when Crossplane should download the Configuration package to the local
Crossplane package cache.

The `packagePullPolicy` options are: 
* `IfNotPresent` - (**default**) Only download the package if it isn't in the cache.
* `Always` - Check for new packages every minute and download any matching
  package that isn't in the cache.
* `Never` - Never download the package. Packages are only installed from the
  local package cache. 

:::tip
The Crossplane 
packagePullPolicy works
like the Kubernetes container image 
[image pull policy][k8s-image-pull-policy].  

Crossplane supports the use of tags and package digest hashes like
Kubernetes images.
:::

For example, to `Always` download a given Configuration package use the 
packagePullPolicy: Always
configuration. 

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: platform-ref-aws
spec:
  packagePullPolicy: Always
# Removed for brevity
```

#### Revision activation policy

The `Active` package revision
is the package controller actively reconciling resources. 

By default Crossplane sets the most recently installed package revision as 
`Active`.

Control the Configuration upgrade behavior with a
revisionActivationPolicy.

The revisionActivationPolicy 
options are:
* `Automatic` - (**default**) Automatically activate the last installed configuration.
* `Manual` - Don't automatically activate a configuration. 

For example, to change the upgrade behavior to require manual upgrades, set 
revisionActivationPolicy: Manual.

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: platform-ref-aws
spec:
  revisionActivationPolicy: Manual
# Removed for brevity
```

#### Install a Configuration from a private registry

Like Kubernetes uses `imagePullSecrets` to 
[install images from private registries][k8s-private-registry], 
Crossplane uses `packagePullSecrets` to install Configuration packages from a 
private registry. 

Use packagePullSecrets to provide a
Kubernetes secret to use for authentication when downloading a Configuration 
package. 

:::important
The Kubernetes secret must be in the same namespace as Crossplane.
:::

The packagePullSecrets is a list of
secrets.

For example, to use the secret named
example-secret configure a 
packagePullSecrets.

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: platform-ref-aws
spec:
  packagePullSecrets: 
    - name: example-secret
# Removed for brevity
```

#### Ignore dependencies

By default Crossplane installs any [dependencies](#manage-dependencies) listed
in a Configuration package. 

Crossplane can ignore a Configuration package's dependencies with 
skipDependencyResolution.

:::warning
Most Configurations include dependencies for the required Providers. 

If a Configuration ignores dependencies, the required Providers must be 
manually installed.
:::

For example, to disable dependency resolution configure 
skipDependencyResolution: true.

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: platform-ref-aws
spec:
  skipDependencyResolution: true
# Removed for brevity
```

#### Automatically update dependency versions

Crossplane can automatically upgrade a package's dependency version to the minimum
valid version that satisfies all the constraints. It's an alpha feature that
requires enabling with the `--enable-dependency-version-upgrades` flag.

<!-- vale write-good.Passive = NO -->
Sometimes, dependency version downgrade is required for proceeding with
installations. Suppose configuration A, which depends on package X with the
constraint`>=v0.0.0`, is installed on the control plane. In this case, the package
manager installs the latest version of package X, such as `v3.0.0`. Later, you decide
to install configuration B, which depends on package X with the constraint `<=v2.0.0`.
Since version `v2.0.0`satisfies both conditions, package X must be downgraded to
allow the installation of configuration B which is disabled by default.

For enabling automatic dependency version downgrades, there is a configuration
option as a helm value `packageManager.enableAutomaticDependencyDowngrade=true`.
Downgrading a package can cause unexpected behavior, so this option is disabled by default. After enabling this option, the package manager automatically downgrades a package's dependency version to the maximum valid version
that satisfies the constraints.
<!-- vale write-good.Passive = YES -->

<!-- :::note -->
<!-- This configuration requires the `--enable-dependency-version-upgrades` flag. -->
<!-- Please check the -->
<!-- [configuration options][crossplane-install-config] -->
<!-- and -->
<!-- [feature flags][crossplane-install-flags] -->
<!-- are available in the -->
<!-- [Crossplane Install][crossplane-install] -->
<!-- section for more details. -->
<!-- ::: -->

<!-- vale write-good.Passive = NO -->
:::important
Enabling automatic dependency downgrades may have unintended consequences, such as:

1) CRDs missing in the downgraded version, possibly leaving orphaned MRs without
controllers to reconcile them.
2) Loss of data if downgraded CRD versions omit fields that were set before.
3) Changes in the CRD storage version, which may prevent package version update.
:::
<!-- vale write-good.Passive = YES -->

#### Ignore Crossplane version requirements

A Configuration package may require a specific or minimum Crossplane version 
before installing. By default, Crossplane doesn't install a Configuration if 
the Crossplane version doesn't meet the required version. 

Crossplane can ignore the required version with 
ignoreCrossplaneConstraints.

For example, to install a Configuration package into an unsupported Crossplane
version, configure 
ignoreCrossplaneConstraints: true.

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: platform-ref-aws
spec:
  ignoreCrossplaneConstraints: true
# Removed for brevity
```

### Verify a Configuration

Verify a Configuration with 
kubectl get configuration.

A working configuration reports `Installed` and `Healthy` as `True`.

```shell
kubectl get configuration
NAME               INSTALLED   HEALTHY   PACKAGE                                           AGE
platform-ref-aws   True        True      xpkg.upbound.io/upbound/configuration-quickstart:v0.1.0   54s
```

### Manage dependencies

Configuration packages may include dependencies on other packages including
Functions, Providers or other Configurations. 

If Crossplane can't meet the dependencies of a Configuration the Configuration
reports `HEALTHY` as `False`. 

For example, this installation of the Getting Started Configuration is
`HEALTHY: False`.

```shell
kubectl get configuration
NAME               INSTALLED   HEALTHY   PACKAGE                                           AGE
platform-ref-aws   True        False     xpkg.upbound.io/upbound/configuration-quickstart:v0.1.0   71s
```

To see more information on why the Configuration isn't `HEALTHY` use 
kubectl describe configurationrevisions.

```yaml
kubectl describe configurationrevision
Name:         platform-ref-aws-a30ad655c769
API Version:  pkg.crossplane.io/v1
Kind:         ConfigurationRevision
# Removed for brevity
Spec:
  Desired State:                  Active
  Image:                          xpkg.upbound.io/upbound/configuration-quickstart:v0.1.0
  Revision:                       1
Status:
  Conditions:
    Last Transition Time:  2023-10-06T20:08:14Z
    Reason:                UnhealthyPackageRevision
    Status:                False
    Type:                  Healthy
  Controller Ref:
    Name:
Events:
  Type     Reason       Age                From                                              Message
  ----     ------       ----               ----                                              -------
  Warning  LintPackage  29s (x2 over 29s)  packages/configurationrevision.pkg.crossplane.io  incompatible Crossplane version: package isn't compatible with Crossplane version (v1.12.0)
```

The Events show a 
Warning with a message that the
current version of Crossplane doesn't meet the Configuration package 
requirements.

## Create a Configuration

Crossplane Configuration packages are 
[OCI container images][oci] containing one or more YAML
files. 

:::important
Configuration packages are fully OCI compliant. Any tool that builds OCI images
can build Configuration packages.  

It's strongly recommended to use the Crossplane command-line tool to
provide error checking and formatting to Crossplane package builds. 

Read the 
[Crossplane package specification][crossplane-package-spec] 
for package requirements when building packages with third-party tools.
:::

A Configuration package requires a `crossplane.yaml` file and may include
Composition and CompositeResourceDefinition files. 

### The `crossplane.yaml` file

To build a Configuration package using the Crossplane CLI, create a file
named 
crossplane.yaml.  
The 
crossplane.yaml
file defines the requirements and name of the 
Configuration.

:::important
The Crossplane CLI only supports a file named `crossplane.yaml`.
:::

Configuration package uses the 
meta.pkg.crossplane.io
Crossplane API group.

Specify any other Configurations, Functions or Providers in the 
dependsOn list.  
Optionally, you can require a specific or minimum package version with the 
version option.

You can also define a specific or minimum version of Crossplane for this
Configuration with the 
crossplane.version option. 

:::note
Defining the crossplane object 
or required versions is optional.
:::

```yaml
$ cat crossplane.yaml
apiVersion: meta.pkg.crossplane.io/v1alpha1
kind: Configuration
metadata:
  name: test-configuration
spec:
  dependsOn:
    - apiVersion: pkg.crossplane.io/v1
      kind: Provider
      package: xpkg.upbound.io/upbound/provider-family-aws
      version: ">=v0.36.0"
  crossplane:
    version: ">=v1.12.1-0"
```

### Build the package

Create the package using the 
[Crossplane CLI][crossplane-cli] command 
`crossplane xpkg build --package-root=<directory>`.

Where the `<directory>` is the directory containing the `crossplane.yaml` file
and any Composition or CompositeResourceDefinition YAML files.

The CLI recursively searches for `.yml` or `.yaml` files in the directory to
include in the package.

:::important
You must ignore any other YAML files with `--ignore=<file_list>`.  
For
example, `crossplane xpkg build --package-root=test-directory --ignore=".tmp/*"`.

Including YAML files that aren't Compositions or CompositeResourceDefinitions 
isn't supported.
:::

By default, Crossplane creates a `.xpkg` file of the Configuration name and 
a SHA-256 hash of the package contents.

For example, a Configuration
named test-configuration.  
The
Crossplane CLI builds a package named `test-configuration-e8c244f6bf21.xpkg`.

```yaml
apiVersion: meta.pkg.crossplane.io/v1alpha1
kind: Configuration
metadata:
  name: test-configuration
# Removed for brevity
```

Specify the output file with `--package-file=<filename>.xpkg` option.

For example, to build a package from a directory named `test-directory` and
generate a package named `test-package.xpkg` in the current working directory,
use the command:

```shell
crossplane xpkg build --package-root=test-directory --package-file=test-package.xpkg
```

```shell
ls -1 ./
test-directory
test-package.xpkg
```

[oci]: https://opencontainers.org/
[compositions]: /manuals/uxp/concepts/composition/compositions
[composite-resource-definitions]: /manuals/uxp/concepts/composition/composite-resource-definitions
[providers]: /manuals/uxp/concepts/packages/providers
[functions]: /manuals/uxp/concepts/packages/functions
[getting-started-config]: https://github.com/upbound/configuration-quickstart
[harbor]: https://goharbor.io/
[k8s-image-pull-policy]: https://kubernetes.io/docs/concepts/containers/images/#image-pull-policy
[k8s-private-registry]: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
[crossplane-install-config]: https://docs.crossplane.io/latest/get-started/install#customize-the-crossplane-helm-chart
[crossplane-install-flags]: https://docs.crossplane.io/latest/get-started/install#feature-flags
[crossplane-install]: https://docs.crossplane.io/latest/get-started/install
[crossplane-package-spec]: https://github.com/crossplane/crossplane/blob/main/contributing/specifications/xpkg.md
[crossplane-cli]: /manuals/cli/overview
