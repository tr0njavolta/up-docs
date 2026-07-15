---
title: 3. Test your composition
description: Create a composition function test
---

import GlobalLanguageSelector, { CodeBlock } from '@site/src/components/GlobalLanguageSelector';

<GlobalLanguageSelector />

In the previous guide, you used an embedded function to create composition logic
for your cloud resources. This guide walks through how to create a test plan.
Tests allow you to:

* Validate your composition configuration without impacting actual resources in your control planes. 
* Catch errors earlier in your workflow
* Verify resource creation
* Validate input parameters

## Prerequisites

Make sure you've completed the previous guide and have:

* [An Upbound account][up-account]
* [The Up CLI installed][up-cli]
* [kubectl installed][kubectl-installed]
* [Docker Desktop][docker-desktop] running
* A project with the basic structure (`upbound.yaml`, `apis/`, `examples/`)
* Provider dependencies added 
* An XRD generated from your example `XR`
* An embedded function that defines your composition logic

If you missed any of the previous steps, go to the [project
foundations][project-foundations] guide to get started.

## Generate a composition function test 

Create the test scaffolding:

```shell
up test generate storagebucket
```

This command:

* Creates a test directory in `tests/test-storagebucket`
* Generates the basic structure for writing tests

:::note
The default testing language is KCL. You can also specify `--language=python` or
`--language=go` to generate tests in Python or Go.
:::

## Set up your test imports

Open `tests/test-storagebucket/main.k` and replace the scaffolding with the
following configuration:


<CodeBlock cloud="aws">

```yaml title="tests/test-storagebucket/main.k"
import models.com.example.platform.v1alpha1 as platformv1alpha1
import models.io.upbound.awsm.s3.v1beta1 as awsms3v1beta1
import models.io.upbound.dev.meta.v1alpha1 as metav1alpha1

# It's a best practice for composition functions to return only fields whose
# values they care about, since they become the owner of any field they
# return. Allow for fields with defaults to be omitted by the composition
# function by clearing them in our expected resources.
_stripDefaults = lambda obj: any -> any {
    obj | {
        spec.managementPolicies = Undefined
    }
}

_items = [
    metav1alpha1.CompositionTest{
        metadata.name="test-storagebucket"
        spec = {
            assertResources: [
                platformv1alpha1.StorageBucket{
                    metadata.name: "example"
                    spec.parameters: {
                        acl: "public-read"
                        region: "us-west-1"
                        versioning: True
                    }
                }
                _stripDefaults(awsms3v1beta1.Bucket{
                    metadata.generateName = "example-bucket"
                    spec.forProvider: {
                        region: "us-west-1"
                    }
                })
                _stripDefaults(awsms3v1beta1.BucketOwnershipControls{
                    metadata.generateName = "example-boc"
                    spec.forProvider: {
                        region: "us-west-1"
                        rule: {
                            objectOwnership: "BucketOwnerPreferred"
                        }
                    }
                })
                _stripDefaults(awsms3v1beta1.BucketPublicAccessBlock{
                    metadata.generateName = "example-pab"
                    spec.forProvider: {
                        blockPublicAcls: False
                        blockPublicPolicy: False
                        ignorePublicAcls: False
                        region: "us-west-1"
                        restrictPublicBuckets: False
                    }
                })
                _stripDefaults(awsms3v1beta1.BucketACL{
                    metadata.generateName = "example-acl"
                    spec.forProvider:{
                        acl: "public-read"
                        region: "us-west-1"
                    }
                })
                _stripDefaults(awsms3v1beta1.BucketServerSideEncryptionConfiguration{
                    metadata.generateName = "example-encryption"
                    spec.forProvider: {
                        region: "us-west-1"
                        rule: [
                            {
                                applyServerSideEncryptionByDefault: {
                                    sseAlgorithm: "AES256"
                                }
                                bucketKeyEnabled: True
                            }
                        ]
                    }
                })
                _stripDefaults(awsms3v1beta1.BucketVersioning{
                    metadata.generateName = "example-versioning"
                    spec.forProvider: {
                        region: "us-west-1"
                        versioningConfiguration: {
                            status: "Enabled"
                        }
                    }
                })
            ]
            compositionPath: "apis/storagebuckets/composition.yaml"
            xrPath: "examples/storagebucket/example.yaml"
            xrdPath: "apis/storagebuckets/definition.yaml"
            timeoutSeconds: 120
            validate: False
        }
    }
]
items = _items

```
</CodeBlock>

