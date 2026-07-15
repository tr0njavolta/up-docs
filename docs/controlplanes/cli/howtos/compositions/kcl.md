---
title: Create a composition with KCL
sidebar_position: 3
description: Use KCL to create resources with your control plane.
aliases:
    - /core-concepts/authoring-compositions
---

Upbound Crossplane allows you to choose how you want to write your composition
logic based on your preferred language.

You can choose:

[Go][go] - High performance. IDE support with full type safety.

[Go Templates][go-templates] - Good for YAML-like configurations. IDE support with YAML
language server.

**KCL (this guide)** - Concise. Good for transitioning from another configuration language
like `HCL`. IDE support with language server.

[Python][python] - Highly accessible, supports complex logic. Provides type hints and
autocompletion in your IDE.

<!-- vale gitlab.HeadingContent = NO -->
## Overview
<!-- vale gitlab.HeadingContent = YES -->

<!-- vale write-good.TooWordy = NO -->
This guide explains how to create compositions that turn your XRs into actual
cloud resources. Compositions allow you to implement the business logic that
powers your control plane.
<!-- vale write-good.TooWordy = YES -->

Use this guide after you define your API schema and need to write the logic that
creates and manages the underlying resources.

## Prerequisites

Before you begin, make sure:

<!-- vale write-good.Passive = NO -->
* You designed your XRD
* You've added provider dependencies
* You understand your XRD schema and what resources you need to create
* [KCL][kcl] is installed
* [KCL Language Server][kcl-language-server] is installed  
* [KCL Visual Studio Code Extension][kcl-visual-studio-code-extension] is installed
<!-- vale write-good.Passive = YES -->

## Create your composition scaffold

Use the XRD you created in the previous step to generate a new composition:

```shell
up composition generate apis/<your_resource_name>/definition.yaml
```

This command creates `apis/<your_resource_name>/composition.yaml` which
references the XRD.

## Generate your function

Use your chosen programming language to generate a new function:

```shell
up function generate --language=kcl compose-resources
apis/<your_resource_name>/composition.yaml
```

This command creates a `functions/compose-resources` directory with your
function code and updates your composition file to reference it.

Below is an example of a function file in `functions/compose-resources/main.k`:

<!-- vale Microsoft.HeadingAcronyms = NO -->
## Create a basic KCL function
<!-- vale Microsoft.HeadingAcronyms = YES -->

The example below is a pre-generated function that detects if a composed
resource is ready in your infrastructure.

1. **Import the required models** for the resources you want to create.
   
   ```yaml
   import models.v1beta1 as v1beta1
   ```

2. **Define helper functions** for metadata.
   
   ```yaml
   _metadata = lambda name: str -> any {
       { annotations = { "krm.kcl.dev/composition-resource-name" = name }}
   }
   ```

3. **Access the composite resource input**.
   
   ```yaml
   # This is the observed composite resource, provided as an input to the function
   oxr = option("params").oxr
   ```

4. **Define your managed resources**.
   
   ```yaml
   _items = [
       v1beta1.Instance {
         metadata: _metadata("vm-instance")
         spec.forProvider = {
             associatePublicIpAddress: True
             instanceType: "t3.micro"
             availabilityZone: oxr.spec.parameters.location
             cpuCoreCount: 10
         }
       }
   ]
   ```

5. **Set the output variable**.
   
   ```yaml
   # This function composes an EC2 instance.
   items = _items
   ```

## Define and use variables

Variables can simplify your composition function and reduce repetition in your
code. You can define complex expressions as a variable and reference that
variable throughout your function.

1. **Define immutable variables** using the `=` operator.
   
   ```yaml
   # This is an immutable variable
   myvar = "value"
   ```

2. **Define mutable variables** with an underscore prefix.
   
   ```yaml
   # This is a mutable variable
   _myothervar = "value2"
   ```

3. **Define managed resources as variables**.
   
   ```yaml
   myresource = v1beta1.Instance {
       spec.forProvider = {
           region: "us-west-1"
       }
   }
   ```

4. **Use variables from maps**.
   
   ```yaml
   instance_type_map = {
       "tiny": "t2.micro",
       "jumbo": "t2.small",
   }
   instance_type = "tiny"
   if oxr.spec?.parameters?.instanceType in instance_type_map:
       instance_type = instance_type_map[oxr.spec.parameters.instanceType]
   ```

### Special variables

The `items` and the `options` variables are important required variables in your
KCL embedded function.

- **`items`** - KCL functions require the special items variable to capture the desired state of your resources and pass those changes to your control plane to create or change.
- **`options`** - The special options variables provides context specific information to use in your function.

## Work with inputs and outputs

Functions require inputs and outputs to process requests and return values to
your control plane.

### Inputs

Compositions execute in a pipeline of one or more sequential functions. Each
composition pipeline provides this information as inputs into the function:

1. The observed state of the composite resource, and any composed resources.
2. The desired state of the composite resource, and any composed resources.
3. The function's input.
4. The function pipeline's context.

