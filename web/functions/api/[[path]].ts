// Cloudflare Pages Function: forwards every /api/* request to the backend so
// the browser only ever talks to one origin. That keeps the httpOnly refresh
// cookie first-party, which Safari (ITP) requires for the session to survive
// on iPhone. The static shell is still served from the CDN, so page load never
// waits on the backend (which may be cold-starting on Render's free tier).
//
// Set API_ORIGIN in the Pages project's environment variables to point
// somewhere else; it defaults to the production backend.
const DEFAULT_API_ORIGIN = 'https://s2-nova.onrender.com'

interface Context {
  request: Request
  env: { API_ORIGIN?: string }
}

export const onRequest = async ({ request, env }: Context): Promise<Response> => {
  const incoming = new URL(request.url)
  const target = new URL(incoming.pathname + incoming.search, env.API_ORIGIN || DEFAULT_API_ORIGIN)

  // `new Request(target, request)` carries over method, headers (cookies and
  // X-Client-Platform included) and the streamed body.
  const upstream = new Request(target, request)
  const clientIp = request.headers.get('CF-Connecting-IP')
  if (clientIp) upstream.headers.set('X-Forwarded-For', clientIp)

  return fetch(upstream, { redirect: 'manual' })
}
