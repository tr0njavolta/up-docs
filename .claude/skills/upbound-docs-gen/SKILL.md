---
name: upbound-docs-gen
description: >
  Generates documentation for Upbound Spaces and UXP products following Upbound's established
  style, voice, templates, and formatting standards. Use this skill whenever a user is:
  - Writing new docs for a Spaces or UXP feature, concept, or workflow
  - Asking for help drafting or structuring any documentation that will live in up-docs
  - Describing a new feature, behavior change, or API surface and wanting to turn it into a doc
  - Asking "how should I document X" or "write a doc for X" in the context of Upbound products
  - Working on release notes, how-to guides, tutorials, concept docs, or troubleshooting content
  This skill should trigger broadly — if the user is writing any kind of Upbound or Crossplane
  documentation, even if they don't say "docs" explicitly, use this skill.
---

# Upbound Documentation Generator

You help engineers and product managers write documentation for Upbound's Spaces and UXP products. Your output should be ready for human review — correct structure, compliant style, and real content filled in wherever possible based on what the user tells you.

## Step 1: Understand what you're writing

Ask the user for enough context to write well. You don't need to be exhaustive — 2-3 targeted questions is better than a lengthy interview. The key things to nail down:

1. **What type of doc is this?** (concept, how-to, tutorial, troubleshooting, release notes, reference)
2. **What product and feature does it cover?** (Cloud Spaces, Self-Hosted Spaces, UXP, a specific CRD/API, CLI command, etc.)
3. **Who is the reader?** (platform engineer, developer, operator, admin — and their assumed knowledge level)
4. **What does the user already have?** (PR description, design doc, notes, a rough draft, just an idea)

If the user gives you rich context upfront (e.g., pastes a PR description or feature spec), skip the questions you can answer from that context.

## Step 2: Research the repo before drafting

This is the most important step. Before writing anything, search the repo for related existing content. The docs repo is at `/Users/rae/up-docs`.

**Why this matters:** The repo has rich, detailed docs for many features. If you skip this step, you'll produce a shallow stub that misses depth, structure, repo-specific components, and conventions that real docs in this codebase use.

**What to look for:**

1. **Does a doc already exist for this topic?** Search for the feature name across `docs/`, `cloud-spaces-docs/`, and `self-hosted-spaces-docs/`. If a doc exists and the user is adding to it or updating it, your output should be a diff/addition to that file — not a new file.

2. **Are there closely related docs that set depth expectations?** If someone asks you to document "auto-upgrade for control planes," find the existing auto-upgrade doc and match its depth — number of channels covered, YAML examples, version support tables, kubectl output examples, etc.

3. **What React components does this section use?** Browse nearby docs for imports and custom components. Common ones:
   - `<EnterpriseFeature />` or `<StandardPlanFeature />` — plan-gating callouts at the top of the page
   - `<Tabs>` / `<TabItem>` — multi-variant examples
   - `<PartialExample />` — shared content blocks

4. **What's the sidebar weight convention in this directory?** Check neighboring files to pick a reasonable `weight`.

Only after doing this research should you start writing.

### Reading the engineering repo (optional but high-value)

If the user provides a path to an engineering repo, a branch name, or a PR — and you have read access to it — run a targeted diff against main before drafting. This is the most reliable way to get complete, accurate field names, enum values, and defaults without relying on what the engineer remembered to mention.

**When to do this:** The user says something like "here's the PR", "it's on branch `feat/shared-secret-store`", "the repo is at `~/upbound/spaces`", or pastes a link to a GitHub PR.

**What to extract:**

1. **CRD/API changes** — run `git diff main...HEAD -- '*.yaml' '*.go'` (or the branch name they give you) in the engineering repo. Look for:
   - New fields added to CRD specs (`spec.versions[].schema.openAPIV3Schema`)
   - `enum:` lists — these are the complete set of valid values
   - `default:` values — always document these explicitly
   - `required:` arrays — these fields must appear in every example
   - `description:` strings on fields — often the clearest source of what a field does

2. **Go type definitions** — if CRD YAML isn't present, search for the relevant Go struct. `+kubebuilder:validation:Enum` markers are authoritative for valid values. `// +optional` marks optional fields.

3. **What NOT to use from the engineering repo:**
   - Internal implementation details, algorithm logic, or architecture decisions — document the external behavior, not the internals
   - Draft/WIP comments or TODO annotations — these aren't user-facing
   - Test fixtures or example files that contradict the schema

**How to apply it:** Use the extracted values to fill in your YAML examples, options tables, and any version or constraint notes. If the diff shows 4 enum values but the user only mentioned 2, include all 4 and note the source. If you find a `default:` value, call it out explicitly in prose ("defaults to `Stable` if not set").

If you don't have access to the engineering repo (no path given, no branch, no access), skip this section and note at the end of your draft that field completeness was based on user description only.

## Step 3: Choose the right template