```yaml
import models.v1beta1 as v1beta1

_metadata = lambda name: str -> any {
    { annotations = { "krm.kcl.dev/composition-resource-name" = name }}
}

# These are the inputs provided to the function
oxr = option("params").oxr
ocds = option("params").ocds
dxr = option("params").dxr
dcds = option("params").dcds

items = []
```

### Outputs

Your function must provide the list of resource updates at the end of execution.
KCL uses a required `items` variable where you list your composed or modified
composite resources.

```yaml
_items = [
    v1beta1.Instance {
        metadata: _metadata("virtual-machine")
        spec.forProvider = {
            associatePublicIpAddress: True
            ipv6Addresses: ["192.168.1.1"]
            availabilityZone: oxr.spec.parameters.location
            cpuCoreCount: 10
        }
    }
]

# This function composes an EC2 instance.
items = _items
```

The `items` variable should contain only valid composed resource objects,
otherwise the function fails and emits an error like:

```bash
cannot compose resources: cannot generate a name for composed resource "": Object 'Kind' is missing in 'unstructured object has no kind'
```

## Use conditionals

The `if` expression allows you to optionally compose resources based on
conditions you set. An `if` expression includes a condition that resolves to
`True` or `False`. When the `if` condition resolves to true, the function
composes the resource. When false, the resource isn't created.

1. **Define condition for composing resources**.
   
   ```yaml
   import models.v1beta1 as v1beta1
   
   oxr = option("params").oxr
   
   awsVpc = v1beta1.VPC {
       spec.forProvider = {
           cidrBlock: var.cidr if oxr.spec.parameters.useIpamPool else ""
           ipv6CidrBlock: "10.1.0.0/16"
           region: "eu-west-1"
           enableDnsHostnames: True
           enableDnsSupport: True
       }
   } if oxr.spec.parameters.deployVPC else {}
   
   items = [awsVpc]
   ```

   When `deployVPC` is true, your control plane continues the function to create
   the VPC. When false, the function skips the VPC creation.

## Use loops to create multiple resources

Use the `for` syntax and `lambda` support to iterate over items in a collection.
Loops can dynamically define multiple copies of a resource and avoid repeating
syntax in your function.

To create multiple resources with a `for` loop, each resource instance must have
a unique `composition-resource-name` value. You can use the index value or
unique values in arrays or collections to assign unique names. KCL sets it equal
to `.metadata.name` by default unless you override it with the
`krm.kcl.dev/composition-resource-name` annotation.

### Loop syntax

KCL supports comprehensions, which lets users construct a list or dictionary
value by looping over one or more items and evaluating an expression.

1. **Use basic comprehension syntax**.
   
   ```yaml
   myVar = [x * x for x in range(5)] # returns an array containing [0, 1, 4, 9, 16]
   ```

2. **Create multiple resources using comprehensions**.
   
   ```yaml
   import models.v1beta1 as v1beta1
   
   nodeGroupRolePolicies = [
       "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
       "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
       "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy",
       "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
   ]
   
   nodeGroupRolePolicyAttachments = [{
       v1beta1.RolePolicyAttachment {
           metadata.name = xrName + "-nodegroup-rpa-{}".format(i)
           spec.providerConfigRef.name = providerConfigName
           spec.deletionPolicy = deletionPolicy
           spec.forProvider = {
               policyArn = p
               roleSelector = {
                   matchControllerRef = True
                   matchLabels = {
                       "role" = "nodegroup"
                   }
               }
           }
       }
   } for i, p in nodeGroupRolePolicies]
   
   items = [nodeGroupRolePolicyAttachments]
   ```

### Procedural for loop

KCL doesn't support procedural for loops natively, but it's possible to create a
procedural loop using a lambda function:

1. **Use lambda functions for procedural loops**.
   
   ```yaml
   result = [(lambda x: int -> int {
       # Write procedural for loop logic in the lambda function.
       z = x + 2
       x * 2
   })(x, y) for x in [1, 2]]  # [2, 4]
   ```

2. **Create multiple managed resources using lambda functions**.
   
   ```yaml
   import models.v1beta1 as v1beta1
   
   awsRouteTableAssociationsPublic = [(lambda i: int, -> v1beta1.RouteTableAssociation {
       v1beta1.RouteTableAssociation {
           spec.forProvider = {
               subnetIdSelector.matchControllerRef: True
               routeTableId: _ocds["${xrName}-${i}"]
           }
       }
   })(i) for i in range(oxr.spec.parameters.numberOfSubnets)]
   
   items = [awsRouteTableAssociationsPublic]
   ```

## Read function pipeline state

Compositions execute each function sequentially in the pipeline. Each function
has two main tasks:

1. Update the state of resources as they change
2. Send the updated state data back to Crossplane.

Each function receives four key data points:

1. Current state: The real-world status of the composite resource and related resources
2. Target state: The desired status of resources as defined in your configuration
3. Function input: The specific configuration settings for this function
4. Pipeline context: Shared information passed through the function pipeline

### Access function pipeline state

When using KCL embedded functions, these pieces of information are accessible using the built-in `option()` function in KCL:

