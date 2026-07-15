---
title: AWS IRSA Authentication Setup
sidebar_position: 2
description: Configure AWS IRSA Authentication for Upbound
---


This guide explains how to configure IAM Roles for Service Accounts (IRSA)
authentication between your AWS EKS Crossplane control plane and AWS services.

IRSA allows Kubernetes pods to assume AWS IAM roles without storing credentials.
IRSA works by:

1. Annotating a Kubernetes ServiceAccount with an IAM Role ARN
2. AWS validates the pod's identity token against the EKS OIDC provider
3. The pod receives temporary AWS credentials to assume the role


## Prerequisites

- An existing Amazon EKS cluster
- `kubectl` configured to access your EKS cluster
- AWS CLI installed and configured with appropriate permissions
- A control plane (Crossplane V2/UXPv2/Upbound Space managed control plane) on your EKS cluster

## Step 1: Create an IAM OIDC Provider for Your EKS Cluster

IRSA requires an IAM OIDC identity provider associated with your EKS cluster.

### 1.1 Set environment variables

```bash
export CLUSTER_NAME="your-cluster-name"
export AWS_REGION="us-east-2"
```

### 1.2 Get your EKS cluster's OIDC issuer URL

```bash
export OIDC_URL=$(aws eks describe-cluster \
  --name $CLUSTER_NAME \
  --region $AWS_REGION \
  --query "cluster.identity.oidc.issuer" \
  --output text)

echo $OIDC_URL
# Example output: https://oidc.eks.us-east-2.amazonaws.com/id/5C64F628ACFB6A892CC25AF3B67124C5
```

### 1.3 Check if OIDC provider already exists

```bash
export OIDC_ID=$(echo $OIDC_URL | cut -d '/' -f 5)
aws iam list-open-id-connect-providers | grep $OIDC_ID
```

### 1.4 Create the OIDC provider (if it doesn't exist)

```bash
eksctl utils associate-iam-oidc-provider \
  --cluster $CLUSTER_NAME \
  --region $AWS_REGION \
  --approve
```


## Step 2: Create an IAM role with trust policy

### 2.1 Get your AWS Account ID

```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
echo "AWS Account ID: $AWS_ACCOUNT_ID"
```

### 2.2 Set your Crossplane namespace

```bash
export CROSSPLANE_NAMESPACE="crossplane-system"
```

### 2.3 Create the trust policy document

Create a file named `trust-policy.json`:

```bash
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/oidc.eks.${AWS_REGION}.amazonaws.com/id/${OIDC_ID}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "oidc.eks.${AWS_REGION}.amazonaws.com/id/${OIDC_ID}:sub": "system:serviceaccount:${CROSSPLANE_NAMESPACE}:upbound-provider-aws-*"
        }
      }
    }
  ]
}
EOF
```
<!-- vale write-good.Passive = NO -->
:::note
The `StringLike` condition with `upbound-provider-aws-*` is used because the AWS
Provider's service account name includes a hash that may change between
upgrades. Make sure this value matches what's deployed in your control plane to
avoid this common mistake.
:::
<!-- vale write-good.Passive = YES -->

### 2.4 Create the IAM role

```bash
export ROLE_NAME="crossplane-provider-aws"

aws iam create-role \
  --role-name $ROLE_NAME \
  --assume-role-policy-document file://trust-policy.json \
  --description "IAM role for Crossplane AWS Provider using IRSA"
```

### 2.5 Attach permission policies to the role

For testing, you can attach full access (not recommended for production):

```bash
# Example: Attach AdministratorAccess (for testing only)
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

**Recommended: Use least-privilege policies**

```bash
# Example: Attach specific service policies
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/AmazonRDSFullAccess
```

### 2.6 Get the role ARN

```bash
export ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query "Role.Arn" --output text)
echo "Role ARN: $ROLE_ARN"
```

## Step 3: Create a DeploymentRuntimeConfig

The DeploymentRuntimeConfig annotates the provider's service account with the
IAM role ARN.

### 3.1 Create the DeploymentRuntimeConfig manifest

```bash
cat > deployment-runtime-config.yaml << EOF
apiVersion: pkg.crossplane.io/v1beta1
kind: DeploymentRuntimeConfig
metadata:
  name: irsa-runtimeconfig
spec:
  serviceAccountTemplate:
    metadata:
      annotations:
        eks.amazonaws.com/role-arn: ${ROLE_ARN}
EOF
```

### 3.2 Apply the DeploymentRuntimeConfig

```bash
kubectl apply -f deployment-runtime-config.yaml
```


## Step 4: Install or Update the AWS Provider

### 4.1 Create the Provider manifest with runtimeConfigRef

```bash
cat > provider-aws.yaml << EOF
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-s3
spec:
  package: xpkg.upbound.io/upbound/provider-aws-s3:v2.3.0
  runtimeConfigRef:
    name: irsa-runtimeconfig
