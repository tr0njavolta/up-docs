---
title: Intelligent Compositions
sidebar_position: 4
description: Embed AI intelligence in the composition reconcile loop.
---

Upbound control planes combine deterministic control (like reconciliation and
policy) with intelligent control (driven by embedded AI agents). Bring
intelligence into the control loop of your compositions with AI-embedded
compositions functions.

AI-embedded composition functions are standard [functions][functions] designed
to integrate with popular Large Language Model providers, such as from OpenAI
and Anthropic. You can supplement existing function pipelines with
these AI-embedded functions. 

## Example AI-embedded function

Composition functions are fundamental units of work in a control plane. The example below shows a composition that uses a function to augment resource status based on child resource state and emitted events:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xnetworks.example.upbound.io
spec:
  compositeTypeRef:
    apiVersion: example.upbound.io/v1alpha1
    kind: XNetwork
  mode: Pipeline
  pipeline:
  - functionRef:
      name: compose-resources
    step: compose-resources
  - functionRef:
      name: upbound-function-claude-status-transformer
    input:
      apiVersion: function-claude-status-transformer.fn.crossplane.io/v1beta1
      kind: StatusTransformation
      additionalContext: ""
    step: upbound-function-claude-status-transformer
    credentials:
    - name: claude
      source: Secret
      secretRef:
        namespace: crossplane-system
        name: api-key-anthropic
```
<!-- vale gitlab.Uppercase = NO -->
When you create an `XNetwork` object, your control plane uses the provided API key
to call Claude, an LLM offered by Anthropic, to:
<!-- vale gitlab.Uppercase = YES -->

- analyze the config and status of each composed resource
- make a determination why each resource isn't ready, if it's not
- provide a root cause summary in the status of the XNetwork object and suggest remedial actions

## Official AI-embedded function

Upbound offers AI-enabled functions available for composition:
- [function-claude][functionClaude]
- [function-openai][functionOpenAi]
- [function-claude-status-transformer][functionStatusTransformer]

[functions]: /manuals/uxp/concepts/packages/functions
[functionClaude]:https://marketplace.upbound.io/functions/upbound/function-claude/latest
[functionOpenAi]:https://marketplace.upbound.io/functions/upbound/function-openai/latest
[functionStatusTransformer]:https://marketplace.upbound.io/functions/upbound/function-claude-status-transformer/latest
