import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/state/ThemeContext'
import { useTranslation } from '@/state/useTranslation'

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
//
// The visible button is our own (per the login redesign spec, not Google's
// hosted chrome): the real Google-rendered button is stacked underneath it,
// full-size and transparent, so a click always lands on Google's real
// button and fires the genuine credential flow — GIS has no API to trigger
// the ID-token flow programmatically from an arbitrary click handler.
export function GoogleSignInButton({ onToken }: { onToken: (idToken: string) => void }) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  // Exact hover shades from the mockup: the button itself is always white,
  // but the mockup's dark-theme variant hovers to a slightly different near-
  // white than its light-theme variant.
  const hoverBg = theme === 'dark' ? '#f0f0f5' : '#f6f6fa'
  const realButtonRef = useRef<HTMLDivElement>(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const [ready, setReady] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  useEffect(() => {
    if (!clientId || !realButtonRef.current) return
    let cancelled = false

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google || !realButtonRef.current) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => onToken(response.credential),
        })
        window.google.accounts.id.renderButton(realButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: 340,
        })
        setReady(true)
      })
      .catch(() => {
        // Silently unavailable — the email/password form still works.
      })

    return () => {
      cancelled = true
    }
  }, [clientId, onToken])

  if (!clientId) return null

  const background = isPressed ? 'white' : isHovered ? hoverBg : 'white'

  return (
    <div
      className="relative h-[46px] w-full overflow-hidden rounded-[12px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsPressed(false)
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {/* Visible custom button — decorative only, clicks pass through to the real Google button beneath it. */}
      <div
        className="pointer-events-none flex h-full w-full items-center justify-center gap-2.5 rounded-[12px] text-[13.5px] font-bold text-[#1f1f28] transition-colors"
        style={{
          background,
          opacity: isPressed ? 0.9 : 1,
          border: theme === 'light' ? '1px solid var(--color-border)' : 'none',
        }}
        aria-hidden="true"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" className="shrink-0">
          <path
            fill="#4285F4"
            d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.4z"
          />
          <path
            fill="#34A853"
            d="M24 46c6 0 11-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.4v5.7C7.9 41 15.4 46 24 46z"
          />
          <path
            fill="#FBBC05"
            d="M11.7 28.1c-.4-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1v-5.7H4.4C2.9 17.1 2 20.4 2 24s.9 6.9 2.4 9.8l7.3-5.7z"
          />
          <path
            fill="#EA4335"
            d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.4 2 7.9 7 4.4 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.3-9.1z"
          />
        </svg>
        {t('auth.continueWithGoogle')}
      </div>
      {/* Real Google button — invisible, full-size, receives the actual click. */}
      <div
        ref={realButtonRef}
        className="absolute inset-0 opacity-0"
        style={{ visibility: ready ? 'visible' : 'hidden' }}
      />
    </div>
  )
}
