import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fill } from '@/lib/i18n/translations'
import { useTranslation } from '@/state/useTranslation'
import { findTarget, stepCopy, type TourKey, type TourStep } from './tours'

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

// Room around the highlighted element, the gap to the popover and the
// screen gutter (DESIGN-SYSTEM.md §6.13).
const PAD = 6
const GAP = 14
const MARGIN = 16

// Where the popover goes: on its preferred side of the target when it fits,
// else the next side that does, else pinned to the bottom of the screen.
// It never covers the target unless the screen has no room anywhere.
export function placePopover(
  target: Rect | null,
  pop: { width: number; height: number },
  view: { width: number; height: number },
  prefer: 'bottom' | 'top' | 'right' = 'bottom',
): { left: number; top: number } {
  const clampX = (x: number) => Math.max(MARGIN, Math.min(x, view.width - MARGIN - pop.width))
  const clampY = (y: number) => Math.max(MARGIN, Math.min(y, view.height - MARGIN - pop.height))
  if (!target) return { left: clampX((view.width - pop.width) / 2), top: clampY((view.height - pop.height) / 2) }
  const t = { left: target.left - PAD, top: target.top - PAD, right: target.left + target.width + PAD, bottom: target.top + target.height + PAD }
  const cx = (t.left + t.right) / 2
  const cy = (t.top + t.bottom) / 2
  const sides = {
    bottom: () => (t.bottom + GAP + pop.height <= view.height - MARGIN ? { left: clampX(cx - pop.width / 2), top: t.bottom + GAP } : null),
    top: () => (t.top - GAP - pop.height >= MARGIN ? { left: clampX(cx - pop.width / 2), top: t.top - GAP - pop.height } : null),
    right: () => (t.right + GAP + pop.width <= view.width - MARGIN ? { left: t.right + GAP, top: clampY(cy - pop.height / 2) } : null),
  }
  const order = prefer === 'right' ? (['right', 'bottom', 'top'] as const) : prefer === 'top' ? (['top', 'bottom', 'right'] as const) : (['bottom', 'top', 'right'] as const)
  for (const side of order) {
    const at = sides[side]()
    if (at) return at
  }
  return { left: clampX(cx - pop.width / 2), top: view.height - MARGIN - pop.height }
}

