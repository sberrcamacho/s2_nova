import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { userService } from '@/services/userService'
import { useAuth } from '@/state/AuthContext'
import { TourOverlay } from './TourOverlay'
import { runnableSteps, TOURS, type TourKey, type TourStep } from './tours'

interface Request {
  // Nuevo movimiento's tour runs over its own side panel, which is a modal.
  insidePanel: boolean
}

interface TourContextValue {
  request: (key: TourKey, req: Request) => void
  withdraw: (key: TourKey) => void
}

const TourContext = createContext<TourContextValue | null>(null)

// Time for a page's entrance (route-in, 380 ms) to settle before a tour
// measures it.
const SETTLE_MS = 450

function openModals(): number {
  return document.querySelectorAll('[aria-modal="true"]').length
}

// Runs at most one tour at a time. Pages ask for their tour with
// useAutoTour once their data is on screen; a request waits while another
// tour runs or a dialog is open, and is dropped for tours already seen.
export function TourProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useAuth()
  const [run, setRun] = useState<{ key: TourKey; steps: TourStep[]; index: number } | null>(null)
  const pending = useRef(new Map<TourKey, Request>())
  const seenRef = useRef<string[]>(user?.guidesSeen ?? [])
  seenRef.current = user?.guidesSeen ?? []
  const runRef = useRef(run)
  runRef.current = run

  const tryStart = useCallback(() => {
    if (runRef.current || !user) return
    for (const [key, req] of pending.current) {
      if (seenRef.current.includes(key)) {
        pending.current.delete(key)
        continue
      }
      if (openModals() > (req.insidePanel ? 1 : 0)) continue
      const steps = runnableSteps(TOURS[key])
      if (steps.length === 0) continue
      pending.current.delete(key)
      setRun({ key, steps, index: 0 })
      return
    }
  }, [user])

  // Re-check when dialogs open or close (they are portals on <body>).
  useEffect(() => {
    let timer = 0
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(tryStart, SETTLE_MS)
    })
    observer.observe(document.body, { childList: true })
    return () => {
      observer.disconnect()
      window.clearTimeout(timer)
    }
  }, [tryStart])

  const request = useCallback(
    (key: TourKey, req: Request) => {
      pending.current.set(key, req)
      window.setTimeout(tryStart, SETTLE_MS)
    },
    [tryStart],
  )
  const withdraw = useCallback((key: TourKey) => {
    pending.current.delete(key)
  }, [])

  // Finishing and skipping both mark the tour seen, on the server too.
  const complete = useCallback(
    (key: TourKey) => {
      setRun(null)
      const seen = seenRef.current
      if (!seen.includes(key)) {
        const next = [...seen, key]
        updateUser({ guidesSeen: next })
        void userService.updateGuides({ guidesSeen: next }).catch(() => undefined)
      }
      window.setTimeout(tryStart, SETTLE_MS)
    },
    [updateUser, tryStart],
  )

  const onNext = useCallback(() => {
    const r = runRef.current
    if (!r) return
    if (r.index >= r.steps.length - 1) complete(r.key)
    else setRun({ ...r, index: r.index + 1 })
  }, [complete])
  const onPrev = useCallback(() => {
    const r = runRef.current
    if (r && r.index > 0) setRun({ ...r, index: r.index - 1 })
  }, [])
  const onSkip = useCallback(() => {
    const r = runRef.current
    if (r) complete(r.key)
  }, [complete])

  return (
    <TourContext.Provider value={{ request, withdraw }}>
      {children}
      {run && <TourOverlay tour={run.key} steps={run.steps} index={run.index} onNext={onNext} onPrev={onPrev} onSkip={onSkip} />}
    </TourContext.Provider>
  )
}

// Asks for a screen's tour once `ready` (its data is on screen). It starts
// only if the user hasn't finished or skipped it before.
export function useAutoTour(key: TourKey, ready: boolean, options: { insidePanel?: boolean } = {}) {
  const ctx = useContext(TourContext)
  const insidePanel = options.insidePanel ?? false
  useEffect(() => {
    if (!ctx || !ready) return
    ctx.request(key, { insidePanel })
    return () => ctx.withdraw(key)
  }, [ctx, key, ready, insidePanel])
}
