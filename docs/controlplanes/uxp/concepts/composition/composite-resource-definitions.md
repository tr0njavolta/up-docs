---
title: Composite Resource Definitions
sidebar_position: 4
description: Composite Resource Definitions or XRDs define custom API schemas
---

Composite resource definitions (`XRDs`) define the schema for a custom API.  
Users create composite resources (`XRs`) using the API schema defined by an
XRD.

:::note
Read the [composite resources][xrs] page for more
information about composite resources.
:::

<details>
<summary>What are XRs, XRDs and Compositions?</summary>

A [composite resource][xrs] or XR is a custom API.

You use two Crossplane types to create a new custom API:

* A Composite Resource Definition (XRD) - This page. Defines the XR's schema. 
* A [Composition][composition] - Configures how the XR creates
  other resources.

</details>

Crossplane XRDs are like 
[Kubernetes custom resource definitions][k8s]. 
XRDs require fewer fields and add options related to Crossplane, like connection
secrets. 


## Creating a CompositeResourceDefinition

Creating a CompositeResourceDefinition consists of:
* [Defining a custom API group](#xrd-groups).
* [Defining a custom API name](#xrd-names).
* [Defining a custom API schema and version](#xrd-versions).
  
Optionally, CompositeResourceDefinitions also support:
* [Setting composite resource defaults](#set-composite-resource-defaults).
 
Composite resource definitions (`XRDs`) create new API endpoints inside a
Kubernetes cluster. 

Creating a new API requires defining an API 
group,
name and
version. 

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata: 
  name: mydatabases.example.org
spec:
  group: example.org
  names:
    kind: XMyDatabase
    plural: mydatabases
  versions:
  - name: v1alpha1
  # Removed for brevity
```

After applying an XRD, Crossplane creates a new Kubernetes custom resource
definition matching the defined API.

For example, the XRD 
`mydatabases.example.org` 
creates a custom resource definition 
`mydatabases.example.org`.  

```shell
kubectl api-resources
NAME                              SHORTNAMES   APIVERSION          NAMESPACED   KIND
mydatabases.example.org                        v1alpha1            true         mydatabases
# Removed for brevity
```

:::warning
You can't change the XRD
`group` or
`names`.  
You must delete and
recreate the XRD to change the 
`group` or
`names`.
:::

### XRD groups

Groups define a collection of related API endpoints. The `group` can be any
value, but common convention is to map to a fully qualified domain name.

Multiple XRDs may use the same `group` to create a logical collection of APIs.  
For example a `database` group may have a `relational` and `nosql` kinds. 

### XRD names

The `names` field defines how to refer to this specific XRD.  
The required name fields are: 

* `kind` - the `kind` value to use when calling this API. The kind is
  [UpperCamelCased](https://kubernetes.io/docs/contribute/style/style-guide/#use-upper-camel-case-for-api-objects).
  Crossplane recommends starting XRD `kinds` with an `X` to show 
  it's a custom Crossplane API definition. 
* `plural` - the plural name used for the API URL. The plural name must be
  lowercase. 

:::tip
The XRD 
`metadata.name` must be 
`plural` name, `.` (dot character),
`group`.

For example, `mydatabases.example.org` matches the `plural` name
`mydatabases`, `.` 
`group` name, 
`example.org`.

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata: 
  name: mydatabases.example.org
spec:
  group: example.org
  names:
    kind: XMyDatabase
    plural: mydatabases
    # Removed for brevity
```
:::

### XRD versions

The XRD `version` is like the 
[API versioning used by Kubernetes](https://kubernetes.io/docs/reference/using-api/#api-versioning).
The version shows how mature or stable the API is and increments when changing,
adding or removing fields in the API.

Crossplane doesn't require specific versions or a specific version naming 
convention, but following 
[Kubernetes API versioning guidelines](https://kubernetes.io/docs/reference/using-api/#api-versioning)
is strongly recommended. 

* `v1alpha1` - A new API that may change at any time.
* `v1beta1` - An existing API that's considered stable. Breaking changes are
  strongly discouraged.
* `v1` - A stable API that doesn't have breaking changes. 

#### Define a schema

<!-- vale write-good.Passive = NO -->
The `schema` defines the names
of the parameters, the data types of the parameters and which parameters are
required or optional.
<!-- vale write-good.Passive = YES --> 

:::note
All `schemas` follow the Kubernetes custom resource definition 
[OpenAPIv3 structural schema](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#specifying-a-structural-schema). 
:::

Each 
`version` of the API has a unique 
`schema`. 

All XRD `schemas` validate against
the `openAPIV3Schema`. The schema
is an OpenAPI 
`object` with the 
`properties` of a 
`spec`
`object`.

Inside the `spec.properties` is the custom
API definition.

In this example, the key `region`
is a `string`.

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xdatabases.custom-api.example.org
spec:
  group: custom-api.example.org
  names:
    kind: xDatabase
    plural: xdatabases
  versions:
  - name: v1alpha1
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              region:
                type: string
    # Removed for brevity
```

A composite resource using this API references the 
`group/version` and 
`kind`. The 
`spec` has the 
`region` key with a string value. 

```yaml
apiVersion: custom-api.example.org/v1alpha1
kind: xDatabase
metadata:
  name: my-composite-resource
spec: 
  region: "US"
```

:::tip
The custom API defined inside the 
`spec.properties` is an OpenAPIv3
specification. The 
[data models page](https://swagger.io/docs/specification/data-models/) of 
the Swagger documentation provides a list of examples using data types and input
restrictions. 

The Kubernetes documentation lists 
[the set of special restrictions](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#validation)
on what your OpenAPIv3 custom API can use.
:::

:::tip
Changing or expanding the XRD schema requires restarting the [Crossplane pod][pods] to take effect.
:::

##### Required fields

By default all fields in a schema are optional. Define a parameter as required
with the 
`required` attribute. 

In this example the XRD requires 
`region` and 
`size` but
`name` is optional. 
```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xdatabases.custom-api.example.org
spec:
  group: custom-api.example.org
  names:
    kind: xDatabase
    plural: xdatabases
  versions:
  - name: v1alpha1
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              region:
                type: string 
              size:
                type: string  
              name:
                type: string  
            required: 
              - region 
              - size
    # Removed for brevity
```

According to the OpenAPIv3 specification, the `required` field is per-object. If
a schema contains multiple objects the schema may need multiple `required`
fields.

This XRD defines two objects:
 1. the top-level `spec` object
 2. a second `location` object

The `spec` object 
`requires` the 
`size` and 
`location` but 
`name` is optional.

Inside the required `location` 
object,
`country` is 
`required` and
`zone` is optional.

```yaml
# Removed for brevity
- name: v1alpha1
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              size:
                type: string  
              name:
                type: string 
              location:
                type: object
                properties:
                  country: 
                    type: string 
                  zone:
                    type: string
                required:
                  - country
            required:  
              - size
              - location
```

The Swagger "[Describing Parameters](https://swagger.io/docs/specification/describing-parameters/)"
documentation has more examples. 

##### Crossplane reserved fields

Crossplane doesn't allow the following fields in a schema:
* Any field under the object `spec.crossplane`
* Any field under the object `status.crossplane`
* `status.conditions`

Crossplane ignores any fields matching the reserved fields.

#### Serve and reference a schema

To use a schema it must be
`served: true`
and 
`referenceable: true`.

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xdatabases.custom-api.example.org
spec:
  group: custom-api.example.org
  names:
    kind: xDatabase
    plural: xdatabases
  versions:
  - name: v1alpha1
    served: true
    referenceable: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              region:
                type: string            
```

Composite resources can use any schema version set as 
`served: true`.  
Kubernetes rejects any composite resource using a schema version set as `served:
false`.

:::tip
Setting a schema version as `served:false` causes errors for users using an older
schema. This can be an effective way to identify and upgrade users before
deleting the older schema version. 
:::

The `referenceable: true`
field indicates which version of the schema Compositions use. Only one
version can be `referenceable`. 

:::note
Changing which version is `referenceable:true` requires [updating the `compositeTypeRef.apiVersion`][composition-match] 
of any Compositions referencing that XRD.
:::

#### Multiple schema versions

:::warning
Crossplane supports defining multiple `versions`, but the schema of each version
can't change any existing fields, also called "making a breaking change."

Breaking schema changes between versions requires the use of [conversion webhooks](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/#webhook-conversion).

New versions may define new optional parameters, but new required fields are
a "breaking change."

Crossplane XRDs use Kubernetes custom resource definitions for versioning. 
Read the Kubernetes documentation on 
[versions in CustomResourceDefinitions](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/)
for more background on versions and breaking changes. 

Crossplane recommends implementing breaking schema changes as brand new XRDs.
:::

For XRDs, to create a new version of an API add a new 
`name` in the
`versions`
list. 

For example, this XRD version 
`v1alpha1` only has the field 
`region`.

A second version, 
`v1` expands the API to have both 
`region` and 
`size`.

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xdatabases.custom-api.example.org
spec:
  group: custom-api.example.org
  names:
    kind: xDatabase
    plural: xdatabases
  versions:
  - name: v1alpha1
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              region:
                type: string  
  - name: v1
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              region:
                type: string 
              size:
                type: string            
```

:::tip
Changing or expanding the XRD schema requires restarting the [Crossplane pod][pods] to take effect.
:::

### Set composite resource defaults
XRDs can set default parameters for composite resources.

#### defaultCompositionRef
It's possible for multiple [Compositions][composition] to
reference the same XRD. If more than one Composition references the same XRD,
the composite resource must select which Composition to use. 

An XRD can define the default Composition to use with the
`defaultCompositionRef` value. 

Set a
`defaultCompositionRef` 
to set the default Composition.

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xdatabases.custom-api.example.org
spec:
  defaultCompositionRef: 
    name: myComposition
  group: custom-api.example.org
  names:
  # Removed for brevity
  versions:
  # Removed for brevity
```

#### defaultCompositionUpdatePolicy

Changes to a Composition generate a new Composition revision. By default all
composite resources use the updated Composition revision. 

Set the XRD `defaultCompositionUpdatePolicy` to `Manual` to prevent composite
resources from automatically using the new revision. 

The default value is `defaultCompositionUpdatePolicy: Automatic`.

Set `defaultCompositionUpdatePolicy: Manual`
to set the default Composition update policy for composite resources and using
this XRD.

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xdatabases.custom-api.example.org
spec:
  defaultCompositionUpdatePolicy: Manual
  group: custom-api.example.org
  names:
  # Removed for brevity
  versions:
  # Removed for brevity
```

#### enforcedCompositionRef
To require all composite resources to use a specific Composition use the
`enforcedCompositionRef` setting in the XRD.

For example, to require all composite resources using this XRD to use the
Composition 
`myComposition` 
set 
`enforcedCompositionRef.name: myComposition`.

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xdatabases.custom-api.example.org
spec:
  enforcedCompositionRef: 
    name: myComposition
  group: custom-api.example.org
  names:
  # Removed for brevity
  versions:
  # Removed for brevity
```

## Verify a CompositeResourceDefinition

Verify an XRD with `kubectl get compositeresourcedefinition` or the short form, 
`kubectl get xrd`.

```yaml
kubectl get xrd                                
NAME                                ESTABLISHED   OFFERED   AGE
xdatabases.custom-api.example.org   True          True      22m
```

The `ESTABLISHED` field indicates Crossplane installed the Kubernetes custom
resource definition for this XRD.

### XRD conditions
Crossplane uses a standard set of `Conditions` for XRDs.  
View the conditions of a XRD under their `Status` with 
`kubectl describe xrd`. 

```yaml
kubectl describe xrd
Name:         xpostgresqlinstances.database.starter.org
API Version:  apiextensions.crossplane.io/v1
Kind:         CompositeResourceDefinition
# Removed for brevity
Status:
  Conditions:
    Reason:                WatchingCompositeResource
    Status:                True
    Type:                  Established
# Removed for brevity
```

#### WatchingCompositeResource
`Reason: WatchingCompositeResource` indicates Crossplane defined the new
Kubernetes custom resource definitions related to the composite resource and is 
watching for the creation of new composite resources. 

```yaml
Type: Established
Status: True
Reason: WatchingCompositeResource
```

#### TerminatingCompositeResource
`Reason: TerminatingCompositeResource` indicates Crossplane is deleting the
custom resource definitions related to the composite resource and is 
terminating the composite resource controller.

```yaml
Type: Established
Status: False
Reason: TerminatingCompositeResource
```

[xrs]: /manuals/uxp/concepts/composition/composite-resources/
[composition]: /manuals/uxp/concepts/composition/compositions/
[composition-match]: /manuals/uxp/concepts/composition/compositions/#match-composite-resources
[pods]: https://docs.crossplane.io/v2.0/guides/pods/#crossplane-pod 
[k8s]: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/ 

