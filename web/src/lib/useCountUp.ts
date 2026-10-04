import { useEffect, useRef, useState } from 'react'

// Motion tokens (DESIGN-SYSTEM.md §4.4) for a figure moving to its new value.
const VALUE_MS = 450
// A headline figure's first count from zero: long enough to notice.
const INTRO_MS = 800
const emphasizedDecelerate = (t: number) => 1 - Math.pow(1 - t, 4)

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// A total that counts to its new value when it changes (a movement saved, an
// occurrence confirmed), so the change reads as cause and effect. The first
// value shows as is, unless `intro` is set: then the first value counts up
// from zero once (Inicio's headline figures). Under reduced motion the new
// value just appears.
export function useCountUp(value: number | null, { intro = false }: { intro?: boolean } = {}): number | null {
  const start0 = intro && !prefersReducedMotion() ? (value === null ? null : 0) : value
  const [shown, setShown] = useState(start0)
  // Where the figure is right now, so a change mid-count continues from there.
  const current = useRef(start0)
  // With `intro`, the first non-null value counts from zero.
  const pendingIntro = useRef(intro)

  useEffect(() => {
    const start = pendingIntro.current && value !== null ? 0 : current.current
    const intro = pendingIntro.current && value !== null
    if (value !== null) pendingIntro.current = false
    const duration = intro ? INTRO_MS : VALUE_MS
    const show = (v: number | null) => {
      current.current = v
      setShown(v)
    }
    if (value === null || start === null || start === value || prefersReducedMotion()) {
      show(value)
      return
    }
    let frame = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      show(p < 1 ? start + (value - start) * emphasizedDecelerate(p) : value)
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return shown
}
