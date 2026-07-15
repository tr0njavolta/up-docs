---
title: AWS Upbound OIDC Authentication
sidebar_position: 2
description: Configure AWS OIDC Authentication for Upbound
---


This guide explains how to configure Upbound OIDC authentication between your
managed control plane on Upbound Cloud Spaces and AWS services. OpenID Connect
federation allows Upbound to connect to AWS without storing credentials.

:::important
Upbound OIDC authentication is only supported on control planes running in **Upbound Cloud Spaces**.
:::

## Prerequisites

- A control plane running on Upbound Cloud Spaces
- `kubectl` configured to access your control plane
- AWS CLI installed and configured with administrative access
- At least one Upbound AWS Provider installed on the control plane
- Your Upbound **organization name** and **control plane name**


## Step 1: Add Upbound as an OpenID Connect Provider in AWS

### 1.1 Set environment variables

```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
export ORG_NAME="your-upbound-org"
export CONTROL_PLANE_NAME="your-control-plane"

echo "AWS Account ID: $AWS_ACCOUNT_ID"
```

#### Option A: Create OIDC provider with AWS CLI

```bash
# Get the thumbprint for proidc.upbound.io
THUMBPRINT=$(openssl s_client -servername proidc.upbound.io \
  -showcerts -connect proidc.upbound.io:443 </dev/null 2>/dev/null \
  | openssl x509 -fingerprint -noout \
  | sed 's/://g' | cut -d= -f2 | tr '[:upper:]' '[:lower:]')

aws iam create-open-id-connect-provider \
  --url https://proidc.upbound.io \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list $THUMBPRINT
```

<!-- vale Google.Headings = NO -->
####  Option B: Create OIDC provider in AWS Console
<!-- vale Google.Headings = YES -->

1. Open the [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Navigate to **Identity Providers** > **Add Provider**
3. Select **OpenID Connect**
4. Enter Provider URL: `https://proidc.upbound.io`
5. Set Audience: `sts.amazonaws.com`
6. Click **Get thumbprint**
7. Click **Add provider**

### 1.4 Verify the OIDC provider

```bash
aws iam list-open-id-connect-providers | grep proidc.upbound.io
```

## Step 2: Create an IAM role with trust policy

### 2.1 Create the trust policy document

Create a file named `trust-policy.json`. This policy allows only your specific
control plane and provider to assume the role:

```bash
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/proidc.upbound.io"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "proidc.upbound.io:sub": "mcp:${ORG_NAME}/${CONTROL_PLANE_NAME}:provider:provider-aws",
          "proidc.upbound.io:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF
```

:::note
The `sub` condition follows the format
`mcp:ORG_NAME/CONTROL_PLANE_NAME:provider:provider-aws`. This scopes the trust
to a single control plane. Update the organization and control plane names to
match your environment.
:::


### 2.2 Create the IAM role

```bash
export ROLE_NAME="upbound-oidc-provider-aws"

aws iam create-role \
  --role-name $ROLE_NAME \
  --assume-role-policy-document file://trust-policy.json \
  --description "IAM role for Crossplane AWS Provider using Upbound OIDC"
```

### 2.3 Attach permission policies to the role

For testing, you can attach full access (not recommended for production):

```bash
# Example: Attach AdministratorAccess (for testing only)
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```
:::important
In your production environment, adhere to the principle of least privilege when
you apply policies to your roles.
:::

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

### 2.4 Get the role ARN

```bash
export ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query "Role.Arn" --output text)
echo "Role ARN: $ROLE_ARN"
```


## Step 3: Create the ProviderConfig

Unlike IRSA, Upbound OIDC doesn't require a DeploymentRuntimeConfig. The
ProviderConfig alone handles authentication.

### 3.1 Create the ProviderConfig manifest

```bash
cat > provider-config.yaml << EOF
apiVersion: aws.m.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
  namespace: default
spec:
  credentials:
    source: Upbound
    upbound:
      webIdentity:
        roleARN: ${ROLE_ARN}
EOF
```

### 3.2 Apply the ProviderConfig

```bash
kubectl apply -f provider-config.yaml
```
:::note
Naming the ProviderConfig `default` applies this authentication method
automatically to all AWS managed resources that don't specify a different
`providerConfigRef`.
:::

## Step 4: Verify the Configuration

### 4.1 Check the ProviderConfig status

```bash
kubectl get providerConfig.aws.m default -o yaml
```

### 4.2 Test with an S3 bucket resource

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

### 4.3 Check the resource status

```bash
kubectl get buckets.s3.aws.m.upbound.io my-crossplane-test-bucket -o yaml
```

Look for `status.conditions` with `type: Ready` and `status: "True"` to confirm authentication is working.



## Optional: Role chaining

To assume additional roles after the initial OIDC authentication, add an
`assumeRoleChain` to your ProviderConfig. 

The example below shows how to access resources in a different AWS account:

```yaml
apiVersion: aws.m.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
  namespace: default
spec:
  credentials:
    source: Upbound
    upbound:
      webIdentity:
        roleARN: <roleARN-for-provider-identity>
  assumeRoleChain:
    - roleARN: "arn:aws:iam::111122223333:role/my-cross-account-role"
```

<!-- vale gitlab.UnclearAntecedent = NO -->
The provider first authenticates via Upbound OIDC, then sequentially assumes
each role in the chain. This is useful for:
<!-- vale gitlab.UnclearAntecedent = YES -->

- **Cross-account access**: Managing resources in AWS accounts different from the one hosting the OIDC trust
- **Privilege separation**: Using a minimal initial role that escalates to a more permissive role for specific operations

:::note
The target role in the chain must have a trust policy that allows
`sts:AssumeRole` from the initial OIDC role.
:::

## Optional: Named ProviderConfig for selective authentication

If you need multiple authentication methods or want to explicitly reference the config:

```yaml
apiVersion: aws.m.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: upbound-oidc-config
  namespace: default
spec:
  credentials:
    source: Upbound
    upbound:
      webIdentity:
        roleARN: arn:aws:iam::123456789012:role/upbound-oidc-provider-aws
```

Reference it in managed resources:

```yaml
apiVersion: s3.aws.m.upbound.io/v1beta1
kind: Bucket
metadata:
  name: my-s3-bucket
spec:
  forProvider:
    region: us-east-2
  providerConfigRef:
    kind: ProviderConfig
    name: upbound-oidc-config
```

## Optional: Configure multiple control plane access

To grant multiple control planes access to the same IAM role, add additional
conditions to the trust policy:

### Explicit control plane names (recommended)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/proidc.upbound.io"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "proidc.upbound.io:aud": "sts.amazonaws.com"
        },
        "ForAnyValue:StringEquals": {
          "proidc.upbound.io:sub": [
            "mcp:my-org/control-plane-dev:provider:provider-aws",
            "mcp:my-org/control-plane-staging:provider:provider-aws",
            "mcp:my-org/control-plane-prod:provider:provider-aws"
          ]
        }
      }
    }
  ]
}
```

### Wildcard for all organization control planes

You can also use `StringLike` with a wildcard to trust all control planes in an organization:

```json
"Condition": {
  "StringEquals": {
    "proidc.upbound.io:aud": "sts.amazonaws.com"
  },
  "StringLike": {
    "proidc.upbound.io:sub": "mcp:my-org/*:provider:provider-aws"
  }
}
```
:::warning
Wildcards broaden the trust scope. Any control plane in the organization can
assume this role. Use explicit control plane names in production environments.
:::

## Troubleshooting

### Check provider logs

```bash
# Find the provider pod
kubectl get pods -n crossplane-system | grep provider-aws

