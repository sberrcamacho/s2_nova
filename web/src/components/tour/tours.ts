import type { TranslationKey } from '@/lib/i18n/translations'

// Product tours (DESIGN-SYSTEM.md §6.13): a general one on the first visit
// to Inicio and one per main screen. A finished or skipped tour's key goes
// into the server's guidesSeen, shared with Android, so it never starts on
// its own again; Ajustes › "Ver los recorridos otra vez" clears the list.
export type TourKey = 'tour.welcome' | 'tour.movimientos' | 'tour.planes' | 'tour.reportes' | 'tour.billeteras' | 'tour.nuevo'

export interface TourStep {
  // Copy lives at `${tour}.${id}.title` / `.body`.
  id: string
  // The `data-tour` value of the element to highlight, or several to try in
  // order (the first visible one wins). No target: a centred step. A step
  // whose targets are all missing or off screen is left out of the run.
  target?: string | string[]
  // Where the popover goes first; it flips when there is no room.
  placement?: 'bottom' | 'top' | 'right'
}

export const TOURS: Record<TourKey, TourStep[]> = {
  'tour.welcome': [
    { id: 'intro' },
    { id: 'balance', target: 'inicio.balance' },
    { id: 'wallets', target: 'inicio.wallets' },
    { id: 'month', target: 'inicio.month' },
    { id: 'alerts', target: 'inicio.alerts' },
    { id: 'add', target: 'nav.add' },
    { id: 'nav', target: ['nav.main', 'nav.menu'], placement: 'right' },
  ],
  'tour.movimientos': [
    { id: 'search', target: 'mov.search' },
    { id: 'period', target: 'mov.period' },
    { id: 'filters', target: 'mov.filters' },
    { id: 'row', target: 'mov.row' },
  ],
  'tour.planes': [
    { id: 'tabs', target: 'planes.tabs' },
    { id: 'create', target: 'planes.create' },
    { id: 'card', target: 'planes.card' },
  ],
  'tour.reportes': [
    { id: 'tabs', target: 'rep.tabs' },
    { id: 'range', target: 'rep.range' },
    { id: 'breakdown', target: 'rep.breakdown' },
  ],
  'tour.billeteras': [
    { id: 'total', target: 'wal.total' },
    { id: 'card', target: 'wal.card' },
    { id: 'add', target: 'wal.add' },
  ],
  'tour.nuevo': [
    { id: 'type', target: 'nm.type' },
    { id: 'amount', target: 'nm.amount' },
    { id: 'category', target: 'nm.category' },
    { id: 'more', target: 'nm.more' },
  ],
}

export function stepCopy(tour: TourKey, step: TourStep): { title: TranslationKey; body: TranslationKey } {
  return { title: `${tour}.${step.id}.title` as TranslationKey, body: `${tour}.${step.id}.body` as TranslationKey }
}

// The highlighted element for a step: the first of its targets that is
// rendered and horizontally on screen (the sidebar drawer slides off to
// the left on phones). Something below the fold still counts, since the
// tour scrolls it into view.
export function findTarget(step: TourStep, root: ParentNode = document): HTMLElement | null {
  if (!step.target) return null
  const ids = Array.isArray(step.target) ? step.target : [step.target]
  for (const id of ids) {
    const el = root.querySelector<HTMLElement>(`[data-tour="${id}"]`)
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth) return el
  }
  return null
}

// The steps that can run right now: centred steps always, the rest only
// when their element is there.
export function runnableSteps(steps: TourStep[], find: (step: TourStep) => HTMLElement | null = (s) => findTarget(s)): TourStep[] {
  return steps.filter((s) => !s.target || find(s) !== null)
}