<CodeBlock cloud="azure">

```yaml title="tests/test-storagebucket/main.k"
import models.com.example.platform.v1alpha1 as platformv1alpha1
import models.io.upbound.azurem.storage.v1beta1 as azuremstoragev1beta1
import models.io.upbound.azurem.v1beta1 as azuremv1beta1
import models.io.upbound.dev.meta.v1alpha1 as metav1alpha1

# It's a best practice for composition functions to return only fields whose
# values they care about, since they become the owner of any field they
# return. Allow for fields with defaults to be omitted by the composition
# function by clearing them in our expected resources.
_stripDefaults = lambda obj: any -> any {
    obj | {
        spec.managementPolicies = Undefined
    }
}

_items = [
    metav1alpha1.CompositionTest{
        metadata.name="test-storagebucket"
        spec= {
            assertResources: [
                platformv1alpha1.StorageBucket {
                    metadata.name: "example"
                    spec.parameters: {
                        location: "eastus"
                        versioning: True
                        acl: "public"
                    }
                }
                _stripDefaults(azuremv1beta1.ResourceGroup {
                    metadata.name = "example-group"
                    spec.forProvider = {
                        location = "eastus"
                    }
                })
                _stripDefaults(azuremstoragev1beta1.Account {
                    metadata.name = "exampleaccount"
                    spec.forProvider = {
                        accountTier = "Standard"
                        accountReplicationType = "LRS"
                        location = "eastus"
                        blobProperties = {
                            versioningEnabled = True
                        }
                        infrastructureEncryptionEnabled = True
                        resourceGroupNameSelector = {
                            matchControllerRef = True
                        }
                    }
                })
                _stripDefaults(azuremstoragev1beta1.Container {
                    metadata.name = "example-container"
                    spec.forProvider = {
                        containerAccessType = "blob"
                        storageAccountNameSelector = {
                            matchControllerRef = True
                        }
                    }
                })
            ]
            compositionPath: "apis/storagebuckets/composition.yaml"
            xrPath: "examples/storagebucket/example.yaml"
            xrdPath: "apis/storagebuckets/definition.yaml"
            timeoutSeconds: 120
            validate: False
        }
    }
]
items= _items
```
</CodeBlock>

<CodeBlock cloud="gcp" language="kcl">

```yaml title="tests/test-storagebucket/main.k"

import models.com.example.platform.v1alpha1 as platformv1alpha1
import models.io.upbound.dev.meta.v1alpha1 as metav1alpha1
import models.io.upbound.gcpm.storage.v1beta1 as gcpmstoragev1beta1

# It's a best practice for composition functions to return only fields whose
# values they care about, since they become the owner of any field they
# return. Allow for fields with defaults to be omitted by the composition
# function by clearing them in our expected resources.
_stripDefaults = lambda obj: any -> any {
    obj | {
        spec.managementPolicies = Undefined
    }
}

_items = [
    metav1alpha1.CompositionTest{
        metadata.name: "example"
        spec= {
            assertResources: [
                platformv1alpha1.StorageBucket{
                    metadata.name = "example"
                    spec.parameters = {
                        acl: "publicRead"
                        location: "US"
                        versioning: True
                    }
                }
                _stripDefaults(gcpmstoragev1beta1.Bucket {
                    metadata.name = "example-bucket"
                    spec.forProvider = {
                        location: "US"
                        versioning = {
                            enabled = True
                        }
                    }
                })
                _stripDefaults(gcpmstoragev1beta1.BucketACL {
                    metadata.name = "example-acl"
                    spec.forProvider = {
                        predefinedAcl = "publicRead"
                        bucketSelector = {
                            matchControllerRef = True
                        }
                    }
                })
            ]
            compositionPath: "apis/storagebuckets/composition.yaml"
            xrPath: "examples/storagebucket/example.yaml"
            xrdPath: "apis/storagebuckets/definition.yaml"
            timeoutSeconds: 120
            validate: False
        }
    }
]
items= _items
```
</CodeBlock>

<CodeBlock cloud="gcp">