EOF
```

### 4.2 Apply the provider

```bash
kubectl apply -f provider-aws.yaml
```

Wait for the Provider to become healthy.

### 4.3 Verify the service account annotation

```bash
# Get the provider's service account name
SA_NAME=$(kubectl get sa -n $CROSSPLANE_NAMESPACE -o name | grep provider-aws-s3)

# Describe the service account and verify the annotation
kubectl describe $SA_NAME -n $CROSSPLANE_NAMESPACE | grep -A2 "Annotations"
```

Expected output should show:
```
Annotations:  eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/crossplane-provider-aws
```

## Step 5: Create the ProviderConfig

### 5.1 Create the ProviderConfig manifest

```bash
cat > provider-config.yaml << EOF
apiVersion: aws.m.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
  namespace: default
spec:
  credentials:
    source: IRSA
EOF
```

### 5.2 Apply the ProviderConfig

```bash
kubectl apply -f provider-config.yaml
```

## Step 6: Verify the Configuration

### 6.1 Check the ProviderConfig status

```bash
kubectl get providerConfig.aws.m default -o yaml
```

### 6.2 Test with an S3 bucket resource

Create a new bucket to test your access.

:::note
S3 buckets are globally unique. Update the bucket name below to avoid naming
conflicts.
:::

```sh
kubectl apply -f - <<EOF
apiVersion: s3.aws.m.upbound.io/v1beta1
kind: Bucket
metadata:
  name: <YOUR-TEST-BUCKET>
spec:
  forProvider:
    region: us-east-2
  providerConfigRef:
    kind: ProviderConfig
    name: default
EOF
```


### 6.3 Check the resource status

```bash
kubectl get buckets.s3.aws.m.upbound.io my-crossplane-test-bucket -o yaml
```

Look for `status.conditions` with `type: Ready` and `status: "True"` to confirm authentication is working.

<!-- vale Google.We = NO -->
:::note
We specify `buckets.s3.aws.m.upbound.io` to avoid any potential conflicts with
other CRDs installed on a cluster.
:::
<!-- vale Google.We = YES -->

## Optional: Role chaining

If you need to assume additional roles after the initial IRSA authentication,
add an `assumeRoleChain` to your ProviderConfig:

```yaml
apiVersion: aws.m.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
  namespace: default
spec:
  credentials:
    source: IRSA
  assumeRoleChain:
    - roleARN: "arn:aws:iam::111122223333:role/my-assumed-role"
```

## Optional: Configure multiple provider families

When using multiple AWS provider families (S3, EC2, RDS, etc.), apply the same `runtimeConfigRef` to each provider:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-ec2
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v2.1.1
  runtimeConfigRef:
    name: irsa-runtimeconfig
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-rds
spec:
  package: xpkg.upbound.io/upbound/provider-aws-rds:v2.1.1
  runtimeConfigRef:
    name: irsa-runtimeconfig
```


## Troubleshooting

### Check provider logs

```bash
kubectl logs -n $CROSSPLANE_NAMESPACE -l pkg.crossplane.io/provider=provider-aws-s3
```

### Common issues

| Issue | Solution |
|-------|----------|
| Provider pod fails to start or authenticate | Check the provider pod logs with `kubectl logs -n $CROSSPLANE_NAMESPACE -l pkg.crossplane.io/provider=provider-aws-s3` |
| `AccessDenied` errors | Verify the trust policy has the correct OIDC provider ARN; ensure the service account namespace matches the trust policy condition; check that the IAM role has required permission policies attached |
| Service account not annotated | Verify the DeploymentRuntimeConfig is correctly applied; restart the provider by deleting its pods; check if the provider references the correct runtimeConfigRef |
| OIDC thumbprint issues | If you see certificate validation errors, verify the OIDC issuer URL with `aws eks describe-cluster --name $CLUSTER_NAME --region $AWS_REGION --query "cluster.identity.oidc.issuer"` |

## Security best practices

<!-- vale write-good.Passive = NO -->
Upbound recommends the following best practices when configuring IRSA:

- **No stored credentials** - IRSA uses projected service account tokens and temporary `STS` credentials, eliminating static secrets
- **Use least privilege** - Grant only the permissions the provider needs via IAM policies
- **Scope trust policies narrowly** - Use the most specific `sub` condition that matches your provider service accounts; avoid overly broad wildcards
- **Audit role assumptions** - Enable AWS CloudTrail to log all `AssumeRoleWithWebIdentity` calls for this role
- **Rotate the OIDC thumbprint** - If your EKS cluster's OIDC certificate is rotated, update the IAM OIDC provider thumbprint
- **Prefer IRSA over Access Keys** - When running on EKS, IRSA is more secure than storing access keys as Kubernetes secrets
<!-- vale write-good.Passive = YES -->
