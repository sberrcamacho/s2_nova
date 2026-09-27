import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { userService } from '@/services/userService'
import { useAuth } from '@/state/AuthContext'

// The Dashboard v2 mockup's WGUIDES, keyed like the server's guidesSeen
// (shared with Android, so a guide seen there isn't repeated here).
const GUIDES: Record<string, { key: string; label: string; title: string; body: string }> = {
  '/inicio': { key: 'inicio', label: 'Inicio', title: 'Tu dinero de un vistazo', body: 'El saldo suma todas tus billeteras en tu moneda principal. Debajo ves alertas, planes y lo que viene.' },
  '/movimientos': { key: 'movimientos', label: 'Movimientos', title: 'Todo lo que entra y sale', body: 'Los programados aparecen arriba. Haz clic en un movimiento para ver su detalle y su comprobante.' },
  '/planes': { key: 'planes', label: 'Planes', title: 'Presupuestos, metas y préstamos', body: 'Pon límites a tus gastos, ahorra para lo que quieres y lleva la cuenta de lo que prestas.' },
  '/reportes': { key: 'reportes', label: 'Reportes', title: 'Hacia dónde va tu dinero', body: 'Aquí tienes más detalle que en el celular: compara periodos, cambia de vista y exporta a CSV.' },
  '/billeteras': { key: 'billeteras', label: 'Billeteras', title: 'Dónde está tu dinero', body: 'Cada billetera tiene su moneda. El saldo total las convierte a tu moneda principal.' },
}

// True while any modal, side panel or confirmation is open (they all mark
// themselves aria-modal): the guide hides behind them, as in the mockup.
function useModalOpen(): boolean {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const check = () => setOpen(!!document.querySelector('[aria-modal="true"]'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  return open
}

// Mini-guide (ONBOARDING.md §3): one card per main page on the first visit,
// bottom-right. "Entendido" marks the page seen, "Omitir guías" turns them
// all off; Ajustes › "Ver otra vez" resets both.
export function GuideCard() {
  const { user, updateUser } = useAuth()
  const { pathname } = useLocation()
  const modalOpen = useModalOpen()
  const guide = GUIDES[pathname]
  if (!user || !guide || modalOpen || user.guidesOff || user.guidesSeen.includes(guide.key)) return null

  const save = (patch: { guidesSeen?: string[]; guidesOff?: boolean }) => {
    updateUser(patch)
    void userService.updateGuides(patch).catch(() => undefined)
  }

  return (
    <div
      role="region"
      aria-label="Guía rápida"
      className="fixed right-6 bottom-6 z-[45] w-[354px] rounded-[16px] border border-[rgba(108,92,231,.45)] bg-v2-surface p-4 text-v2-text shadow-[0_18px_44px_rgba(0,0,0,.35)] [line-height:normal]"
    >
      <div className="text-[10px] font-extrabold tracking-[.12em] text-v2-accent2">{`GUÍA RÁPIDA · ${guide.label.toUpperCase()}`}</div>
      <div className="mt-[7px] text-[14.5px] font-extrabold">{guide.title}</div>
      <div className="mt-[5px] text-[12.5px] leading-[1.5] text-v2-muted [text-wrap:pretty]">{guide.body}</div>
      <div className="mt-3 flex items-center gap-2.5">
        <button type="button" onClick={() => save({ guidesOff: true })} className="cursor-pointer text-[12px] font-bold text-v2-muted">
          Omitir guías
        </button>
        <div className="flex-1" />
        <button type="button" onClick={() => save({ guidesSeen: [...user.guidesSeen, guide.key] })} className="cursor-pointer rounded-[10px] bg-v2-accent px-3.5 py-2 text-[12px] font-extrabold text-white">
          Entendido
        </button>
      </div>
    </div>
  )
}
