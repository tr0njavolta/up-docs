import React, { useState, useCallback } from "react"
import styles from "./styles.module.css"

// ─── MCP client ───────────────────────────────────────────────────────────────

async function mcpCall<T = unknown>(
  toolName: string,
  args: Record<string, unknown>
): Promise<T> {
  const res = await fetch("/api/mcp-local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  const text: string = data.result?.content?.[0]?.text ?? ""
  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
}

function rawToText(raw: unknown): string {
  if (typeof raw === "string") return raw
  return JSON.stringify(raw, null, 2)
}

// Kinds worth fetching examples for — primary resources only, no supporting/policy types
const PRIORITY_KINDS = new Set([
  "Cluster", "NodeGroup",
  "Queue",
  "LB", "LBListener", "LBTargetGroup", "LBTargetGroupAttachment",
  "Bucket",
  "Instance", "SubnetGroup",
  "Role", "Policy", "RolePolicyAttachment",
  "VPC", "Subnet", "SecurityGroup",
  "Topic", "Subscription",
  "Function",
  "Release", "Object",
  "DatabaseInstance", "Database",
  "Network", "Subnetwork", "ServiceAccount",
])

function pickBestExample(rawExamples: string[], kind: string): object | null {
  const parsed = rawExamples
    .map((s) => { try { return JSON.parse(s) } catch { return null } })
    .filter(Boolean) as any[]
  if (parsed.length === 0) return null

  // Prefer the example whose example-id ends with /{kind} (canonical example for this resource)
  const canonical = parsed.find((e) => {
    const id: string = e?.metadata?.annotations?.["meta.upbound.io/example-id"] ?? ""
    return id.endsWith(`/${kind.toLowerCase()}`)
  })
  if (canonical) return cleanExample(canonical)

  // Fall back to most complete
  const best = parsed.reduce((a, b) =>
    JSON.stringify(a).length >= JSON.stringify(b).length ? a : b
  )
  return cleanExample(best)
}

function cleanExample(example: any): any {
  // Strip test-only annotations and labels that add noise
  const out = JSON.parse(JSON.stringify(example))
  if (out?.metadata?.annotations) {
    delete out.metadata.annotations["meta.upbound.io/example-id"]
    if (Object.keys(out.metadata.annotations).length === 0) delete out.metadata.annotations
  }
  if (out?.metadata?.labels) {
    const cleaned = Object.fromEntries(
      Object.entries(out.metadata.labels).filter(([k]) => !k.startsWith("testing.upbound.io/"))
    )
    if (Object.keys(cleaned).length === 0) delete out.metadata.labels
    else out.metadata.labels = cleaned
  }
  return out
}

async function fetchProviderExamples(ref: ProviderRef, crds: any[]): Promise<string> {
  const relevant = crds
    .filter((c) => !c.group?.includes(".m.") && PRIORITY_KINDS.has(c.kind))
    .slice(0, 5)

  if (relevant.length === 0) return `${ref.account}/${ref.name}: no priority resources found`

  const sections = await Promise.all(
    relevant.map(async (crd) => {
      const v = crd.storageVersion ?? crd.versions?.[0] ?? "v1beta1"
      const header = `### ${crd.kind} (${crd.group}/${v})`
      try {
        const raw = await mcpCall("get_package_version_examples", {
          account: ref.account,
          repository_name: ref.name,
          version: "latest",
          resource_group: crd.group,
          resource_kind: crd.kind,
        })
        const examples: string[] = (raw as any)?.examples ?? []
        const best = pickBestExample(examples, crd.kind)
        if (!best) return `${header}\n(no examples available)`
        return `${header}\n${JSON.stringify(best, null, 2)}`
      } catch {
        return `${header}\n(examples unavailable)`
      }
    })
  )

  return `## ${ref.account}/${ref.name}\n\n${sections.join("\n\n")}`
}

// ─── Provider detection ───────────────────────────────────────────────────────
// Maps description keywords to specific provider repository names.
// search_packages query filtering is unreliable so we skip it; instead we
// call get_package_metadata directly with the resolved names.

interface ProviderRef {
  account: string
  name: string
}

const DETECTION_RULES: Array<{
  cloud: RegExp
  services: Array<[RegExp, ProviderRef]>
}> = [
  {
    cloud: /\b(aws|amazon)\b/i,
    services: [
      [/\b(eks|kubernetes|k8s|cluster|pod|container|deploy)\b/i,       { account: "upbound",             name: "provider-aws-eks" }],
      // IAM is always required alongside EKS (cluster role + node group role)
      [/\b(eks|kubernetes|k8s|cluster|pod|container|deploy)\b/i,       { account: "upbound",             name: "provider-aws-iam" }],
      [/\b(sqs|queue|message|worker|pubsub)\b/i,                       { account: "upbound",             name: "provider-aws-sqs" }],
      [/\b(elb|alb|nlb|load.?balanc|http.?endpoint|ingress)\b/i,      { account: "upbound",             name: "provider-aws-elbv2" }],
      [/\b(rds|database|postgres|mysql|aurora|sql)\b/i,                { account: "upbound",             name: "provider-aws-rds" }],
      [/\b(s3|bucket|object.?stor)\b/i,                                { account: "upbound",             name: "provider-aws-s3" }],
      [/\b(iam|role|permission)\b/i,                                   { account: "upbound",             name: "provider-aws-iam" }],
      [/\b(vpc|subnet|network|security.?group)\b/i,                    { account: "upbound",             name: "provider-aws-ec2" }],
      [/\b(redis|cache|elasticache)\b/i,                               { account: "upbound",             name: "provider-aws-elasticache" }],
      [/\b(lambda|serverless)\b/i,                                     { account: "upbound",             name: "provider-aws-lambda" }],
    ],
  },
  {
    cloud: /\b(gcp|google)\b/i,
    services: [
      [/\b(gke|kubernetes|cluster)\b/i,           { account: "upbound", name: "provider-gcp-container" }],
      [/\b(pubsub|pub.?sub|queue|topic)\b/i,      { account: "upbound", name: "provider-gcp-pubsub" }],
      [/\b(cloud.?sql|database|postgres)\b/i,     { account: "upbound", name: "provider-gcp-sql" }],
      [/\b(gcs|bucket|storage)\b/i,               { account: "upbound", name: "provider-gcp-storage" }],
      [/\b(iam|service.?account)\b/i,             { account: "upbound", name: "provider-gcp-cloudplatform" }],
      [/\b(vpc|network|subnet)\b/i,               { account: "upbound", name: "provider-gcp-compute" }],
    ],
  },
  {
    cloud: /\bazure\b/i,
    services: [
      [/\b(aks|kubernetes|cluster)\b/i,           { account: "upbound", name: "provider-azure-containerservice" }],
      [/\b(service.?bus|queue|message)\b/i,       { account: "upbound", name: "provider-azure-servicebus" }],
      [/\b(azure.?sql|database|postgres)\b/i,     { account: "upbound", name: "provider-azure-sql" }],
      [/\b(blob|storage)\b/i,                     { account: "upbound", name: "provider-azure-storage" }],
      [/\b(key.?vault)\b/i,                       { account: "upbound", name: "provider-azure-keyvault" }],
      [/\b(vnet|network|subnet)\b/i,              { account: "upbound", name: "provider-azure-network" }],
    ],
  },
]

// Cross-cloud providers detected independently of cloud keyword
const CROSS_CLOUD_RULES: Array<[RegExp, ProviderRef]> = [
  [/\b(helm|chart|release)\b/i,                            { account: "crossplane-contrib", name: "provider-helm" }],
  [/\b(kubernetes.?(object|resource|manifest)|k8s.?obj)\b/i, { account: "crossplane-contrib", name: "provider-kubernetes" }],
]

function detectProviders(text: string): ProviderRef[] {
  const found: ProviderRef[] = []
  const seen = new Set<string>()

  const add = (p: ProviderRef) => {
    const key = `${p.account}/${p.name}`
    if (!seen.has(key)) { seen.add(key); found.push(p) }
  }

  for (const { cloud, services } of DETECTION_RULES) {
    if (!cloud.test(text)) continue
    for (const [pattern, provider] of services) {
      if (pattern.test(text)) add(provider)
    }
  }

  for (const [pattern, provider] of CROSS_CLOUD_RULES) {
    if (pattern.test(text)) add(provider)
  }

  return found
}

// ─── Crossplane skill blocks ──────────────────────────────────────────────────

const SKILL_CROSSPLANE_V2 = `You are an expert Crossplane 2.x platform engineer. Apply this expertise:

**Compositions** must use \`mode: Pipeline\` with composition functions — \`mode: Resources\` is removed in v2. Patch and transform operations go through \`function-patch-and-transform\`:
\`\`\`yaml
mode: Pipeline
pipeline:
  - step: patch-and-transform
    functionRef:
      name: function-patch-and-transform
    input:
      apiVersion: pt.fn.crossplane.io/v1beta1
      kind: Resources
      resources:
        - name: example
          base: { ... }
          patches:
            - type: FromCompositeFieldPath
              fromFieldPath: spec.region
              toFieldPath: spec.forProvider.region
\`\`\`

**XRDs** use \`apiVersion: apiextensions.crossplane.io/v2\` with a required \`scope\` field. Use \`scope: LegacyCluster\` to preserve Claim support (v1 compatibility). Use \`scope: Namespaced\` for namespace-isolated composites without Claims.

**Managed resources** — fields live under \`spec.forProvider\`. Use exact field names from the provider schema. Cross-resource references use \`nameRef\`, \`selectorRef\`, or provider-specific selectors (e.g. \`arnSelector\`, \`idSelector\`) — never hardcode ARNs or IDs. For namespace-scoped compositions use \`.m.upbound.io\` API groups; for cluster-scoped use \`.upbound.io\`.

**Patches** — \`FromCompositeFieldPath\` wires XR fields to composed resources. \`ToCompositeFieldPath\` surfaces outputs (endpoints, ARNs) back to the XR. Use \`transforms\` for value mapping, string formatting, and math operations.

**Management policies** — use \`managementPolicies: ["*"]\` (default). To orphan a resource on delete: \`["Create","Observe","Update","LateInitialize"]\`.

**Claims** — namespace-scoped, reference the composite type via \`apiVersion\`/\`kind\`. Expose only developer-facing parameters, not internal implementation fields.`.trim()

const SKILL_UXP = `You are an expert UXP (Upbound Crossplane) and Crossplane 1.x platform engineer. Apply this expertise:

**Compositions** use \`mode: Resources\` with inline patches under \`spec.resources[]\`:
\`\`\`yaml
mode: Resources
resources:
  - name: example
    base:
      apiVersion: eks.aws.upbound.io/v1beta1
      kind: Cluster
      spec:
        forProvider: { ... }
    patches:
      - type: FromCompositeFieldPath
        fromFieldPath: spec.region
        toFieldPath: spec.forProvider.region
\`\`\`

**XRDs** use \`apiVersion: apiextensions.crossplane.io/v1\`. Declare Claim support with \`claimNames\`. Composite resources are cluster-scoped; Claims are namespace-scoped.

**Managed resources** — fields live under \`spec.forProvider\`. Use exact field names from the provider schema. Cross-resource references use \`nameRef\`, \`selectorRef\`, or provider-specific selectors — never hardcode ARNs. Use cluster-scoped API groups (\`.upbound.io\`, not \`.m.upbound.io\`).

**Patches** — \`FromCompositeFieldPath\` wires XR fields to composed resources. \`ToCompositeFieldPath\` surfaces outputs (endpoints, ARNs) back to the XR. Use \`transforms\` for value mapping, string formatting, and math.

**Connection secrets** — use \`writeConnectionSecretToRef\` on managed resources. Surface connection details in the Composition via \`connectionDetails\` using \`FromConnectionSecretKey\` or \`FromFieldPath\`.

**Deletion policy** — use \`deletionPolicy: Delete\` (default) or \`deletionPolicy: Orphan\` to prevent deletion of the cloud resource when the managed resource is removed.

**Claims** — namespace-scoped, reference the composite type via \`apiVersion\`/\`kind\`. Expose only developer-facing parameters, not internal implementation fields.`.trim()

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(
  description: string,
  providerData: Array<{ ref: ProviderRef; text: string }>,
  style: "xrd" | "simple",
  runtime: "v2" | "uxp",
  includeSkill: boolean
): string {
  const metaBlock = providerData
    .map(({ ref, text }) => `=== ${ref.account}/${ref.name} ===\n${text}`)
    .join("\n\n")

  const skill = runtime === "v2" ? SKILL_CROSSPLANE_V2 : SKILL_UXP

  const lines: string[] = [
    ...(includeSkill ? [skill, ""] : []),
    description.trim(),
    "",
    "I pre-fetched YAML examples from the Upbound Marketplace for the relevant providers and resource types:",
    "```",
    metaBlock,
    "```",
    "",
    "Using the examples above as your schema and field reference:",
  ]

  if (style === "xrd") {
    lines.push(
      "- Author a **CompositeResourceDefinition (XRD)** that exposes the parameters a developer would set (e.g. region, instance size, queue visibility timeout).",
      "- Author a **Composition** that wires XRD fields to the managed resources above via `fromCompositeFieldPath` patches.",
      "- Author a **Claim** example a developer can `kubectl apply` to provision everything.",
    )
  } else {
    lines.push("- Write ready-to-apply managed resource manifests, one per resource type needed.")
  }

  return lines.join("\n")
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOCKER_CMD =
  "docker run --rm -p 8765:8765 \\\n  -v ~/.up:/mcp/.up:ro \\\n  xpkg.upbound.io/upbound/marketplace-mcp-server-http:v0.1.0"

const PLACEHOLDER = `Describe your infrastructure needs and click "Build prompt" to generate a ready-to-paste prompt for Claude or any MCP-enabled client.

Requires the Upbound Marketplace MCP server running locally:

${DOCKER_CMD}`

// ─── App ──────────────────────────────────────────────────────────────────────

type Status = "idle" | "loading" | "done" | "error"

export function PromptGeneratorApp() {
  const [description, setDescription] = useState("")
  const [style, setStyle] = useState<"xrd" | "simple">("xrd")
  const [runtime, setRuntime] = useState<"v2" | "uxp">("v2")
  const [includeSkill, setIncludeSkill] = useState(true)
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [detectedCount, setDetectedCount] = useState(0)
  const [prompt, setPrompt] = useState(PLACEHOLDER)
  const [copied, setCopied] = useState(false)

  const handleBuild = useCallback(async () => {
    if (!description.trim()) return
    setStatus("loading")
    setErrorMsg("")

    try {
      const providers = detectProviders(description)

      if (providers.length === 0) {
        // Nothing detected — give Claude a generic prompt without provider data
        setDetectedCount(0)
        setPrompt([
          description.trim(),
          "",
          "Please:",
          "1. Use `search_packages` to find the right Crossplane providers for my requirements.",
          "2. Call `get_package_version_resources` for each relevant provider to list available resource types.",
          "3. Fetch schemas with `get_package_version_groupkind_resources`.",
          "4. Get YAML examples with `get_package_version_examples`.",
          style === "xrd"
            ? "5. Author an XRD + Composition + Claim."
            : "5. Write managed resource manifests.",
        ].join("\n"))
        setStatus("done")
        return
      }

      const providerData = await Promise.all(
        providers.map(async (ref) => {
          try {
            const raw = await mcpCall("get_package_version_resources", {
              account: ref.account,
              repository_name: ref.name,
              version: "latest",
            })
            const data = raw as any
            const crds: any[] = data?.customResourceDefinitions ?? []
            const text = await fetchProviderExamples(ref, crds)
            return { ref, text }
          } catch (e) {
            return { ref, text: `(error: ${e instanceof Error ? e.message : String(e)})` }
          }
        })
      )

      setDetectedCount(providers.length)
      setPrompt(buildPrompt(description, providerData, style, runtime, includeSkill))
      setStatus("done")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setPrompt(PLACEHOLDER)
      setStatus("error")
    }
  }, [description, style, runtime, includeSkill])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt)
    } catch {
      const el = document.createElement("textarea")
      el.value = prompt
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [prompt])

  return (
    <div className={styles.app}>
      {/* ── Left panel ── */}
      <div className={styles.panel}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Describe your infrastructure</h2>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. I need an S3 bucket with versioning, an RDS PostgreSQL database in a private subnet, and IAM roles so EKS pods can access both — on AWS"
            rows={6}
          />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Runtime</h2>
          <div className={styles.radioGroup}>
            {([
              { value: "v2",  label: "Crossplane 2.x",   hint: "mode: Pipeline, XRD v2, function-patch-and-transform" },
              { value: "uxp", label: "UXP / Spaces",      hint: "mode: Resources, XRD v1, inline patches" },
            ] as const).map((opt) => (
              <label
                key={opt.value}
                className={`${styles.radio} ${runtime === opt.value ? styles.radioActive : ""}`}
              >
                <input
                  type="radio"
                  name="runtime"
                  value={opt.value}
                  checked={runtime === opt.value}
                  onChange={() => setRuntime(opt.value)}
                />
                <div>
                  <span className={styles.radioLabel}>{opt.label}</span>
                  <span className={styles.radioHint}>{opt.hint}</span>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Output style</h2>
          <div className={styles.radioGroup}>
            {(["xrd", "simple"] as const).map((s) => (
              <label
                key={s}
                className={`${styles.radio} ${style === s ? styles.radioActive : ""}`}
              >
                <input
                  type="radio"
                  name="style"
                  value={s}
                  checked={style === s}
                  onChange={() => setStyle(s)}
                />
                <div>
                  <span className={styles.radioLabel}>
                    {s === "xrd" ? "XRD + Composition" : "Managed resources"}
                  </span>
                  <span className={styles.radioHint}>
                    {s === "xrd" ? "Reusable abstraction layer" : "Direct resource manifests"}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <label className={styles.skillToggle}>
            <input
              type="checkbox"
              checked={includeSkill}
              onChange={(e) => setIncludeSkill(e.target.checked)}
            />
            <span className={styles.skillToggleLabel}>Include Crossplane expert context</span>
            <span className={styles.skillToggleHint}>Disable if your Claude Project already has Crossplane expertise configured</span>
          </label>
        </section>

        <section className={styles.section}>
          <button
            className={styles.buildButton}
            onClick={handleBuild}
            disabled={!description.trim() || status === "loading"}
          >
            {status === "loading" ? (
              <>
                <span className={styles.spinner} />
                Fetching resources &amp; examples…
              </>
            ) : (
              "Build prompt"
            )}
          </button>

          {status === "error" && (
            <div className={styles.errorBox}>
              <p className={styles.errorTitle}>Could not reach MCP server</p>
              <p className={styles.errorDetail}>{errorMsg}</p>
              <p className={styles.errorHint}>Start it with:</p>
              <code className={styles.errorCmd}>{DOCKER_CMD}</code>
            </div>
          )}

          {status === "done" && (
            <p className={styles.foundTitle}>
              {detectedCount > 0
                ? `${detectedCount} provider${detectedCount !== 1 ? "s" : ""} detected — prompt ready.`
                : "No providers detected — generic prompt generated."}
            </p>
          )}
        </section>
      </div>

      {/* ── Right panel ── */}
      <div className={styles.outputPanel}>
        <div className={styles.outputHeader}>
          <span className={styles.outputTitle}>Generated prompt</span>
          {status === "done" && (
            <button
              className={`${styles.copyButton} ${copied ? styles.copyButtonSuccess : ""}`}
              onClick={handleCopy}
            >
              {copied ? "Copied" : "Copy prompt"}
            </button>
          )}
        </div>
        <pre className={styles.promptText}>{prompt}</pre>
      </div>
    </div>
  )
}
