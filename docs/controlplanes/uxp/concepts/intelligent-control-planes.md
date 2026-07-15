---
title: AI-powered Intelligent Control Planes
description: "Learn how to use the AI-powered Intelligent Control Planes in UXP"
sidebar_position: 1
---

<!-- vale gitlab.SentenceLength = NO -->
Upbound Crossplane supports running **Intelligent Control Planes**, which are a
class of [composition functions][intelligent-compositions] and [operation
functions][intelligent-operations] that bring LLM-driven logic into your control
plane's reconcile loop.
<!-- vale gitlab.SentenceLength = YES -->

<!-- vale alex.Condescending = NO -->
Intelligent Control Planes extend the traditional `observe → compare → act` pattern
to `observe → analyze → act → adapt` cycles that incorporate AI-driven reasoning
capabilities. The analyze phase introduces decision making that can balance
competing objectives, understand business context, and optimize based on complex
<!-- vale write-good.Weasel = NO -->
<!-- vale Microsoft.Adverbs = NO -->
patterns that deterministic logic can't easily capture. The adapt phase enables
<!-- vale Microsoft.Adverbs = YES -->
<!-- vale write-good.Weasel = YES -->
learning from operational outcomes to improve future decision-making processes.
<!-- vale alex.Condescending = YES -->


## Intelligent compositions

When you incorporate a [composition function][intelligent-compositions] having
AI intelligence to a composition pipeline, it's considered an _intelligent
composition_. Some examples of these functions are:

- [function-claude][function-claude]
- [function-openai][function-openai]

<!-- vale write-good.Passive = NO -->
These functions pass pipeline context to a Large Language Model like Claude.
They use user-specified prompts to guide Claude in configuring function pipeline
resources. [MCP servers][mcp-servers] are packaged as [Add-Ons][add-ons] and
install on your control plane. They deliver tools that the language model can
use. 
<!-- vale write-good.Passive = YES -->

## Intelligent operations

When you incorporate an [operation function][intelligent-operations] having AI
intelligence to an operation pipeline, it's considered an _intelligent
operation_. Some examples of these functions are:

- [function-claude-status-transformer][function-ai-status-transformer]
<!-- - [function-pod-analyzer][function-pod-analyzer] -->

## Model Context Protocol (MCP) Servers

Model Context Protocol (MCP) is an open standard for connecting LLMs to systems
where data lives. Upbound Crossplane supports the installation of MCP servers,
packaged as [Add-Ons][add-ons]. Some examples are:

- [controlplane-mcp-server][controlplane-mcp-server]
- [marketplace-mcp-server][marketplace-mcp-server]

Learn about how to package an MCP server into an Add-On in the [concept][add-on-concept] documentation.

## Next steps

Learn about example use cases of Intelligent Control Planes by [reading the guides][intelligent-control-planes-guides]

[function-ai-status-transformer]: https://marketplace.upbound.io/functions/upbound/function-claude-status-transformer/v0.1.0

[intelligent-compositions]: /manuals/uxp/concepts/composition/intelligent-compositions
[intelligent-operations]: /manuals/uxp/concepts/operations/intelligent-operations
[mcp-servers]: #model-context-protocol-mcp-servers
[add-ons]: /manuals/uxp/concepts/add-ons
[add-on-concept]: /manuals/uxp/concepts/packages/add-ons
[intelligent-control-planes-guides]: /guides/intelligent-control-planes/scale-database
[function-claude]: https://marketplace.upbound.io/functions/upbound/function-claude
[function-openai]: https://marketplace.upbound.io/functions/upbound/function-openai
[function-claude-status-transformer]: https://marketplace.upbound.io/functions/upbound/function-claude-status-transformer
[controlplane-mcp-server]: https://marketplace.upbound.io/addons/upbound/addon-controlplane-mcp-server
[marketplace-mcp-server]: https://marketplace.upbound.io/addons/upbound/addon-marketplace-mcp-server
