---
title: Usage Metering
description: "Learn how UXP does metering and usage"
sidebar_position: 3
---

Upbound Crossplane includes a usage metering system to track resource
consumption and operations over time. Usage metering begins when you apply a
license.

## How usage works

<!-- vale write-good.Passive = NO -->
<!-- vale gitlab.SentenceLength = NO -->
<!-- vale gitlab.UnclearAntecedent = NO -->
Usage in Upbound Crossplane is measured on two units:

- **Resources** are continuously tracked and reconciled by the control plane, whether they exist inside the cluster or in external systems such as cloud services. Resources are created, updated, and maintained through compositions and providers to stay aligned with the declared desired state. Resources are measured in resource-hours to account for both breadth and duration.
- **Operations** are automation tasks initiated by the control plane to observe, analyze, or change infrastructure or applications beyond standard reconciliation. These include diagnostics, remediation, scheduling, rollouts, optimization, and custom automation tasks driven by agents or functions. 

### Resources

_Resource_ represents any discrete infrastructure or application resource
actively managed by the control plane. This includes external cloud
infrastructure such as databases, IAM roles, and storage buckets, as well as
in-cluster objects like Deployments, Ingress, and Services.

A resource is considered "controlled" when it's declared through a composition
or directly instantiated by a Crossplane provider, and is being continuously
reconciled to match its desired state. This ongoing reconciliation ensures the
resource stays compliant, functional, and aligned with its declared
specification. 

Whether a resource was provisioned via a Crossplane composition, dynamically
created by a provider, or derived from a pipeline run, its lifecycle is
maintained by the control plane. Resources are metered in resource-hours to
account for both breadth and duration. 

### Operations

<!-- vale alex.Condescending = NO -->
<!-- vale gitlab.Uppercase = NO -->
_Operations_ represent discrete units of intelligent automation and
orchestration executed by the control plane. These are distinct from the
continuous reconciliation that underpins _Resources_. An operation may involve
one-time or recurring tasks that go beyond simple state enforcement. Examples
include analyzing logs for anomalies, rolling out software updates in a phased
manner, running LLM-powered decision-making, or optimizing infrastructure based
on real-time telemetry. 
<!-- vale alex.Condescending = YES -->
<!-- vale gitlab.Uppercase = YES -->

Operations can be triggered by scheduled intervals, events, or intelligent
agents, and often encapsulate complex workflows or side effects that span
internal and external systems. Their purpose is to extend the power of the
control plane from passive reconciliation to proactive management, including
diagnosis, remediation, optimization, and change orchestration.

<!-- vale write-good.Weasel = NO -->
Operations are counted on a per-invocation basis, regardless of how many
resources they impact.
<!-- vale write-good.Weasel = YES --> 
Each `kind: Operation`  invocation counts as an operation
from a metering standpoint.
<!-- vale write-good.Passive = YES -->
<!-- vale gitlab.SentenceLength = YES -->
<!-- vale gitlab.UnclearAntecedent = YES -->

## How metering works


When UXP has a valid commercial license, a system local to the cluster is
responsible for tracking the consumption of resources and operations over time.
The system works by periodically counting resources and operations and storing
these records as historical data. You can see current usage for an Upbound
Crossplane cluster by viewing your license's `.status.usage` field.


<!-- vale write-good.Passive = NO -->
[UXP licenses][license-management] are capacity-based, meaning they define a
maximum number of resource-hours and operations respectively. These values are
encoded in the license.
<!-- vale write-good.Passive = YES --> You can see your license's capacity limit by viewing
your license's `.status.capacity` field.

[license-management]: /manuals/uxp/howtos/license-management