// The scrim's shape: the whole screen minus the padded, rounded target.
export function scrimPath(view: { width: number; height: number }, target: Rect | null, radius: number): string {
  const screen = `M0 0H${view.width}V${view.height}H0Z`
  if (!target) return screen
  const x = target.left - PAD
  const y = target.top - PAD
  const w = target.width + PAD * 2
  const h = target.height + PAD * 2
  const r = Math.min(radius + 4, w / 2, h / 2)
  return `${screen}M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
}

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

interface Props {
  tour: TourKey
  steps: TourStep[]
  index: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

// The running tour: a scrim with a cut-out around the step's element, a
// 2 px focus-coloured ring, and the popover (a modal dialog) with the
// step's copy and Omitir · Anterior · Siguiente. The page behind is inert
// until the tour ends.
export function TourOverlay({ tour, steps, index, onNext, onPrev, onSkip }: Props) {
  const { t } = useTranslation()
  const step = steps[index]
  const last = index === steps.length - 1
  const copy = stepCopy(tour, step)
  const titleId = useId()
  const bodyId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const [radius, setRadius] = useState(12)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [view, setView] = useState({ width: window.innerWidth, height: window.innerHeight })
  const reduced = reducedMotion()

  // Follow the step's element while the page scrolls or resizes.
  useLayoutEffect(() => {
    const el = findTarget(step)
    if (!el) {
      setRect(null)
      return
    }
    el.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
    setRadius(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 12)
    const measure = () => {
      const r = el.getBoundingClientRect()
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height })
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(el)
    window.addEventListener('scroll', measure, true)
    return () => {
      observer?.disconnect()
      window.removeEventListener('scroll', measure, true)
    }
  }, [step, reduced])

  useEffect(() => {
    const onResize = () => setView({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useLayoutEffect(() => {
    const pop = popRef.current
    if (!pop) return
    setPos(placePopover(rect, { width: pop.offsetWidth, height: pop.offsetHeight }, view, step.placement))
  }, [rect, view, step, index])

  // Everything else is inert while the tour runs; focus returns to where
  // it was when the tour ends.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const root = rootRef.current
    const others = Array.from(document.body.children).filter((n) => n !== root && !n.hasAttribute('inert'))
    others.forEach((n) => n.setAttribute('inert', ''))
    return () => {
      others.forEach((n) => n.removeAttribute('inert'))
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])

  // Each step moves focus to its title, so screen readers read the step.
  // It waits for the popover to be placed: a hidden element can't take
  // focus.
  const placed = pos !== null
  useEffect(() => {
    if (placed) headingRef.current?.focus({ preventScroll: true })
  }, [index, placed])

  // Esc skips, the arrows step, Tab stays in the popover. Other keys stop
  // here so the app's shortcuts (N, the panel's Esc) don't fire under it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onSkip()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        e.stopPropagation()
        onNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        e.stopPropagation()
        if (index > 0) onPrev()
      } else if (e.key === 'Tab') {
        const items = Array.from(popRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
        if (items.length === 0) return
        const first = items[0]
        const lastItem = items[items.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === first || active === headingRef.current)) {
          e.preventDefault()
          lastItem.focus()
        } else if (!e.shiftKey && active === lastItem) {
          e.preventDefault()
          first.focus()
        }
      } else if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Shift') {
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [index, onNext, onPrev, onSkip])

  const move = reduced ? undefined : 'left 220ms cubic-bezier(.2,0,0,1), top 220ms cubic-bezier(.2,0,0,1), width 220ms cubic-bezier(.2,0,0,1), height 220ms cubic-bezier(.2,0,0,1)'

  return createPortal(
    <div ref={rootRef} className="[line-height:normal]">
      {/* The scrim, with a rounded cut-out around the step's element. It
          also swallows clicks on the page behind; it never dismisses. */}
      <svg aria-hidden="true" className="fixed inset-0 z-[60] h-full w-full" width={view.width} height={view.height}>
        <path fill="rgba(6,6,12,.62)" fillRule="evenodd" d={scrimPath(view, rect, radius)} />
      </svg>
      {rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[60]"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: radius + 4,
            outline: '2px solid var(--color-focus)',
            transition: move,
          }}
        />
      )}
      <div
        ref={popRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="fixed z-[61] w-[min(320px,calc(100vw-32px))] rounded-[16px] border border-v2-line2 bg-v2-surface p-4 text-v2-text shadow-[var(--shadow-lg)]"
        style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden', transition: move }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-numeric text-caption font-medium text-v2-dim">{fill(t('tour.stepOf'), index + 1, steps.length)}</span>
          <span aria-hidden="true" className="flex gap-1">
            {steps.map((s, i) => (
              <span key={s.id} className="h-1.5 w-1.5 rounded-full" style={{ background: i === index ? 'var(--v2-accent-line)' : 'var(--v2-line2)' }} />
            ))}
          </span>
        </div>
        <h2 ref={headingRef} id={titleId} tabIndex={-1} className="mt-2 text-title-sm font-semibold tracking-[-.01em] outline-none">
          {t(copy.title)}
        </h2>
        <p id={bodyId} className="mt-1 text-body-sm leading-[1.5] text-v2-muted [text-wrap:pretty]">
          {t(copy.body)}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={onSkip} className="min-h-8 cursor-pointer whitespace-nowrap rounded-[8px] px-2 text-label font-medium text-v2-muted hover:text-v2-text">
            {t('tour.skip')}
          </button>
          <div className="flex-1" />
          {index > 0 && (
            <button type="button" onClick={onPrev} className="h-9 cursor-pointer whitespace-nowrap rounded-[10px] border border-border-input px-3.5 text-label font-semibold text-ink-secondary hover:text-ink">
              {t('tour.prev')}
            </button>
          )}
          <button type="button" onClick={onNext} className="btn-cta h-9 cursor-pointer whitespace-nowrap rounded-[10px] px-4 text-label font-semibold">
            {t(last ? 'tour.done' : 'tour.next')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
