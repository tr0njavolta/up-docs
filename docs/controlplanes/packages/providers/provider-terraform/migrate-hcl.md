---
title: Rewrite HCL for Crossplane or Upbound
sidebar_position: 1
---

The [Migrating from Terraform to Crossplane
Guide][migrating-from-terraform-to-crossplane-guide] used `provider-terraform`
to "lift and shift" your Terraform code into a basic Crossplane configuration.
The provider is a great way to get started on your Crossplane journey. With
Crossplane, you can go even further by converting your Terraform HashiCorp
Configuration Language (HCL) into Kubernetes-like manifests for more Crossplane
benefits.

<!-- vale Microsoft.HeadingPunctuation = NO -->

## Why go all in on Crossplane?

<!-- vale Microsoft.HeadingPunctuation = YES -->

Moving away from HCL to Crossplane configurations can simplify your deployment
workflow. You can manage your applications and infrastructure with the same workflow and leverage the continuous reconciliation processes of Crossplane in Kubernetes.

## Prerequisites

<!-- vale Google.Will = NO -->
<!-- vale gitlab.FutureTense = NO -->
For this guide, you will convert the HCL configuration from the previous guide
to use Crossplane native resources. Make sure you have:
<!-- vale Google.Will = YES -->
<!-- vale gitlab.FutureTense = YES -->

- Crossplane installed
- A Kubernetes cluster
- An AWS account

## Create a Crossplane managed resource

The managed resource configuration in the previous guide created a virtual machine with the `provider-terraform`:

```yaml
apiVersion: tf.upbound.io/v1beta1
kind: Workspace
metadata:
  name: tf-vm
spec:
  forProvider:
    source: Inline
    module: |
      resource "aws_instance" "my_vm" {
        ami           = "ami-065deacbcaac64cf2"
        instance_type = "t2.micro"
        tags = {
          Name = var.vmName
        }
      }

      variable "vmName" {
        description = "VM name"
        type        = string
      }

    vars:
      - key: vmName
        value: crossplanevm
```

A Crossplane native managed resource relies on the provider-aws
instead:

```yaml
apiVersion: ec2.aws.crossplane.io/v1alpha1
kind: Instance
metadata:
  name: crossplane-vm
spec:
  forProvider:
    region: us-west-2
    imageId: ami-065deacbcaac64cf2
    instanceType: t2.micro
  providerConfigRef:
    name: awsconfig
```

This example uses the same fields as the Terraform configuration, with key differences.
First, the `apiVersion` field references the API group for the AWS Crossplane
provider. This provider focuses explicitly on the EC2 service of AWS.

<!-- vale gitlab.FutureTense = NO -->
The `kind` field identifies the schema type for the configuration. In this case,
you'll use the Instance kind.
<!-- vale gitlab.FutureTense = YES -->

The `metadata` is a required field that contains information about the resource,
like the name or other identifying values.

The `spec` field defines the parameters of the instance.

<!-- vale Google.Will = NO -->
<!-- vale gitlab.FutureTense = NO -->
The `forProvider` sub-field defines the information you need for the instance
configuration. Instead of relying on the Terraform configuration to define how
you want to configure the instance, you'll use the Kubernetes manifest
configuration language.
<!-- vale gitlab.FutureTense = YES -->
<!-- vale Google.Will = YES -->


## Create a composition

Your infrastructure needs supporting resources. Crossplane uses compositions to create and manage multiple resources.

Compositions let you compose all necessary resources into a file with every
attribute your organization needs. These compositions are the explicit resources
your teams need and the infrastructure consumers (developers and applications
teams) aren't exposed to these files. 

Next, create a `definition` and a `claim`. The definition file defines
what inputs you need to create the resources in the composition. The claim is
the file you can expose to infrastructure consumers and lets them define the
variables required from the definition.

<!-- vale gitlab.FutureTense = NO -->
In this section, you'll create a composition with an instance and all the supporting resources for it to be useful.
<!-- vale gitlab.FutureTense = YES -->

Create a new file called `complete-instance-composition.yaml`.

Expand the Composition below and copy and paste it into your file.

