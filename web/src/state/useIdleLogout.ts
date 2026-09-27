import { useEffect, useRef } from 'react'

// Shared by every tab of the app, so using any of them counts as activity.
// Only a timestamp — nothing about the session itself.
const LAST_ACTIVITY_KEY = 's2nova.lastActivity'
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const
const HEARTBEAT_MS = 60_000
const CHECK_MS = 15_000

function readShared(): number {
  try {
    return Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || 0
  } catch {
    return 0
  }
}

function writeShared(at: number) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(at))
  } catch {
    // Private mode / blocked storage: this tab still tracks its own activity.
  }
}

// Ajustes › Seguridad › "Cierre automático": after `minutes` without the
// user touching the app, `onIdle` signs them out. While they're active it
// reports it to the server (`heartbeat`, at most once a minute), which ends
// the session on its own if this tab is closed or asleep (backend
// lib/sessions.ts). `minutes` 0 (Nunca) or no session turns it off.
export function useIdleLogout(minutes: number, enabled: boolean, onIdle: () => void, heartbeat: () => void) {
  const onIdleRef = useRef(onIdle)
  const heartbeatRef = useRef(heartbeat)
  onIdleRef.current = onIdle
  heartbeatRef.current = heartbeat

  useEffect(() => {
    if (!enabled || minutes <= 0) return
    const limit = minutes * 60_000
    let last = Date.now()
    let lastBeat = last
    let ended = false
    writeShared(last)

    const check = () => {
      if (ended) return
      const idleFor = Date.now() - Math.max(last, readShared())
      if (idleFor >= limit) {
        ended = true
        onIdleRef.current()
      }
    }
    const onActivity = () => {
      // Back from a long sleep: a stale session ends before counting this.
      check()
      if (ended) return
      last = Date.now()
      writeShared(last)
      if (last - lastBeat >= HEARTBEAT_MS) {
        lastBeat = last
        heartbeatRef.current()
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check()
    }

    ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, onActivity, { passive: true, capture: true }))
    document.addEventListener('visibilitychange', onVisibility)
    const timer = window.setInterval(check, CHECK_MS)
    return () => {
      ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, onActivity, { capture: true }))
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(timer)
    }
  }, [minutes, enabled])
}
