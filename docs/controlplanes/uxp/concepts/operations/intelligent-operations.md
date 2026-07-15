---
title: Intelligent Operations
sidebar_position: 5
description: Embed AI intelligence in the Operation execution flow.
---

Upbound control planes combine deterministic control (like reconciliation and
policy) with intelligent control (driven by embedded AI agents). Bring
intelligence into the execution flow of your Operations with AI-embedded
operation functions.

AI-embedded operation functions are standard [functions][functions] designed to
integrate with popular Large Language Model providers, such as from OpenAI and
Anthropic. You can supplement existing function pipelines with these AI-embedded
functions. 

## Example AI-embedded function

<!-- vale write-good.Passive = NO -->
Operation functions are a fundamental unit of work in a control plane. Here's an
example of an Operation that uses a function to determine why a set of pods are
stuck in a `CrashLoopBackoff`:
<!-- vale write-good.Passive = YES -->

```yaml
apiVersion: ops.crossplane.io/v1alpha1
kind: WatchOperation
metadata:
  name: analyze-events-for-pod-distress
spec:
  watch:
    apiVersion: v1
    kind: Event
    namespace: crossplane-system
  # Make sure we are only creating 1 operation at a time.
  concurrencyPolicy: Forbid
  successfulHistoryLimit: 2
  failedHistoryLimit: 1
  operationTemplate:
    spec:
      mode: Pipeline
      pipeline:
      # Needed to help reduce noise funneling to claude.
      - step: filter-noisy-events
        functionRef:
          name: function-event-filter
        input:
          apiVersion: filter.event.fn.upbound.io/v1alpha1
          kind: Input
          type: Warning
      # Needed to not overly call claude if we already have an analysis.
      - step: analysis-gate
        functionRef:
          name: function-analysis-gate
        input:
          apiVersion: gate.analysis.fn.upbound.io/v1alpha1
          kind: Input
      # Let's see what's going on.
      - step: analyze
        functionRef:
          name: function-claude
        input:
          apiVersion: claude.fn.upbound.io/v1alpha1
          kind: Prompt
          systemPrompt: |
            You are a Kubernetes infrastructure monitoring expert tasked with analyzing 
            pod logs and events to identify potential deployment issues.
            
            You will receive an event that includes an involvedObject that will
            include the namespace and name of the pod to examine.
          userPrompt: |
            You should use the tools available to you to look up events and logs related
            to the pod to identify what's wrong.

            REQUIRED OUTPUT FORMAT:
            { 
              "apiVersion": "ops.upbound.io/v1alpha1",
              "kind": "Analysis",
              "metadata": {
                "name": <the name of the pod>,
            	  "namespace": <the namespace of the pod>
              },
              "spec": {
                "involvedObjectRef: {
                  "kind": "Pod",
                  "apiVersion": "v1",
                  "namespace": <the namespace of the pod>,
                  "name": <the name of the pod>,
                  "uid": <the uid of the pod>
                },
                "analysis": "<`The analysis of the issues with the pod.`>",
                "remediations": [
                  {
                    "name": "<A name for the remediation that is unique to the remediations array. The name must be alphanumeric and must be no longer than 10 characters.>", 
                    "description": "< a short description for the remediation steps that will follow>",
                    "steps": [
                      {
                        "name": "<a unique name for the step>",
                		    "instruction": "<The instruction for this step>"
                      }
                    ]
                  }
                ]
              }
            }

            You can suggest multiple remediation strategies. Each array item in the 
            "remediations" array above will correspond to a strategy. Each strategy must 
            have a short description and a set of steps to fix the identified issue.

            Begin analysis now using the available tools.

            Event Spec:
            {{ .Resources }}
        credentials:
        - name: claude
          source: Secret
          secretRef:
            namespace: crossplane-system
            name: claude
```

The `WatchOperation` above uses `function-claude` to look up events and logs
related to the pod to identify what's wrong. It outputs a
remediation strategy to fix the issue for the said pod.

## Official AI-embedded function

Upbound offers Official Functions that have AI capabilities and are
suitable for composition:

- [function-claude][functionClaude]
- [function-openai][functionOpenAi]
- [function-claude-status-transformer][functionStatusTransformer]
- [function-pod-analyzer][functionPodAnalyzer]

[functions]: /manuals/uxp/concepts/packages/functions
[functionClaude]: https://marketplace.upbound.io/
[functionOpenAi]: https://marketplace.upbound.io/
[functionStatusTransformer]: https://marketplace.upbound.io/
[functionPodAnalyzer]: https://marketplace.upbound.io/