- Read the **ObservedCompositeResource** from `option("params").oxr`
- Read the **ObservedComposedResources** from `option("params").ocds`
- Read the **DesiredCompositeResource** from `option("params").dxr`
- Read the **DesiredComposedResources** from `option("params").dcds`
- Read the **function pipeline's context** from `option("params").ctx`

## Extract data from resources

You can extract data from composite resources and composed resources in your KCL
functions.

### Extract data from the composite resource

To extract data from the Composite Resource (XR) associated with the composition
function pipeline, you can use the `option("params").oxr` variable.

1. **Extract data from the composite resource spec**.
   
   ```yaml
   import models.v1beta1 as v1beta1
   
   _metadata = lambda name: str -> any {
       { annotations = { "krm.kcl.dev/composition-resource-name" = name }}
   }
   
   myBucket = v1beta1.Bucket {
       metadata: _metadata("my-bucket")
       spec.forProvider.region = option("params").oxr.spec.region
   }
   ```

   This demonstrates extracting data from the `.spec` of an XR to set the value
   of composed resource.

### Extract data from a specific composed resource

To extract data from a specific composed resource by using the resource name,
you can use the `option("params").ocds` variable. This variable works like a
dictionary/map type where you provide the resource name as a key to access the
corresponding configuration data.

1. **Access composed resource data by name**.
   
   ```yaml
   metadata.name = "ocds"
   spec.ocds = option("params").ocds
   spec.user_kind = option("params").ocds["test-user"]?.Resource.Kind
   spec.user_metadata = option("params").ocds["test-user"]?.Resource.metadata
   spec.user_status = option("params").ocds["test-user"]?.Resource.status
   ```

## Write status to composite resources

Functions can write status information back to the composite resource to provide details about the pipeline progression.

To write status to the Composite Resource, capture the desired composite resource, update its status, and return it as an item:

```yaml
import models.v1beta1 as v1beta1

# Read the desired state for the XR from the pipeline
_dxr = option("params").dxr

# Construct your managed resources
bucket = v1beta1.Bucket {
    metadata: _metadata("my-bucket")
    spec.forProvider.region = option("params").oxr.spec.region
}

# Update the dxr status immutably
_dxr = {
    **_dxr
    status: {
        bucketName: bucket.metadata.name
        region: bucket.spec.forProvider.region
    }
}

# Return both the managed resource and updated XR status
items = [bucket, _dxr]
```

Make sure you've defined the status fields you write to in your function in the XRD corresponding to the composition.

## Working with resource schemas

KCL functions support type-safe resource schemas that provide IDE support
including autocomplete, linting, and context hints.

<!-- vale Microsoft.HeadingAcronyms = NO -->
### Enable IDE support
<!-- vale Microsoft.HeadingAcronyms = YES -->

To take full advantage of the KCL IDE experience with resource schemas, you need
to declare the resource type:

```yaml
import models.v1beta1 as v1beta1

_items = [
    v1beta1.Instance {  # Declaring the type enables IDE features
        spec.forProvider = {
            associatePublicIpAddress: True
            availabilityZone: oxr.spec.parameters.location
            cpuCoreCount: 10
        }
    }
]
```

When your cursor is inside the stanza of the `v1beta1.Instance`, your IDE
provides code completion, context hints, and more tailored to that resource
type.

### Schema dependencies

The `up dep add` command unpacks dependencies that contain resource schemas in
the `.up/kcl` folder at your project root directory.

When you generate a function for your project with `up function generate` from a
composition, the command automatically imports the schemas into your KCL
function file:

```yaml
import models.v1beta1 as v1beta1
import models.v1beta2 as v1beta2
import models.k8s.apimachinery.pkg.apis.meta.v1 as metav1
```

The `import` stanza in your function allows you to manually import schemas. The
KCL Visual Studio Code extension can also parse the imported schemas for the
same benefits.

### Supported packages

All Upbound Official Providers use KCL-compatible resource schemas.

When you build your project with `up project build`, the generated artifact
contains the generated resource schemas for your XRDs. You can build a project
and then import that project as a dependency for the resources you define.

## See also

* [KCL Language Documentation][kcl-reference-docs] - Complete KCL language reference
* [KCL Comprehensions Documentation][comprehensions] - Detailed loop syntax reference
* [function-kcl][function-kcl] - The underlying Crossplane function that enables KCL

[go]: /manuals/cli/howtos/compositions/go
[go-templates]: /manuals/cli/howtos/compositions/go-template
[python]: /manuals/cli/howtos/compositions/python
[kcl]: https://www.kcl-lang.io/
[kcl-language-server]: https://www.kcl-lang.io/docs/user_docs/getting-started/install#install-language-server
[kcl-visual-studio-code-extension]: https://www.kcl-lang.io/docs/user_docs/getting-started/install#install-kcl-extensions-for-ide
[kcl-reference-docs]: https://www.kcl-lang.io/docs/reference/lang/tour
[comprehensions]: https://www.kcl-lang.io/docs/reference/lang/spec/expressions#list-expressions
[function-kcl]: https://github.com/crossplane-contrib/function-kcl
