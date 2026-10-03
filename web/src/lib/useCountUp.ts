import { useEffect, useRef, useState } from 'react'

// Motion tokens (DESIGN-SYSTEM.md §4.4) for a figure moving to its new value.
const VALUE_MS = 450
const emphasizedDecelerate = (t: number) => 1 - Math.pow(1 - t, 4)

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// A total that counts to its new value when it changes (a movement saved, an
// occurrence confirmed), so the change reads as cause and effect. The first
// value shows as is: opening the page never replays it. Under reduced motion
// the new value just appears.
export function useCountUp(value: number | null): number | null {
  const [shown, setShown] = useState(value)
  // Where the figure is right now, so a change mid-count continues from there.
  const current = useRef(value)

  useEffect(() => {
    const start = current.current
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
      const p = Math.min(1, (now - t0) / VALUE_MS)
      show(p < 1 ? start + (value - start) * emphasizedDecelerate(p) : value)
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return shown
}
