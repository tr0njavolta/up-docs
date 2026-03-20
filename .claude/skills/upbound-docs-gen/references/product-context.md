# Upbound Product Context

Reference for accurate terminology and product structure in documentation.

---

## Products

### UXP — Upbound Crossplane

Upbound's enterprise distribution of Crossplane. Use "UXP" after spelling out "Upbound Crossplane" on first use per page. Features include:
- Intelligent Control Planes (AI-powered reconciliation)
- Function Scale-to-Zero
- Pod Autoscaling
- Backup and Restore
- Enterprise add-ons and support

UXP can run standalone on a customer's Kubernetes cluster, or hosted inside Spaces.

### Spaces

The hosting platform for managed Crossplane control planes. Spaces come in several variants:

| Variant | Who operates it | Who manages the software |
|---|---|---|
| **Cloud Spaces** | Upbound | Upbound |
| **Dedicated Spaces** | Upbound (single-tenant) | Upbound |
| **Self-Hosted Spaces** | Customer | Customer |
| **Managed Spaces** | Customer (provides infra) | Upbound |

In prose, refer to the specific variant when it matters. Use "Spaces" generically when a statement applies to all variants.

---

## Core concepts

### Control plane

A fully isolated Crossplane instance managed within Spaces. In the API, represented by the `ControlPlane` kind. In CLI, often referenced as `ctp`.

- Prefer "control plane" (lowercase) in prose
- Use `ControlPlane` when referring to the Kubernetes resource kind
- Don't use "MCP" (Managed Control Plane) as a general term — it's legacy Cloud Spaces terminology
- Don't use "CTP" in prose — it's a CLI abbreviation

### Control plane group

A logical grouping of control planes that share configuration. Represented by the `ControlPlaneGroup` kind.

### Space

A hosting environment, roughly analogous to a region or cluster, that contains control plane groups. Represented by the `Space` kind in the API.

### Connector

Mechanism for connecting a Self-Hosted Spaces installation to Upbound's management plane.

### SharedSecretStore

A CRD for sharing secrets between control planes within a group.

---

## CLI and tooling

- **`up` CLI** — the primary Upbound command-line tool
- **`kubectl`** — for direct cluster interactions
- **`helm`** — for installing Spaces

Common CLI command patterns to document accurately:
```shell
up ctp create <name>
up ctp get <name>
up ctp delete <name>
up group create <name>
```

---

## Documentation structure

The repo has three separate Docusaurus documentation spaces:

| Space | Path | URL prefix |
|---|---|---|
| Main docs | `docs/` | `/` |
| Cloud Spaces docs | `cloud-spaces-docs/` | `/cloud-spaces/` |
| Self-Hosted Spaces docs | `self-hosted-spaces-docs/` | `/self-hosted-spaces/` |

When generating docs, confirm with the user which space the content belongs in. This affects the file path and sidebar.

### Main docs sections

- `docs/getstarted/` — Introduction, quickstarts, first-run tutorials
- `docs/guides/` — Solution-focused and architectural guides
- `docs/manuals/uxp/` — UXP feature documentation
- `docs/manuals/cli/` — CLI reference and usage
- `docs/manuals/console/` — Web console documentation
- `docs/reference/` — Auto-generated API/CRD reference, Helm values, release notes

### Cloud and Self-Hosted Spaces docs sections

Both follow a similar pattern:
- `concepts/` — Conceptual documentation
- `how-to/` — Task-oriented guides
- `reference/` — API reference

---

## Common external references

When linking to related resources, these are the authoritative sources:
- Crossplane docs: `https://docs.crossplane.io`
- Kubernetes docs: `https://kubernetes.io/docs`
- Upbound marketplace: `https://marketplace.upbound.io`

---

## Terminology to avoid

| Avoid | Use instead |
|---|---|
| k8s | Kubernetes |
| MCP | control plane (or "managed control plane" only in Cloud Spaces context) |
| CTP | control plane |
| xp | Crossplane |
| Easy / simple / just | (omit or rephrase) |
| The user | You / the operator / the developer (be specific) |
