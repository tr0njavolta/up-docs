# Documentation Templates

These are the canonical templates from `/templates/` in the up-docs repo.
Use them as the structural starting point. Fill in `{placeholder}` content from what the user provides.

---

## Concept template

```markdown
---
title: {Title in sentence case}
weight: {number}
---

{Opening paragraph: what is this concept, why it matters, what this doc covers.}

{Concept name} is {definition}. {Optional: key attributes as a brief list.}

{Optional: add a diagram or architecture image here.}

## Background

{Optional: context, history, or motivation — why was this designed this way?}

## Use cases

{How does the reader benefit from understanding this concept? What does it enable?}

- Use case 1
- Use case 2

## {Optional: Comparison of alternatives}

{Table or prose comparing options when there are meaningful tradeoffs.}

## Related resources

If you'd like to dive deeper or start using {concept}, see:

**How-to guides**
- [Link text](./path.md)

**Related concepts**
- [Link text](./path.md)
```

---

## How-to template

```markdown
---
title: {Title: verb phrase, sentence case — "Configure a control plane"}
weight: {number}
---

This guide explains how to {brief description of task}.

{Optional: when and why you'd do this.}

## Prerequisites

Before you {task}, ensure:

- Prerequisite 1
- Prerequisite 2

## {Task name — verb phrase}

{Optional: brief context if not obvious from title.}

1. {Step. Start with a verb.}

   {Explanatory text.}

   ```yaml
   # Code sample
   ```

   {Optional: what the successful result looks like.}

2. {Step.}

   2.1. {Substep}

   2.2. {Substep}

## See also

- [{Related guide}](./path.md)
- [{Related concept}](./path.md)
```

---

## Tutorial template

```markdown
---
title: {Title describing what you'll build or achieve}
weight: {number}
---

In this tutorial, you'll {main task}. This tutorial is intended for {audience} who have basic knowledge of:

- {Concept 1}
- {Concept 2}

By the end of this tutorial, you'll be able to:

- {Learning objective 1}
- {Learning objective 2}

## Background

{Optional: product context, what problem this solves, why this approach.}

## Before you start

Before starting, ensure you have:

- {Prerequisite 1}
- {Prerequisite 2}

## {Task name}

To get started, {first action}.

1. {Step. Start with a verb.}

   {Explanatory text.}

   ```yaml
   # Code sample
   ```

2. {Step.}

   a. {Substep}

   b. {Substep}

## Summary

In this tutorial, you learned how to:

- {Summary point 1}
- {Summary point 2}

## Next steps

- [{Related tutorial or guide}](./path.md)
- [{Related tutorial or guide}](./path.md)
```

---

## Troubleshooting template

```markdown
---
title: Troubleshoot {product or feature}
weight: {number}
---

This guide covers common issues with {product or feature} and how to resolve them.

## {Symptom — describe what the user observes, e.g., error message text}

### Cause

{What causes this symptom.}

### Solution

{Steps to fix it. Use an ordered list if multi-step.}

1. Step
2. Step

{What a successful resolution looks like.}

### For more information

- [Related guide](./path.md)
```

---

## Release notes entry format

Release notes are entries prepended into `docs/reference/release-notes/spaces.md` — NOT separate files. Each entry follows this format:

```markdown
## vX.Y.Z

### Release Date: YYYY-MM-DD

#### Breaking Changes

:::important
- **Field or behavior name**: what changed and what the user must do before upgrading.
:::

#### Features

**Feature name:**

1-2 sentences on what it does and why it matters. Link to full doc if one exists.

#### Bug fixes

- **Short label**: what was broken and what was fixed.

#### Upgrade notes

Any steps or constraints for upgrading from the previous version.
```

The file has `<!-- vale off -->` at the top — all entries inherit Vale suppression. Only include sections that have content.
