---
title: AWS Access Key Authentication Setup
sidebar_position: 1
description: Configure AWS Access Key Authentication for Upbound
---

This guide walks through configuring the Upbound Official AWS Provider to
authenticate using AWS access keys stored as a Kubernetes Secret.

Access key authentication uses static AWS IAM credentials stored as a
Kubernetes Secret. The provider reads the secret and uses the access key ID and
secret access key to authenticate with AWS APIs. This authentication method is the simplest
but requires manual credential rotation and stores
long-lived secrets in the cluster.

:::warning
Upbound recommends using [IRSA], [EKS Pod Identity][eks], or [WebIdentity]
rather than static access keys to avoid the risk of long-living static
credentials.
:::

## Prerequisites

- A running cluster with Crossplane V2, UXPv2, or a managed Upbound Cloud control plane
- `kubectl` configured to access your control plane
- At least one Upbound AWS Provider installed on the cluster
- AWS CLI installed and configured with administrative access
- AWS IAM credentials (or permissions to create them)

## Step 1: Create AWS IAM credentials

### Option A: Create a new IAM user with access keys

#### 1.1 Create the IAM user

```bash
aws iam create-user --user-name crossplane-provider
```

#### 1.2 Attach permissions to the user

For testing, attach full access (not recommended for production):

```bash
# Example: Attach AdministratorAccess (for testing only)
aws iam attach-user-policy \
  --user-name crossplane-provider \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

**Recommended: Use least-privilege policies**

```bash
# Example: Attach specific service policies
aws iam attach-user-policy \
  --user-name crossplane-provider \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-user-policy \
  --user-name crossplane-provider \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

aws iam attach-user-policy \
  --user-name crossplane-provider \
  --policy-arn arn:aws:iam::aws:policy/AmazonRDSFullAccess
```

#### 1.3 Create access keys

```bash
aws iam create-access-key --user-name crossplane-provider
```

This returns JSON output:

```json
{
    "AccessKey": {
        "UserName": "crossplane-provider",
        "AccessKeyId": "AKIAIOSFODNN7EXAMPLE",
        "Status": "Active",
        "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        "CreateDate": "2024-01-15T12:00:00+00:00"
    }
}
```

#### 1.4 Create the credentials file

Using the output from the previous command, create `aws-credentials.txt`:

```bash
cat > aws-credentials.txt << EOF
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EOF
```

<!-- vale write-good.Passive = NO -->
:::warning
The secret access key is only shown once at creation time. Save it securely
before continuing.
:::
<!-- vale write-good.Passive = YES -->

### Option B: Use existing access keys

If you already have access keys, create `aws-credentials.txt` directly:

```ini
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```
<!-- vale Google.Headings = NO -->
### Option C: SSO session credentials (temporary)
<!-- vale Google.Headings = YES -->

If you use AWS SSO:

1. Access your organization's AWS SSO portal
2. Select **Command line or programmatic access**
3. Expand **Option 2** and copy the credentials
4. Create `aws-credentials.txt` with the copied content:

```ini
[123456789_AdministratorAccess]
aws_access_key_id=ASIAZBZV2IPKEXAMPLEKEY
aws_secret_access_key=PPF/Wu9vTja98L5t/YNycbzEMEXAMPLEKEY
aws_session_token=ArrGMPb4X3zjshBuQHLa79fyNZ8t...
```

:::warning
SSO credentials are temporary. When they expire, Crossplane loses the ability to
manage AWS resources until you update the secret with fresh credentials.
:::

## Step 2: Create the Kubernetes Secret

### 2.1 Create the secret

```bash
kubectl create secret generic aws-secret \
  -n crossplane-system \
  --from-file=my-aws-secret=./aws-credentials.txt
```

### 2.2 Verify the secret

```bash
kubectl get secret aws-secret -n crossplane-system
```

## Step 3: Create the ProviderConfig

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
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-secret
      key: my-aws-secret
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

## Step 4: Verify the configuration

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

Look for `status.conditions` with `type: Ready` and `status: "True"` to confirm
authentication is working.

<!-- vale Google.We = NO -->
:::note
We specify `buckets.s3.aws.m.upbound.io` to avoid any potential conflicts with
other CRDs installed on a cluster.
:::
<!-- vale Google.We = YES -->

## Optional: Named ProviderConfig for selective authentication

If you need multiple authentication methods or want to explicitly reference the
config, use a named ProviderConfig:

```yaml
apiVersion: aws.m.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: key-based-providerconfig
  namespace: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-secret
      key: my-aws-secret
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
    name: key-based-providerconfig
```

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
<!-- vale alex.Race = NO -->
| Issue | Solution |
|-------|----------|
| `InvalidClientTokenId` | Verify the access key ID is correct and the IAM user exists |
| `SignatureDoesNotMatch` | Check the secret access key for typos or extra whitespace in the credentials file |
| `ExpiredToken` | SSO credentials expired. Regenerate them and update the Kubernetes Secret |
| `AccessDenied` | The IAM user lacks required permissions. Attach the necessary IAM policies |
<!-- vale write-good.Weasel = YES -->
<!-- vale write-good.Passive = YES -->
<!-- vale alex.Race = YES -->

### Update credentials

To rotate or replace credentials, recreate the secret and restart the provider:

```bash
kubectl delete secret aws-secret -n crossplane-system
kubectl create secret generic aws-secret \
  -n crossplane-system \
  --from-file=my-aws-secret=./aws-credentials.txt

# Restart provider pods to pick up new credentials
kubectl rollout restart deployment \
  -n crossplane-system \
  -l pkg.crossplane.io/provider=provider-aws
```

## Security best practices

<!-- vale write-good.Weasel = NO -->
<!-- vale Microsoft.Adverbs = NO -->
<!-- vale write-good.Passive = NO -->
<!-- vale write-good.TooWordy = NO -->
- **Rotate credentials regularly** - AWS recommends rotating access keys every 90 days; update the Kubernetes Secret after each rotation
- **Use least privilege** - Grant only the permissions the provider needs via IAM policies
- **Avoid committing credentials** - Never commit `aws-credentials.txt` to version control; add it to `.gitignore`
- **Prefer identity-based methods on EKS** - When running on EKS, IRSA, EKS Pod Identity, or WebIdentity are more secure because they use temporary credentials and eliminate static secrets
- **Restrict Secret access** - Use Kubernetes RBAC to limit which service accounts can read the credentials secret
<!-- vale write-good.Weasel = YES -->
<!-- vale Microsoft.Adverbs = YES -->
<!-- vale write-good.TooWordy = YES -->
<!-- vale write-good.Passive = YES -->


[irsa]: /manuals/packages/providers/aws-auth/aws-irsa
[eks]: /manuals/packages/providers/aws-auth/aws-pod-identity
[webidentity]: /manuals/packages/providers/aws-auth/aws-web-identity
