---
title: Exposing Spaces externally
sidebar_position: 5
description: Options for exposing Spaces externally
draft: true
---

import { CodeBlock } from '@site/src/components/GlobalLanguageSelector';


You can expose Spaces externally using of three options:

| Option | When to use |
|--------|-------------|
| LoadBalancer Service | Simplest setup, recommended for most deployments |
| Gateway API | Organization already using Gateway API, or need shared gateway across services |
| Ingress | Organization already using Ingress, or need shared load balancer across services |
<!-- vale Google.Headings = NO -->
## LoadBalancer Service
<!-- vale Google.Headings = YES -->

Upbound recommends a LoadBalancer Service to expose `spaces-router`.


:::important
Use a Network Load Balancer (L4), not an Application Load Balancer (L7). Spaces
uses long-lived connections for watch traffic that L7 load balancers may
timeout.
:::

### Configuration
<!-- vale gitlab.Uppercase = NO -->
```yaml
externalTLS:
  host: proxy.example.com  # Externally routable hostname for TLS certificates

router:
  proxy:
    service:
      type: LoadBalancer
      annotations:
        # AWS NLB (see Cloud-Specific Annotations for other clouds)
        service.beta.kubernetes.io/aws-load-balancer-type: external
        service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
        service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: ip
```

See [Cloud-Specific Annotations](#cloud-specific-annotations) for GCP and Azure.

<!-- vale Google.Headings = NO -->
### Get the LoadBalancer address
<!-- vale Google.Headings = YES -->

After installation:

```bash
kubectl get svc -n upbound-system spaces-router \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

Create or update a DNS record pointing your `externalTLS.host` to this address.

## Ingress

Use Ingress if you need to share a load balancer across multiple services or
have specific networking requirements.

### Requirements

- TLS passthrough support in your Ingress controller
- Network Load Balancer (L4) strongly recommended for long-lived connections
<!-- vale gitlab.Uppercase = NO -->
Configure your Ingress controller's Service with [NLB annotations](#cloud-specific-annotations).
<!-- vale gitlab.Uppercase = YES -->

### Configuration

```yaml
ingress:
  provision: true
  host: proxy.example.com
  ingressClassName: "<your-ingress-class>"
  # Annotations to add to the Ingress resource
  annotations: {}
  # Pod labels of the Ingress controller - used for network policy
  podLabels: {}
  # Namespace labels of the Ingress controller - used for network policy
  namespaceLabels: {}
```

### Traefik (with nginx provider)

Traefik can use the [kubernetesIngressNGINX provider][traefik-provider] to
handle nginx-style Ingress resources with TLS passthrough.

```yaml
ingress:
  provision: true
  host: proxy.example.com
  ingressClassName: nginx
  annotations:
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
  podLabels:
    app.kubernetes.io/name: traefik
  namespaceLabels:
    kubernetes.io/metadata.name: traefik
```

## Gateway API

Spaces supports the [Gateway API][gateway-api-docs]. Use this option if your
organization is already using Gateway API or needs a shared gateway across
multiple services.

### Requirements

- A Gateway API controller (for example, Envoy Gateway, Cilium, or Traefik)
- Gateway API CRDs installed in your cluster
- TLS passthrough support
- Network Load Balancer (L4) strongly recommended

## Cloud-specific annotations

Network Load Balancers (L4) are strongly recommended. Spaces uses long-lived
watch connections (hours or days) for kubectl and ArgoCD. L7 load balancers may
timeout these connections. Use these annotations on the LoadBalancer Service
(spaces-router, Ingress controller, or Gateway).

| Cloud | Annotations |
|-------|-------------|
| **AWS** | `service.beta.kubernetes.io/aws-load-balancer-type: external`<br/>`service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing`<br/>`service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: ip` |
| **GCP** | `cloud.google.com/l4-rbs: enabled` |
| **Azure** | None required (L4 by default) |
<!-- vale gitlab.Uppercase = YES -->

[traefik-provider]: https://doc.traefik.io/traefik/reference/install-configuration/providers/kubernetes/kubernetes-ingress-nginx/
[gateway-api-docs]: https://gateway-api.sigs.k8s.io/