```yaml title="tests/test-storagebucket/main.k"
import models.com.example.platform.v1alpha1 as platformv1alpha1
import models.io.upbound.dev.meta.v1alpha1 as metav1alpha1
import models.io.upbound.gcpm.storage.v1beta1 as gcpmstoragev1beta1
import models.k8s.apimachinery.pkg.apis.meta.v1 as metav1


_items = [
    metav1alpha1.CompositionTest{
        metadata.name: "test-storagebucket"
        spec = {
            assertResources: [
                platformv1alpha1.StorageBucket {
                    metadata.name: "example"
                    spec.parameters: {
                        location: "US"
                        versioning: True
                        acl: "publicRead"
                    }
                }
                gcpmstoragev1beta1.Bucket {
                    metadata.name = "example-bucket"
                    spec.forProvider = {
                        location = "US"
                        versioning = {
                            enabled = True
                        }
                    }
                }
                gcpmstoragev1beta1.BucketACL {
                    metadata.name = "example-acl"
                    spec.forProvider = {
                        bucketRef = {
                            name = "example-bucket"
                        }
                        predefinedAcl = "publicRead"
                    }
                }

            ]
            compositionPath: "apis/storagebuckets/composition.yaml"
            xrPath: "examples/storagebucket/example.yaml"
            xrdPath: "apis/storagebuckets/definition.yaml"
            timeoutSeconds: 120
            validate: False
        }
    }
]
items= _items
```
</CodeBlock>


## Review your test

### Import the testing models

<CodeBlock cloud="aws">

```yaml-noCopy title="tests/test-storagebucket/main.k"
import models.com.example.platform.v1alpha1 as platformv1alpha1
import models.io.upbound.awsm.s3.v1beta1 as awsms3v1beta1
import models.io.upbound.dev.meta.v1alpha1 as metav1alpha1
```

This section imports:

* Your custom StorageBucket XRD
* AWS S3 resource schemas for validation
* Upbound testing framework components

</CodeBlock>

<CodeBlock cloud="azure">

```yaml-noCopy title="tests/test-storagebucket/main.k"
import models.com.example.platform.v1alpha1 as platformv1alpha1
import models.io.upbound.azurem.storage.v1beta1 as azuremstoragev1beta1
import models.io.upbound.azurem.v1beta1 as azuremv1beta1
import models.io.upbound.dev.meta.v1alpha1 as metav1alpha1
```

This section imports:

* Your custom StorageBucket XRD
* Azure Storage and Azure Resource Group schemas for validation
* Upbound testing framework components

</CodeBlock>

<CodeBlock cloud="gcp">

```yaml-noCopy title="tests/test-storagebucket/main.k"
import models.com.example.platform.v1alpha1 as platformv1alpha1
import models.io.upbound.dev.meta.v1alpha1 as metav1alpha1
import models.io.upbound.gcpm.storage.v1beta1 as gcpmstoragev1beta1
```

This section imports:

* Your custom StorageBucket XRD
* GCP Storage schemas for validation
* Upbound testing framework components

</CodeBlock>

### Define your test case

Create the main test structure:

```yaml-noCopy title="tests/test-storagebucket/main.k"
_items = [
    metav1alpha1.CompositionTest{
        metadata.name="test-storagebucket"
        spec= {
            assertResources: [
                # Test assertions will go here
            ]
            compositionPath: "apis/storagebuckets/composition.yaml"
            xrPath: "examples/storagebucket/example.yaml"
            xrdPath: "apis/storagebuckets/definition.yaml"
            timeoutSeconds: 120
            validate: False
        }
    }
]
```


This section:
* Identifies your test case
* Sets up the `assertResources` section to define expected outputs
* Links to your composition, XR and XRD files
* Defines how long to wait for the test to complete
* Defines Whether to validate against live schemas

<!-- vale Google.Headings = NO -->
<!-- vale Microsoft.HeadingAcronyms = NO -->
### Test the input XR
<!-- vale Microsoft.HeadingAcronyms = YES -->
<!-- vale Google.Headings = YES -->

<CodeBlock cloud="aws">

```yaml-noCopy title="tests/test-storagebucket/main.k"
assertResources: [
    platformv1alpha1.StorageBucket {
        metadata.name: "example"
        spec.parameters: {
            acl: "public-read"
            region: "us-west-1"
            versioning: True
        }
    }
```

</CodeBlock>

<CodeBlock cloud="azure">

```yaml-noCopy title="tests/test-storagebucket/main.k"
assertResources: [
    platformv1alpha1.StorageBucket {
        metadata.name: "example"
        spec.parameters: {
            location: "eastus"
            versioning: True
            acl: "public"
        }
    }
```

</CodeBlock>