Read `references/templates.md` for the full template bodies. Choose based on the user's intent:

| Doc type | Use when | Template |
|---|---|---|
| **Concept** | Explaining what something is, how it works, when to use it | concept |
| **How-to** | Task-oriented: "how to configure X", "how to enable Y" | howto |
| **Tutorial** | Learning-oriented: end-to-end walkthrough with a goal | tutorial |
| **Troubleshooting** | Symptom → cause → solution for known problems | troubleshooting |
| **Release notes** | New version, what changed | See release notes section below |

When the user isn't sure, ask. Or make a judgment call and tell them — it's easier for them to react to a choice than to make one from scratch.

## Step 4: Write the doc

### Frontmatter

Every doc needs frontmatter. Include at minimum:

```yaml
---
title: Title of the doc (sentence case)
weight: <number — check neighboring files for convention>
---
```

Add `description` for pages likely to appear in search results. Add `sidebar_label` if the title is long.

### Voice and style

Read `references/style-guide.md` for the complete rules. The most important ones:

- **Active voice.** "Upbound deploys the control plane" not "the control plane is deployed"
- **Present tense.** "Spaces uses" not "Spaces will use"
- **Sentence-case headings.** "Configure a control plane" not "Configure a Control Plane"
- **Direct, second person.** "You create a control plane" or "Create a control plane"
- **No jargon softeners.** Don't write "simply", "easily", "just", or "obviously"
- **Short sentences.** Aim for under 25 words per sentence
- **No Latin.** Write "for example" not "e.g.", "that is" not "i.e."
- **Code formatting.** Kubernetes resource kinds in `UpperCamelCase`; object names in `kebab-case`; use inline backticks for file paths, commands, and field names
- **Contractions are fine.** "Don't" is better than "do not" in most contexts

### AI writing patterns to avoid

Technical docs are especially prone to AI-sounding language. Actively scan your draft for these before presenting it.

**Banned AI vocabulary** — these words appear disproportionately in AI-generated text. Replace them with plain alternatives:

| Avoid | Use instead |
|---|---|
| additionally | also, and, next |
| align with | match, follow, work with |
| crucial / pivotal / key (adj) | important, required, critical |
| delve | look at, explore, examine |
| enhance / enhancing | improve, increase, add |
| foster / fostering | build, grow, support |
| highlight (verb) | show, call out, note |
| intricate / intricacies | complex, the details |
| landscape (abstract) | environment, ecosystem, area |
| showcase | show, demonstrate |
| tapestry | (delete — never use abstractly) |
| testament | proof, evidence |
| underscore (verb) | show, confirm |
| vibrant / robust | (delete — use specific facts) |

**Inflated significance** — don't puff up importance. Say what something does, not what it represents.

- Bad: "This marks a pivotal moment in how teams manage infrastructure at scale."
- Good: "This lets teams provision clusters without writing AWS CloudFormation."

**Copula avoidance** — use `is`/`are`/`has`. Don't dress up simple facts.

- Bad: "Spaces serves as the platform for running managed control planes."
- Good: "Spaces is the platform for running managed control planes."

**Promotional language** — docs aren't marketing copy. Remove: `boasts`, `groundbreaking`, `powerful`, `seamless`, `intuitive`, `nestled`, `rich` (figurative), `breathtaking`, `stunning`.

**Superficial -ing phrases** — watch for present participles tacked on to fake depth: "...ensuring that teams can...", "...highlighting the importance of...", "...reflecting the platform's commitment to...". Delete them or make the point directly.

**Em dash overuse** — use em dashes sparingly. Two per page is plenty. Commas and periods usually work better.

**Filler phrases** — delete on sight:
- "In order to" → "To"
- "It is important to note that" → (delete — just say the thing)
- "Due to the fact that" → "Because"
- "Has the ability to" → "Can"
- "At this point in time" → "Now"

**Chatbot artifacts** — never leave these in a draft:
- "I hope this helps"
- "Here is a draft of..."
- "Let me know if you'd like me to expand on any section"
- "Great question!"
- "Certainly!"

**Generic positive conclusions** — don't end docs with vague optimism. End with a specific next step or link.

- Bad: "The future looks bright as teams continue their journey toward cloud-native excellence."
- Good: "See [upgrade channels](./auto-upgrade.md) for the next step."

**Rule of three** — don't force ideas into groups of three. "EKS provisioning, RDS databases, and networking" is fine when there are genuinely three things. Don't manufacture a third item to complete a pattern.

**Inline-header bullet lists** — avoid bolded labels followed by colons in every list item. Either use a table or write prose.

- Bad: `- **Performance:** Optimized for low latency.`
- Good: Use a table, or fold it into a sentence.

### Depth and completeness

Match the depth of surrounding docs. A good doc for a configurable feature typically includes:

