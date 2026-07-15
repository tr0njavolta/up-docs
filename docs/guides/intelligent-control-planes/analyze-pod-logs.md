---
title: Analyze pod crashes
---

:::important

This guide requires an Upbound control plane instance running UXP v2.0 or later.
Upbound SaaS coming soon.

:::

<!-- vale gitlab.Uppercase = NO -->
<!-- vale Upbound.Spelling = NO -->
<!-- ignore LLM -->
[Upbound Crossplane][upbound-crossplane] is capable of running [Intelligent
Control Planes][intelligent-controllers], which define AI-augmented functions to
perform tasks.

<!-- vale gitlab.FutureTense = NO -->
In this guide, you'll use AI to analyze and remediate common app deployment
issues like out-of-memory errors and `crashloopbackoff`
<!-- vale gitlab.FutureTense = YES -->

This guide walks through 

<!-- vale gitlab.Uppercase = YES -->
<!-- vale Upbound.Spelling = YES -->
## Prerequisites

Before you begin make sure you have:

* An Upbound Account
* The `up` CLI installed
* An Anthropic API key
* An AWS account

## Set up your environment

Clone the repository [upbound/configuration-deployment-analysis][guide-repo] to your machine:

```shell
git clone git@github.com:upbound/configuration-deployment-analysis.git
```

This repository contains a [control plane project][project] that defines [watch operations][watch-operations]. These watch operations define workflows for:
<!-- vale write-good.Passive = NO -->
- watching for events emitted by pods in a cluster
- analyzing them using LLMs and suggesting remediations
- the remediations are gated by a human-in-the-loop approval
- if the suggested remediation is approved, it gets applied to address the issues
<!-- vale write-good.Passive = YES -->

## Configure credentials and runtime settings

In the project directory, edit the `operations/init-operation/operation.yaml` and update the function's `input.spec.anthropicApiKey` to provide an API key from Anthropic. This operation runs whenever you launch the control plane and configures all the required runtime settings.

## Launch the local UXP cluster

In the root of the project directory, launch the control plane locally:

```shell
up project run --local
```
<!-- vale Google.WordList = NO -->
Apply a _ClusterRole_ to grant Crossplane admin access after creating the control
plane. This object is already defined in the `examples` folder of the project
directory:
<!-- vale Google.WordList = YES -->

```shell
kubectl apply -f examples/admin.yaml
```

## Apply example deployments and watch for issues

<!-- vale Upbound.Spelling = NO -->
<!-- vale write-good.TooWordy = NO -->
Apply the examples to demonstrate flows for catching and remediating out-of-memory and _crashloopbackoff_ issues:
<!-- vale Upbound.Spelling = YES -->
<!-- vale write-good.TooWordy = YES -->

```shell
kubectl apply -f examples/oomkilled.yaml -f crashloopbackoff.yaml
```

These workloads intentionally cause the deployed pods to exhibit respective errors.

## Observe analyses and remediations

The operation function pipeline creates _Analysis_ and _Remediation_ resources
based on observed behaviors. Fetch an analysis object to observe suggestions for
remediation made by the LLM:

```shell
kubectl get Analysis -n crossplane-system
kubectl describe Analysis -n crossplane-system <your-analysis-object>
```

## Clean up

Clean up the local control plane to prevent it from continuing to invoke your LLM. Run the following command:

```shell
up project stop
```

## Next steps

Read the concept documentation for [Intelligent Control Planes][intelligent-controllers] to learn more about using AI-powered functions in your function pipelines.

[upbound-crossplane]: /manuals/uxp/overview
[watch-operations]: /manuals/uxp/concepts/operations/watch-operation
[intelligent-controllers]: /manuals/uxp/concepts/intelligent-control-planes/
[guide-repo]: https://github.com/upbound/configuration-deployment-analysis
[project]: /manuals/cli/concepts/projects
[intelligent-composition]: /manuals/uxp/concepts/composition/intelligent-compositions