<CodeBlock cloud="gcp">

```yaml-noCopy title="tests/test-storagebucket/main.k"
assertResources: [
    platformv1alpha1.StorageBucket {
        metadata.name: "example"
        spec.parameters: {
            location: "US"
            versioning: True
            acl: "publicRead"
        }
    }
```

</CodeBlock>

This assertion verifies:

* Your composition receives the user's `XR`
* Your control plane processes the `acl`, `region` and `versioning` parameters
* The control plane maintains the resource name and structure

### Test the storage resource

:::note
For all managed resources, strip away all default fields. This follows the best practice for composition functions to return only fields whose values they care about, as they become the owners of those fields.
:::
<CodeBlock cloud="aws">

```yaml-noCopy title="tests/test-storagebucket/main.k"
_stripDefaults(awsms3v1beta1.Bucket{
    metadata.generateName = "example-bucket"
    spec.forProvider: {
        region: "us-west-1"
    }
})
```

This assertion verifies that:

* The main S3 bucket resource is created
* The bucket uses the expected naming pattern (`example-bucket`)
* The bucket uses the user's specified region parameter

#### Test security configurations


```yaml-noCopy title="tests/test-storagebucket/main.k"
_stripDefaults(awsms3v1beta1.BucketOwnershipControls{
    metadata.generateName = "example-boc"
    spec.forProvider: {
        region: "us-west-1"
        rule: {
            objectOwnership: "BucketOwnerPreferred"
        }
    }
})
_stripDefaults(awsms3v1beta1.BucketPublicAccessBlock{
    metadata.generateName = "example-pab"
    spec.forProvider: {
        blockPublicAcls: False
        blockPublicPolicy: False
        ignorePublicAcls: False
        region: "us-west-1"
        restrictPublicBuckets: False
    }
})
```


This section tests to verify:

* Proper object ownership configuration
* Correct settings for public bucket access
* Security configuration applied to the bucket

#### Test access control and encryption


```yaml-noCopy title="tests/test-storagebucket/main.k"
_stripDefaults(awsms3v1beta1.BucketACL{
    metadata.generateName = "example-acl"
    spec.forProvider:{
        acl: "public-read"
        region: "us-west-1"
    }
})
_stripDefaults(awsms3v1beta1.BucketServerSideEncryptionConfiguration{
    metadata.generateName = "example-encryption"
    spec.forProvider: {
        region: "us-west-1"
        rule: [
            {
                applyServerSideEncryptionByDefault: {
                    sseAlgorithm: "AES256"
                }
                bucketKeyEnabled: True
            }
        ]
    }
})
```


These tests ensure the control plane:

* User's access control configuration is applied appropriately
* Enabled encryption by default
* Applies security configurations consistently

#### Test conditional features

```yaml-noCopy title="tests/test-storagebucket/main.k"
_stripDefaults(awsms3v1beta1.BucketVersioning{
    metadata.generateName = "example-versioning"
    spec.forProvider: {
        region: "us-west-1"
        versioningConfiguration: {
            status: "Enabled"
        }
    }
})
```

This assertion verifies:

* Versioning resource only exists when `versioning: True`
* The control plane sets versioning to "Enabled" 
* The control plane links versioning to the bucket 

</CodeBlock>

<CodeBlock cloud="azure">

#### Test the Azure Resource Group

```yaml-noCopy title="tests/test-storagebucket/main.k"
_stripDefaults(azuremv1beta1.ResourceGroup {
    metadata.name = "example-group"
    spec.forProvider = {
        location = "eastus"
    }
})
```

This assertion verifies that:
* The main resource group exists
* The resource group was created in the correct region (`eastus`)


#### Test Storage Account
```yaml-noCopy title="tests/test-storagebucket/main.k"
_stripDefaults(azuremstoragev1beta1.Account {
    metadata.name = "exampleaccount"
    spec.forProvider = {
        accountTier = "Standard"
        accountReplicationType = "LRS"
        location = "eastus"
        blobProperties = {
            versioningEnabled = True
        }
        infrastructureEncryptionEnabled = True
        resourceGroupNameSelector = {
            matchControllerRef = True
        }
    }
})
```

This assertion verifies that:
* Correct storage account tier is utilized (`Standard`)
* Control plane sets correct replication type 
* Control plane creates storage account in correct region
* Control plane sets correct versioning resource only exists when `versioning: True`
* Control plane sets correct encryption settings for storage account
* Storage account is created in correct resource group

