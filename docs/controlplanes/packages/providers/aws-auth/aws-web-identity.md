---
title: AWS Web Identity Authentication
sidebar_position: 2
description: Configure AWS Web Identity Authentication for Upbound
---
<!-- vale write-good.Passive = NO-->
<!-- vale gitlab.SubstitutionWarning = NO -->

This guide provides step-by-step instructions to configure WebIdentity
authentication between your Crossplane control plane running on Amazon EKS and
AWS services. This method uses the EKS cluster's OpenID Connect provider to
exchange Kubernetes service account tokens for temporary AWS credentials without
storing static secrets.

WebIdentity enables credential-free authentication by having the Crossplane
provider exchange a web identity token directly with AWS STS:
1. The EKS cluster's OIDC provider is registered as a trusted identity provider in AWS IAM
2. An IAM role trusts this OIDC provider, scoped to the provider's service account
3. The provider reads a web identity token and calls `sts:AssumeRoleWithWebIdentity` with the role ARN and token configured in the ProviderConfig
4. AWS returns temporary credentials the provider uses to manage resources

The token source is configurable per-ProviderConfig via the `tokenConfig` API.
Tokens can be read from a filesystem path or a Kubernetes Secret.

## How WebIdentity differs from IRSA

<!-- vale gitlab.SentenceLength = NO -->
Both methods run on EKS and use the same underlying OIDC federation mechanism,
but they differ in how the role ARN and token are communicated to the provider:
<!-- vale gitlab.SentenceLength = YES -->

| | IRSA | WebIdentity |
|---|---|---|
| Role ARN specified in | ServiceAccount annotation (via DeploymentRuntimeConfig) | ProviderConfig |
| Token source | Injected by EKS pod identity webhook | Configurable per-ProviderConfig (`tokenConfig`) |
| Requires DeploymentRuntimeConfig | Yes | Yes, to project a token with the `sts.amazonaws.com` audience |
| Multiple roles without restarting pods | No | Yes, each ProviderConfig can target a different role and token |
| ProviderConfig `source` | `IRSA` | `WebIdentity` |

<!-- vale gitlab.SentenceLength = NO -->
WebIdentity is useful when you want to control the role ARN and token at the
ProviderConfig level rather than at the provider installation level, or when you
need multiple ProviderConfigs pointing to different roles and token sources.
<!-- vale gitlab.SentenceLength = YES -->


## Prerequisites

- An existing Amazon EKS cluster
- `kubectl` configured to access your EKS cluster
- AWS CLI installed and configured with appropriate permissions
- A control plane (Crossplane V2/UXPv2/Upbound Space managed control plane) on your EKS cluster

## Step 1: Create an IAM OIDC Provider for Your EKS Cluster