# View logs
kubectl logs -n crossplane-system <provider-pod-name> -f
```

### Common issues
<!-- vale write-good.Weasel = NO -->
<!-- vale write-good.Passive = NO -->
| Issue | Solution |
|-------|----------|
| `AccessDenied` when assuming role | Verify the trust policy has the correct OIDC provider ARN and the `sub` condition matches your org/control plane names exactly |
| `InvalidIdentityToken` | Confirm the OIDC provider `proidc.upbound.io` is registered in your AWS account |
| `ExpiredTokenException` | The web identity token has expired; this is usually transient and retries automatically |
| Provider pod not authenticating | Set `credentials.source` to `Upbound` (not `IRSA` or `Secret`) |
| Wrong control plane name in sub | The `sub` field is case-sensitive; double-check org and control plane names in the trust policy |
| Role chaining `AccessDenied` | Verify the target role's trust policy allows `sts:AssumeRole` from the initial OIDC role ARN |
<!-- vale write-good.Weasel = YES -->
<!-- vale write-good.Passive = YES -->

### Verify OIDC Provider Configuration

```bash
# List OIDC providers and find the Upbound one
aws iam list-open-id-connect-providers

# Get details of the Upbound OIDC provider
aws iam get-open-id-connect-provider \
  --open-id-connect-provider-arn arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/proidc.upbound.io
```

### Verify trust policy

```bash
aws iam get-role --role-name $ROLE_NAME --query "Role.AssumeRolePolicyDocument" --output json
```

Confirm the output contains the correct `Federated` principal and `sub` condition.

## Security best practices

Use the following best practices when setting up OIDC in your environment:
<!-- vale write-good.Weasel = NO -->
<!-- vale Microsoft.Adverbs = NO -->
- **No stored credentials** - Upbound OIDC uses federated identity tokens, eliminating static credentials entirely
- **Scope trust narrowly** - Always specify the exact control plane name in the `sub` condition rather than using wildcards
- **Use least privilege** - Grant only the permissions the provider needs via IAM policies
- **Audit role assumptions** - Enable AWS CloudTrail to log all `AssumeRoleWithWebIdentity` calls for this role
- **Review trust policies regularly** - Remove control plane entries when decommissioned
- **Prefer Upbound OIDC over Access Keys** - When running on Upbound Cloud Spaces, this method is more secure than storing access keys as Kubernetes secrets
<!-- vale write-good.Weasel = YES -->
<!-- vale Microsoft.Adverbs = YES -->

