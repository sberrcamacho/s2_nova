import { useEffect, useRef } from 'react'

// Minimal surface of the Google Identity Services JS SDK this component
// needs — the SDK attaches itself to `window.google` once its script tag
// loads, there's no npm package for it (see ARCHITECTURE.md §7).
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google Sign-In.')))
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No se pudo cargar Google Sign-In.'))
    document.head.appendChild(script)
  })
}

// Renders nothing (and does nothing) when VITE_GOOGLE_CLIENT_ID isn't
// configured — same "quietly unavailable until configured" behavior as the
// backend's /auth/google route when GOOGLE_CLIENT_IDS is empty.
export function GoogleSignInButton({ onToken }: { onToken: (idToken: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId || !containerRef.current) return
    let cancelled = false

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google || !containerRef.current) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => onToken(response.credential),
        })
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: 320,
        })
      })
      .catch(() => {
        // Silently unavailable — the email/password form still works.
      })

    return () => {
      cancelled = true
    }
  }, [clientId, onToken])

  if (!clientId) return null

  return <div ref={containerRef} className="flex justify-center" />
}