WebIdentity requires an IAM OIDC identity provider associated with your EKS
cluster. This step is identical to the IRSA setup. If you have already
configured an OIDC provider for your cluster, skip to [Step
2](#step-2-create-an-iam-role-with-trust-policy).

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
# Extract the OIDC ID from the URL
export OIDC_ID=$(echo $OIDC_URL | cut -d '/' -f 5)

# Check if the OIDC provider exists
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
:::note
The `StringLike` condition with `upbound-provider-aws-*` is used because the AWS
Provider's service account name includes a hash suffix that may change between
upgrades. Make sure this value matches what's deployed in your control plane to
avoid this common mistake.
:::

### 2.4 Create the IAM role

```bash
export ROLE_NAME="crossplane-provider-aws-webidentity"

aws iam create-role \
  --role-name $ROLE_NAME \
  --assume-role-policy-document file://trust-policy.json \
  --description "IAM role for Crossplane AWS Provider using WebIdentity"
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

WebIdentity requires the provider pod to have a projected service account token with the `sts.amazonaws.com` audience. The default Kubernetes projected token uses the API server audience, which AWS STS rejects. A DeploymentRuntimeConfig projects a token volume with the correct audience into the provider pod.

### 3.1 Create the DeploymentRuntimeConfig manifest

```bash
cat > deployment-runtime-config.yaml << EOF
apiVersion: pkg.crossplane.io/v1beta1
kind: DeploymentRuntimeConfig
metadata:
  name: webidentity-runtimeconfig
spec:
  deploymentTemplate:
    spec:
      selector: {}
      template:
        spec:
          containers:
            - name: package-runtime
              volumeMounts:
                - name: aws-iam-token
                  mountPath: /var/run/secrets/aws-iam-token
                  readOnly: true
          volumes:
            - name: aws-iam-token
              projected:
                sources:
                  - serviceAccountToken:
                      audience: sts.amazonaws.com
                      expirationSeconds: 86400
                      path: token
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
  name: upbound-provider-aws-s3
spec:
  package: xpkg.upbound.io/upbound/provider-aws-s3:v2.3.0
  runtimeConfigRef:
    name: webidentity-runtimeconfig
EOF
```

### 4.2 Apply the provider

```bash
kubectl apply -f provider-aws.yaml
```

Wait for the Provider to become healthy.

### 4.3 Verify the projected token volume

Confirm the provider pod has the `aws-iam-token` volume:

```bash
POD_NAME=$(kubectl get pods -n $CROSSPLANE_NAMESPACE -l pkg.crossplane.io/revision -o jsonpath='{.items[0].metadata.name}')
kubectl get pod $POD_NAME -n $CROSSPLANE_NAMESPACE -o jsonpath='{.spec.volumes[*].name}'
```

You should see `aws-iam-token` in the output.


## Step 5: Create the ProviderConfig

The role ARN and token source are specified directly in the ProviderConfig, and the provider handles the token exchange itself.

The `tokenConfig` field controls where the provider reads the web identity token from:

| Token Source | `tokenConfig.source` | Use case |
|---|---|---|
| Filesystem | `Filesystem` | Token projected into the pod via the DeploymentRuntimeConfig volume (recommended) |
| Kubernetes Secret | `Secret` | Token managed externally and stored in a Secret |

### 5.1 Option A: Token from a filesystem path (recommended)

Use `tokenConfig.source: Filesystem` to read the token from the projected volume created by the DeploymentRuntimeConfig in Step 3:

```bash
cat > provider-config.yaml << EOF
apiVersion: aws.m.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
  namespace: default
spec:
  credentials:
    source: WebIdentity
    webIdentity:
      roleARN: ${ROLE_ARN}
      tokenConfig:
        source: Filesystem
        fs:
          path: /var/run/secrets/aws-iam-token/token
EOF
```

### 5.2 Option B: Token from a Kubernetes secret

Use `tokenConfig.source: Secret` to read the web identity token from a Kubernetes Secret. This allows each ProviderConfig to use a different token:

```yaml
apiVersion: aws.m.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
  namespace: default
spec:
  credentials:
    source: WebIdentity
    webIdentity:
      roleARN: arn:aws:iam::123456789012:role/my-webidentity-role
      tokenConfig:
        source: Secret
        secretRef:
          key: token
          name: web-identity-token
          namespace: default
```

Create the Secret containing the token:

```bash
kubectl create secret generic web-identity-token \
  --from-literal=token="<your-web-identity-token>" \
  -n default
```

### 5.3 Apply the ProviderConfig

```bash
kubectl apply -f provider-config.yaml
```

:::note
Naming the ProviderConfig `default` applies this authentication method
automatically to all AWS managed resources that don't specify a different
`providerConfigRef`.
:::


## Step 6: Verify the configuration

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

To assume additional roles after the initial OIDC authentication, add an
`assumeRoleChain` to your ProviderConfig. 

The example below shows how to access resources in a different AWS account:

```yaml
apiVersion: aws.m.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: WebIdentity
    webIdentity:
      roleARN: "arn:aws:iam::111122223333:role/my-webidentity-role"
  assumeRoleChain:
    - roleARN: "arn:aws:iam::444455556666:role/my-cross-account-role"
```

The provider first authenticates via WebIdentity, then sequentially assumes each role in the chain. This method is useful for:

- **Cross-account access**: Managing resources in AWS accounts different from the one hosting the EKS cluster
- **Privilege separation**: Using a minimal initial role that escalates to a more permissive role for specific operations

:::note
The target role in the chain must have a trust policy that allows `sts:AssumeRole` from the initial WebIdentity role.
:::


## Optional: Named ProviderConfig for selective authentication

WebIdentity's per-ProviderConfig configuration is its key advantage. Each
ProviderConfig can target a different role and token source without changing the
provider installation or restarting pods.

```yaml
apiVersion: aws.m.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: webidentity-s3-admin
  namespace: default
spec:
  credentials:
    source: WebIdentity
    webIdentity:
      roleARN: arn:aws:iam::123456789012:role/crossplane-s3-admin
      tokenConfig:
        source: Secret
        secretRef:
          key: token
          name: s3-admin-token
          namespace: default
---
apiVersion: aws.m.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: webidentity-ec2-admin
  namespace: default
spec:
  credentials:
    source: WebIdentity
    webIdentity:
      roleARN: arn:aws:iam::123456789012:role/crossplane-ec2-admin
      tokenConfig:
        source: Secret
        secretRef:
          key: token
          name: ec2-admin-token
          namespace: default
```

Reference them in managed resources:

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
    name: webidentity-s3-admin
```


## Optional: Configure multiple provider families

When using multiple AWS provider families (S3, EC2, RDS, etc.), the trust policy must allow each provider's service account to assume the role. Use a broad wildcard:

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

The `upbound-provider-aws-*` wildcard matches service accounts for all provider families (`upbound-provider-aws-s3-<hash>`, `upbound-provider-aws-ec2-<hash>`, `upbound-provider-aws-rds-<hash>`).

Apply the same `runtimeConfigRef` to each provider so the projected token volume is available in all provider pods:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: upbound-provider-aws-ec2
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v2.3.0
  runtimeConfigRef:
    name: webidentity-runtimeconfig
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: upbound-provider-aws-rds
spec:
  package: xpkg.upbound.io/upbound/provider-aws-rds:v2.3.0
  runtimeConfigRef:
    name: webidentity-runtimeconfig
```

:::note
A single DeploymentRuntimeConfig is shared across all provider families. Each provider family reads the role ARN from the shared ProviderConfig.
:::


## Troubleshooting

### Check provider logs

```bash
# Find the provider pod
kubectl get pods -n $CROSSPLANE_NAMESPACE | grep provider-aws

# View logs
kubectl logs -n $CROSSPLANE_NAMESPACE <provider-pod-name> -f
```

### Common issues

| Issue | Solution |
|-------|----------|
| `AccessDenied` when assuming role | Verify the trust policy has the correct OIDC provider ARN and the `sub` condition matches the provider's service account |
| `InvalidIdentityToken` | Confirm the EKS OIDC provider is registered in IAM; check that the OIDC ID in the trust policy matches your cluster |
| `InvalidIdentityToken: Incorrect token audience` | The token doesn't have the `sts.amazonaws.com` audience. Verify the DeploymentRuntimeConfig projects a `serviceAccountToken` with `audience: sts.amazonaws.com` and the Provider has a `runtimeConfigRef` pointing to it |
| `ExpiredTokenException` | The projected service account token has expired; this is usually transient and retries automatically |
| Provider pod not authenticating | Ensure `credentials.source` is set to `WebIdentity` (not `IRSA`, `Secret`, or `Upbound`) |
| Service account name mismatch | Check the actual SA name with `kubectl get sa -n $CROSSPLANE_NAMESPACE` and verify the trust policy wildcard matches it |
| Role chaining `AccessDenied` | Verify the target role's trust policy allows `sts:AssumeRole` from the initial WebIdentity role ARN |
| `tokenConfig` Secret not found | Verify the Secret name, namespace, and key match the `tokenConfig.secretRef` in the ProviderConfig |
| `tokenConfig` Filesystem token not found | Confirm the token file is mounted into the provider pod at the path specified in `tokenConfig.fs.path` |

### Verify the OIDC provider

```bash
# List OIDC providers and find your EKS cluster's provider
aws iam list-open-id-connect-providers

# Get details
aws iam get-open-id-connect-provider \
  --open-id-connect-provider-arn arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/oidc.eks.${AWS_REGION}.amazonaws.com/id/${OIDC_ID}
```

### Verify trust policy

```bash
aws iam get-role --role-name $ROLE_NAME --query "Role.AssumeRolePolicyDocument" --output json
```

Confirm the output contains the correct `Federated` principal and `sub` condition matching your provider's service account.

### Verify the projected service account token

The provider pod must have the `aws-iam-token` projected volume from the DeploymentRuntimeConfig. Confirm it exists:

```bash
# Get a provider pod name
POD_NAME=$(kubectl get pods -n $CROSSPLANE_NAMESPACE -l pkg.crossplane.io/revision -o jsonpath='{.items[0].metadata.name}' 2>/dev/null | grep provider-aws)

# Check for the projected token volume mount
kubectl get pod $POD_NAME -n $CROSSPLANE_NAMESPACE -o jsonpath='{.spec.volumes[*].name}'
```

You should see `aws-iam-token` in the output. If it's missing, verify the Provider has a `runtimeConfigRef` pointing to the DeploymentRuntimeConfig.


## Security best practices

- **No stored credentials** - WebIdentity uses web identity tokens and temporary STS credentials, eliminating long-lived static secrets
- **Use `tokenConfig` over environment variables** - The `tokenConfig` API supersedes the deprecated `AWS_WEB_IDENTITY_TOKEN_FILE` and `AWS_ROLE_ARN` environment variable approach. Always prefer `tokenConfig` for new configurations
- **Use least privilege** - Grant only the permissions the provider needs via IAM policies
- **Scope trust policies narrowly** - Use the most specific `sub` condition that matches your provider service accounts; avoid overly broad wildcards
- **Leverage multiple ProviderConfigs** - Use WebIdentity's per-ProviderConfig role and token targeting to implement fine-grained access control like separate roles and tokens for S3, EC2, and RDS operations
- **Audit role assumptions** - Enable AWS CloudTrail to log all `AssumeRoleWithWebIdentity` calls for this role
- **Prefer WebIdentity or IRSA over Access Keys** - When running on EKS, both OIDC-based methods are more secure than storing access keys as Kubernetes secrets
<!-- vale gitlab.SubstitutionWarning = YES -->
<!-- vale write-good.Passive = YES -->