#### Test Container Configuration
```yaml-noCopy title="tests/test-storagebucket/main.k"
_stripDefaults(azuremstoragev1beta1.Container {
    metadata.name = "example-container"
    spec.forProvider = {
        containerAccessType = "blob"
        storageAccountNameSelector = {
            matchControllerRef = True
        }
    }
})

```

This assertion verifies that:
* Control plane sets correct container type `blob` due to public access
* Control plane deploys container to correct storage account

</CodeBlock>

<CodeBlock cloud="gcp">
#### Test GCP bucket configuration

<!-- vale Google.Headings = NO -->
<!-- vale Google.Headings = YES -->
```yaml-noCopy title="tests/test-storagebucket/main.k"
_stripDefaults(gcpmstoragev1beta1.Bucket {
    metadata.name = "example-bucket"
    spec.forProvider = {
        location: "US"
        versioning = {
            enabled = True
        }
    }
})
```

This assertion verifies that:
* main GCP bucket resource is created
* The bucket uses the expected naming pattern (`example-bucket`)
* The bucket uses the user's specified location parameter
* The bucket was created with versioning enabled


### Test access control
```yaml-noCopy title="tests/test-storagebucket/main.k"
_stripDefaults(gcpmstoragev1beta1.BucketACL {
    metadata.name = "example-acl"
    spec.forProvider = {
        predefinedAcl = "publicRead"
        bucketSelector = {
            matchControllerRef = True
        }
    }
})
```

This assertion verifies that:
* User's access control configuration is applied appropriately
* `BucketACL` managed resource follows expected naming pattern (`example-ACL`)
* ACL is applied to correct bucket created in this composition

</CodeBlock>

### Final test structure

Your complete test now:
<!-- vale write-good.Passive = NO -->
* Simulates a user's StorageBucket `XR`
* Verifies resource creation
* Ensures resources are linked together
* Confirms user inputs flow through to created resources
<!-- vale write-good.Passive = YES -->

## Run your tests

Next, run your composition tests with the `up test run` command.

```shell {copy-lines=1}
up test run tests/*
  ✓   Parsing tests                                                                                                                                
  ✓   Checking dependencies
  ✓   Generating language schemas
  ✓   Building functions
  ✓   Checking dependencies
  ✓   Generating language schemas
  ✓   Building functions
  ✓   Building configuration package
  ✓   Pushing embedded functions to local daemon
  ✓   Assert test-storagebucket
 SUCCESS  
 SUCCESS  Tests Summary:
 SUCCESS  ------------------
 SUCCESS  Total Tests Executed: 1
 SUCCESS  Passed tests:         1
 SUCCESS  Failed tests:         0
```


### Understanding test results

Your test results return:

* **Pass/fail status**: Whether each assertion succeeded
* **Resource validation**: Confirmation for resource creation
* **Error details**: Specific information about any failures
* **Coverage summary**: Overview of the assertions

### What successful tests prove

Passing tests show:

<!-- vale Microsoft.Adverbs = NO -->
<!-- vale write-good.Passive = NO -->
* Your composition function logic is correct
* User parameters processed properly
* All required resources are created
* Security configurations are applied consistently
* Conditional logic works as expected

## Next steps

Now that you have tested your composition:
<!-- vale write-good.Weasel = NO -->
<!-- vale gitlab.FutureTense = NO -->
<!-- vale Google.Will = NO -->
* **Deploy with confidence**: Your tests prove the composition works
* **Iterate safely**: Make changes knowing tests will catch regressions
* **Add more test cases**: Test different parameter combinations and edge cases
* **Integrate with CI/CD**: Automate testing as part of your development workflow
<!-- vale write-good.Passive = YES -->
<!-- vale Microsoft.Adverbs = YES -->
<!-- vale Google.Will = YES -->
<!-- vale write-good.Weasel = YES -->

In the next guide, you'll deploy your tested composition to a control plane and see your infrastructure API in action.

<!-- vale gitlab.FutureTense = YES -->

[project-foundations]: /getstarted/builders-workshop/project-foundations
[up-account]: https://www.upbound.io/register/?utm_source=docs&utm_medium=cta&utm_campaign=docs_get_started

[up-cli]: /controlplanes/cli/overview
[kubectl-installed]: https://kubernetes.io/docs/tasks/tools/
[docker-desktop]: https://www.docker.com/products/docker-desktop/
