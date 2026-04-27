export const config = { runtime: "edge" }

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const marketplacePath = url.pathname.replace(/^\/api\/marketplace/, "")
  const marketplaceUrl = `https://marketplace.upbound.io${marketplacePath}${url.search}`

  const forward: Record<string, string> = {
    "content-type": "application/json",
  }
  const auth = req.headers.get("authorization")
  if (auth) forward["authorization"] = auth
  // Forward cookies so browser session works on *.upbound.io preview domains
  const cookie = req.headers.get("cookie")
  if (cookie) forward["cookie"] = cookie

  const response = await fetch(marketplaceUrl, { headers: forward })
  const body = await response.text()

  return new Response(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  })
}
