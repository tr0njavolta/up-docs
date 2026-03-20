# Upbound Documentation Style Guide

Source of truth: `README.md` and `CONTRIBUTING.md` in the up-docs repo.

---

## Voice and tone

- **Active voice.** Subject performs the action.
  - ✓ "Upbound deploys the control plane"
  - ✗ "The control plane is deployed by Upbound"
- **Present tense.** Avoid "will" unless genuinely future-tense.
  - ✓ "Spaces creates a control plane"
  - ✗ "Spaces will create a control plane"
- **Second person.** Address the reader as "you."
- **Contractions are encouraged.** "Don't", "it's", "you'll" — these read more naturally.
- **No jargon softeners.** Never use "easy", "simple", "just", "obviously", "straightforward". These minimize the reader's experience.
- **No Latin abbreviations.** Write "for example" not "e.g."; "that is" not "i.e."; avoid "etc." — list what you mean or say "and others".
- **No clichés.** "Robust", "seamless", "cutting-edge", "game-changer" — avoid.

---

## Headings

- Sentence case: "Configure a control plane" not "Configure a Control Plane"
- Start with a verb for task-oriented sections: "Create a group", "Enable GitOps"
- Don't use gerunds in headings: "Configure" not "Configuring"
- Limit to H2 and H3 in most docs; H4 and deeper usually means the structure needs rethinking

---

## Sentences and paragraphs

- Target under 25 words per sentence
- One idea per sentence
- No Oxford commas: "Spaces, UXP and Crossplane" not "Spaces, UXP, and Crossplane"
- Keep paragraphs short — 3-4 sentences max in most cases
- 80-character line wrapping in source files

---

## Capitalization

| Term | Correct |
|---|---|
| Upbound Crossplane | UXP (always spell out first use per page) |
| Crossplane | Always capitalized |
| Kubernetes | Always capitalized, never "k8s" |
| control plane | lowercase (noun) |
| Spaces | Capitalized as a product name |
| Cloud Spaces | Capitalized |
| Self-Hosted Spaces | Capitalized |
| Provider names | AWS, Azure, GCP (alphabetical order to avoid bias) |

---

## Code and technical formatting

**Kubernetes resource kinds** — `UpperCamelCase`:
- `ControlPlane`, `SharedSecretStore`, `CompositeResourceDefinition`

**Object names and labels** — `kebab-case`:
- `my-control-plane`, `team-platform`

**Inline code** (single backticks) for:
- File paths: `` `/etc/config.yaml` ``
- CLI commands: `` `up ctp create` ``
- Field names: `` `spec.parameters.region` ``
- Environment variables: `` `KUBECONFIG` ``

**Placeholders** — angle brackets in code blocks:
```shell
up ctp create <control-plane-name>
```

**Code block language hints** — always specify:
- `yaml` for YAML
- `shell` for terminal commands
- `bash` for scripts
- `json` for JSON
- `console` or `text` for terminal output you're not asking them to run

---

## Links

Internal links — use Docusaurus relative syntax:
```markdown
[Configure a control plane](./configure-control-plane.md)
```

External links — use full URL:
```markdown
[Crossplane documentation](https://docs.crossplane.io)
```

Don't use "click here" or "here" as link text. The link text should describe the destination.

---

## Lists

- Use ordered lists for sequential steps
- Use unordered lists for non-sequential items
- Don't use lists for fewer than 3 items — use prose instead
- Start each list item with a capital letter
- No period at end of list items unless they're full sentences

---

## Images

- Place in `/static/images/`
- Reference as `/images/path/to/image.png` (not `/static/images/...`)
- Always include meaningful alt text
- Prefer diagrams that explain architecture or flow over screenshots

---

## Vale enforcement

Vale runs automatically in CI and blocks PRs with errors. These style guides are active:
- Google, Microsoft, ProseInt, Write-Good, GitLab, Alex, Upbound

To disable a rule for a specific passage:
```markdown
<!-- vale Microsoft.Adverbs = NO -->
Text that trips the rule
<!-- vale Microsoft.Adverbs = YES -->
```

To disable all Vale for a section (e.g., template boilerplate):
```markdown
<!-- vale off -->
...
<!-- vale on -->
```

---

## Admonitions

Use sparingly. Don't admonition-wrap things that should just be prose.

```
:::tip
A helpful shortcut or best practice. Optional.
:::

:::info
Neutral context that doesn't fit in the main flow.
:::

:::warning
Something that could cause confusion, data loss, or unexpected behavior.
:::

:::danger
Irreversible action or serious consequence.
:::
```
