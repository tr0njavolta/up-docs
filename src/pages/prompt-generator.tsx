import React from "react"
import Layout from "@theme/Layout"
import Head from "@docusaurus/Head"
import { useCurrentUser } from "@site/src/hooks"
import { useConfig } from "@site/src/contexts/config"
import { PromptGeneratorApp } from "@site/src/components/PromptGenerator"
import styles from "./prompt-generator.module.css"

function AuthGate({ baseDomain }: { baseDomain: string }) {
  const loginUrl = `https://accounts.${baseDomain}/login?redirectTo=${encodeURIComponent("/prompt-generator")}`

  return (
    <div className={styles.authGate}>
      <div className={styles.authGateInner}>
        <div className={styles.authGateIcon} aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--brand-purple-100)" />
            <path
              d="M10 14v-3a6 6 0 1112 0v3"
              stroke="var(--brand-purple-500)"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <rect
              x="8" y="14" width="16" height="11" rx="2"
              stroke="var(--brand-purple-500)"
              strokeWidth="1.75"
            />
            <circle cx="16" cy="19.5" r="1.5" fill="var(--brand-purple-500)" />
          </svg>
        </div>
        <h1 className={styles.authGateTitle}>Sign in to use the Prompt Generator</h1>
        <p className={styles.authGateBody}>
          Generate optimized prompts for the{" "}
          <a
            href="https://github.com/upbound/marketplace-mcp-server"
            target="_blank"
            rel="noopener noreferrer"
          >
            Upbound Marketplace MCP server
          </a>{" "}
          based on your infrastructure requirements and real provider schemas.
        </p>
        <a href={loginUrl} className={styles.authGateButton}>
          Sign in to Upbound
        </a>
        <p className={styles.authGateSignup}>
          Don&apos;t have an account?{" "}
          <a href={`https://accounts.${baseDomain}/register`}>Sign up free</a>
        </p>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className={styles.loading}>
      <span className={styles.loadingSpinner} />
    </div>
  )
}

const isDev =
  typeof window !== "undefined" && window.location.hostname === "localhost"

export default function PromptGeneratorPage() {
  const { isAuthenticated, isLoading } = useCurrentUser()
  const { baseDomain } = useConfig()

  const showApp = isDev || isAuthenticated

  return (
    <Layout
      title="MCP Prompt Generator"
      description="Generate optimized prompts for the Upbound Marketplace MCP server based on your infrastructure requirements."
    >
      <Head>
        <meta name="robots" content="noindex" />
      </Head>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <span className={styles.badge}>MCP</span>
          <h1 className={styles.pageTitle}>Prompt Generator</h1>
          <p className={styles.pageSubtitle}>
            Describe your infrastructure needs, then copy the generated prompt into Claude or any{" "}
            <a
              href="https://github.com/upbound/marketplace-mcp-server"
              target="_blank"
              rel="noopener noreferrer"
            >
              MCP-enabled client
            </a>
            . Requires the Marketplace MCP server running locally on port 8765.
          </p>
        </div>
      </div>

      {isLoading && !isDev ? (
        <LoadingState />
      ) : showApp ? (
        <PromptGeneratorApp />
      ) : (
        <AuthGate baseDomain={baseDomain} />
      )}
    </Layout>
  )
}