<details>

<summary> Instance composition </summary>

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xinstance.aws.example.corp
spec:
  writeConnectionSecretsToNamespace: upbound-system
  compositeTypeRef:
    apiVersion: aws.example.corp/v1alpha1
    kind: XInstance
  resources:
    - name: test-env
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: VPC
        spec:
          forProvider:
            cidrBlock: 10.0.0.0/16
            enableDnsHostnames: true
            enableDnsSupport: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.region

    - name: subnet
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: Subnet
        spec:
          forProvider:
            cidrBlock: 10.0.0.0/24
            vpcIdSelector:
              matchControllerRef: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.region
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.availabilityZone
          transforms:
            - type: string
              string:
                fmt: "%sa"
                type: Format

    - name: ingress-all-test
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: SecurityGroup
        spec:
          forProvider:
            name: allow-all-sg
            vpcIdSelector:
              matchControllerRef: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.region

    - name: ingress-all-test-ingress
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: SecurityGroupIngressRule
        spec:
          forProvider:
            cidrIpv4: 0.0.0.0/0
            fromPort: 22
            toPort: 22
            ipProtocol: tcp
            securityGroupIdSelector:
              matchControllerRef: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.region

    - name: ingress-all-test-egress
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: SecurityGroupEgressRule
        spec:
          forProvider:
            cidrIpv4: 0.0.0.0/0
            fromPort: 0
            toPort: 0
            ipProtocol: "-1"
            securityGroupIdSelector:
              matchControllerRef: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.region

    - name: test-env-gw
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: InternetGateway
        spec:
          forProvider:
            vpcIdSelector:
              matchControllerRef: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.region

    - name: route-table-test-env
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: RouteTable
        spec:
          forProvider:
            vpcIdSelector:
              matchControllerRef: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.region

    - name: route-table-test-env-route
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: Route
        spec:
          forProvider:
            destinationCidrBlock: 0.0.0.0/0
            gatewayIdSelector:
              matchControllerRef: true
            routeTableIdSelector:
              matchControllerRef: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.region

    - name: subnet-association
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: RouteTableAssociation
        spec:
          forProvider:
            routeTableIdSelector:
              matchControllerRef: true
            subnetIdSelector:
              matchControllerRef: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.region

    - name: keypair
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: KeyPair
        metadata:
          labels:
            testing.upbound.io/example-name: keypair
          name: keypair
        spec:
          forProvider:
            publicKey:
              matchControllerRef: true
            region:
              matchControllerRef: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.region
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.publicKey
          toFieldPath: spec.forProvider.publicKey

    - name: ec2-instance
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: Instance
        metadata:
          labels:
            testing.upbound.io/example-name: test
          name: test
        spec:
          forProvider:
            instanceType: t3.micro
            amiId: ami-0005e0cfe09cc9050
            vpcSecurityGroupIdSelector:
              matchControllerRef: true
            subnetIdSelector:
              matchControllerRef: true
            keyPairName:
              matchControllerRef: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.region
       - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.keyPairName
          toFieldPath: spec.forProvider.keyName

    - name: ip-test-env
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: EIP
        metadata:
          labels:
            testing.upbound.io/example-name: lb
          name: lb
        spec:
          forProvider:
            instanceSelector:
              matchControllerRef: true
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.region
          toFieldPath: spec.forProvider.region
```

</details>

## Create a Crossplane custom resource definition

A `definition` is a Crossplane spec that defines the allowed and required
resources you want to deploy.

In this step, create a definition for the composition in the preceding step. Think of this as a custom API endpoint. You created the composition with all the necessary supporting resources and now your definition highlights all the parameters you need to pass when you deploy. Notice the only properties required in this definition are the `region` and the `publicKey` string. That's because you explicitly set the other attributes like the `amiId` in the composition. Your applications teams and developers don't need to know what `AMI` to use because you set one that meets your organizations needs.

<!-- vale Google.Will = YES -->

<!-- vale gitlab.FutureTense = YES -->

Create a new file called `complete-instance-definition.yaml`.

Copy and paste the definition below:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xinstances.aws.example.corp
spec:
  group: aws.example.corp
  names:
    kind: XInstance
    plural: xinstances
  claimNames:
    kind: Instance
    plural: instances
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
                parameters:
                  type: object
                  description: Instance configuration parameters.
                  properties:
                    publicKey:
                      type: string
                    region:
                      type: string
                  required:
                    - region
                    - publicKey
              required:
                - parameters
```