- All valid values/options, not just the ones mentioned in the user's prompt
- At least one complete YAML example showing the full relevant spec (not just the field being changed)
- Expected output or verification steps (for example, `kubectl get ctp` output showing what success looks like)
- Edge cases or warnings relevant to specific options
- Links to related reference docs (CRD reference, CLI reference, version support tables)

If the user gave you partial information (for example, only two of four channels), note what's missing and ask, or flag it as a placeholder.

### Procedural steps

How-to docs and tutorials must use numbered steps for any sequence of actions the reader performs. Don't replace numbered steps with prose paragraphs followed by code blocks — even if you find existing docs in the repo that do this. Numbered steps are the correct pattern and existing docs are being updated to match.

Each step should start with a verb and stand alone as an instruction. Supporting explanation, code examples, and expected output go indented under the step:

```markdown
1. Create a `ControlPlane` manifest.

   ```yaml
   # example yaml
   ```

2. Apply the manifest to your cluster.

   ```shell
   kubectl apply -f control-plane.yaml
   ```

   The control plane appears with `READY: True` within a few minutes.
```

### Formatting conventions

**Admonitions** — use sparingly for truly important information:
```
:::tip
Helpful but optional information.
:::

:::warning
Something that could cause data loss or unexpected behavior.
:::

:::info
Neutral contextual information.
:::

:::danger
Action that can't be undone.
:::
```

**Tabs** — use for content that varies by environment, provider, or approach:
```mdx
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="helm" label="Helm">
...content...
</TabItem>
<TabItem value="cli" label="CLI">
...content...
</TabItem>
</Tabs>
```

**Code blocks** — always specify the language. Use `shell` for terminal commands, `yaml` for YAML, `bash` for scripts.

**Internal links** — use Docusaurus relative syntax:
```markdown
[link text](./path/to/file.md)
```

**Images** — reference from `/static/images/`:
```markdown
![Alt text describing image](/images/path/to/image.png)
```

### Product context

Read `references/product-context.md` for the full glossary and product structure. Key terms to get right:

- **Spaces** — the platform for running managed control planes. Can be Cloud Spaces (Upbound-hosted) or Self-Hosted Spaces (customer-hosted)
- **UXP** — Upbound Crossplane, the enterprise Crossplane distribution
- **Control plane** — a fully isolated Crossplane instance. Referred to as "control plane" in prose (not MCP, not CTP)
- **Kubernetes resource kinds** — always `UpperCamelCase` (for example, `ControlPlane`, `SharedSecretStore`)
- Do not abbreviate Kubernetes as "k8s" in docs

### Release notes format

Release notes live in a **single file** at `docs/reference/release-notes/spaces.md`. New versions are prepended at the top (after the frontmatter). Do not create a separate file per version.

The file starts with `<!-- vale off -->` — all release note entries inherit this. The format for each version entry:

```markdown
## vX.Y.Z

### Release Date: YYYY-MM-DD

#### Breaking Changes

:::important
- **Field or behavior name**: what changed and what the user must do before upgrading.
:::

#### Features

**Feature name:**

1-2 sentences on what it does and why it matters. Link to the full doc if one exists.

#### Bug fixes

- **Short label**: what was broken and what was fixed.

#### Upgrade notes

Any steps or constraints for upgrading from the previous version.
```

Notes:
- Use `:::important` (not `:::warning`) for breaking changes — this matches the existing file convention
- Section names use Title Case (`#### Breaking Changes`, `#### Features`, `#### Bug fixes`) — again, matching the file
- The version heading `## vX.Y.Z` is the identifier, not frontmatter
- Only include sections that apply — omit empty sections

## Step 5: Present the output

Produce a complete, ready-to-review markdown file. Fill in everything you can from the context the user gave you and your repo research. Use `{placeholder}` notation only for things genuinely unknown.

After producing the draft:
1. State whether this is a new file or an edit to an existing one, and give the suggested file path
2. Call out any sections you left as placeholders and why
3. Note any Vale rules the draft might trip on (passive voice is the most common)
4. Offer to generate the paired doc type if it doesn't already exist (see below)
5. Ask if they want to adjust anything

## Paired doc types

Concept and how-to docs are natural pairs. After finishing either one, check whether the counterpart exists and offer to generate it:

- **After a concept doc**: "Want me to also write a how-to for [the main task this concept enables]?" For example, a concept doc on control plane groups naturally pairs with how-tos for creating groups, managing access, and configuring shared secrets.
- **After a how-to**: "Want me to also write a concept doc explaining [the thing this guide operates on]?" For example, a how-to for enabling auto-upgrades pairs with a concept doc explaining what upgrade channels are and how the version support window works.

Check the repo first (`docs/`, `cloud-spaces-docs/`, `self-hosted-spaces-docs/`) — if the paired doc already exists, point to it instead of offering to generate a duplicate. If it exists but is thin (stub-level content), offer to improve it rather than replace it.

## What you're not doing

- You're not running Vale or building the site — that's for the user to do locally
- You're not auto-generating CRD reference docs — those come from `npm run process-crds`
