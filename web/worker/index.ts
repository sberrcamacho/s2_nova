// Cloudflare Worker (static assets + API proxy). Only /api/* reaches this
// code (see run_worker_first in wrangler.jsonc); the built SPA is served
// straight from the CDN, so page load never waits on the backend (which may
// be cold-starting on Render's free tier).
//
// Forwarding /api/* keeps the browser on one origin, so the httpOnly refresh
// cookie stays first-party, which Safari (ITP) requires for the session to
// survive on iPhone.
//
// Set API_ORIGIN as a Worker variable to point somewhere else; it defaults to
// the production backend.
const DEFAULT_API_ORIGIN = 'https://s2-nova.onrender.com'

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  API_ORIGIN?: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incoming = new URL(request.url)
    if (!incoming.pathname.startsWith('/api/')) return env.ASSETS.fetch(request)

    const target = new URL(incoming.pathname + incoming.search, env.API_ORIGIN || DEFAULT_API_ORIGIN)

    // `new Request(target, request)` carries over method, headers (cookies and
    // X-Client-Platform included) and the streamed body.
    const upstream = new Request(target, request)
    const clientIp = request.headers.get('CF-Connecting-IP')
    if (clientIp) upstream.headers.set('X-Forwarded-For', clientIp)

    return fetch(upstream, { redirect: 'manual' })
  },
}