## Create a claim

Now that you have a custom resource definition and a composition, you can create a claim and provision the resources.

A claim deploys a set of resources within a namespace. Creating claims
is comparable to different Terraform workspaces. Resources in one
namespace don't impact resources in another namespace.

```yaml
apiVersion: aws.example.corp/v1alpha1
kind: Instance
metadata:
  name: example
  namespace: default
spec:
  parameters:
    region: us-east-1
    publicKey: |
      ssh-rsa AAAAB3NzaC1...
```

:::note
Copy and paste the contents of your public key (typically `~/.ssh/id_rsa.pub`)
into the `publicKey` field.
:::

Claims are the highly opinionated entry points your infrastructure consumers to use. Your claim eliminates the need for them to think about underlying resources and attributes.

## Authenticate with your cloud provider

The Crossplane AWS provider configuration handles authentication. You must
create a Kubernetes secret file to authenticate with your AWS account.

The provider supports AWS authentication with:

<!-- - [Authentication Keys][authentication-keys] -->
<!-- - [Web Identity][web-identity] -->
<!-- - [Service Accounts][service-accounts] -->

:::note
For more information on cloud provider authentication, read the
<!-- [Provider Azure][provider-azure] or [Provider GCP][provider-gcp] authentication documentation. -->
:::

Create a new Kubernetes secret.

```shell
kubectl -n upbound-system create secret generic aws-creds --from-file=credentials=aws-credentials
```

Verify your secret with `kubectl describe secret`.

```shell {copy-lines="1"}
kubectl describe secret aws-creds -n upbound-system

Name:         aws-creds
Namespace:    upbound-system
Labels:       <none>
Annotations:  <none>

Type:  Opaque

Data
====
creds:  114 bytes
```

## Install the provider

```yaml
apiVersion: aws.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: aws-provider-ec2
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: upbound-system
      name: aws-creds
      key: credentials
```

```shell
kubectl apply -f aws-provider-config.yaml
```

## Deploy your claim

Next, apply your Crossplane Composition.

```shell
kubectl apply -f claim.yaml
```

## Verify your deployment

You can verify your deployment with `kubectl get claim`.

```shell
kubectl get claim
```

## Recommended practices

When you move from Terraform to Crossplane, the `provider-terraform` approach eases the transition. When you get more comfortable with Crossplane, the
native cloud provider configuration enables you to remove your original HCL
resource definitions.

The [Upbound Marketplace][upbound-marketplace] can help you recreate your Terraform configurations with
Crossplane providers. In the EC2 example, the Marketplace has a dedicated
section for all the managed resources of the [EC2 API group](https://marketplace.upbound.io/providers/upbound/provider-aws-ec2/. The original
Terraform resource requires two attributes to be valid, `ami` and `instance_type`.

The Upbound Marketplace represents these attributes in the API schema.
The `ami` and `instance_type` keys are properties within the `forProvider` object. The attributes
required by Terraform are the same values required by Crossplane.

## Next steps

You just created an EC2 instance with an SSH key with Crossplane. You created a
Composite Resource Definition and a Composition from your original Terraform
configuration.


[migrating-from-terraform-to-crossplane-guide]: /manuals/packages/providers/provider-terraform/migrate-provider-tf
[authentication-keys]: /manuals/packages/providers/authentication#aws-access-keys
[web-identity]: /manuals/packages/providers/authentication#aws-webidentity
[service-accounts]: /manuals/packages/providers/authentication#aws-irsa
[provider-azure]: /manuals/packages/providers/authentication#azure-service-principal
[provider-gcp]: /manuals/packages/providers/authentication#gcp-service-account-keys


[upbound-marketplace]: https://marketplace.upbound.io
