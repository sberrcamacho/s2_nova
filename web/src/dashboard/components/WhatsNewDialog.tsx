import { useEffect, useState } from 'react'
import { V2Modal } from '@/components/v2/Kit'
import { changelogImage, type ChangelogVersion } from '@/lib/changelog'
import { fill } from '@/lib/i18n/translations'
import { useTheme } from '@/state/ThemeContext'
import { useTranslation } from '@/state/useTranslation'

// "Novedades" once after an update: one feature per page, with a capture of
// it. ← / → turn the pages; "Ver todas las novedades" opens the history.
export function WhatsNewDialog({ version, onClose, onSeeAll }: { version: ChangelogVersion; onClose: () => void; onSeeAll: () => void }) {
  const { t, language } = useTranslation()
  const { theme } = useTheme()
  const [page, setPage] = useState(0)
  const count = version.items.length
  const item = version.items[page]!
  const last = page === count - 1
  const overline = fill(t('wn.overline'), version.version)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setPage((p) => Math.min(count - 1, p + 1))
      if (e.key === 'ArrowLeft') setPage((p) => Math.max(0, p - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count])

  return (
    <V2Modal width={520} label={overline} onClose={onClose}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 truncate text-overline font-semibold uppercase text-link">{overline}</div>
        <div className="flex-none text-caption text-ink-tertiary">{fill(t('wn.page'), page + 1, count)}</div>
      </div>
      <div className="flex flex-col gap-4" aria-live="polite">
        <img
          key={item.image}
          src={changelogImage(item.image, theme)}
          alt=""
          className="aspect-[3/2] w-full rounded-[16px] border border-border bg-surface-sunken object-cover object-top"
        />
        <div>
          <h2 className="truncate text-title font-semibold text-ink">{item.title[language]}</h2>
          {/* Room for three lines on every page, so the dialog doesn't jump. */}
          <p className="mt-1 min-h-[4.5lh] text-body text-ink-secondary">{item.body[language]}</p>
        </div>
      </div>
      <div className="flex justify-center gap-1.5" aria-hidden="true">
        {version.items.map((it, i) => (
          <span key={it.image} className={`h-1.5 rounded-full transition-[width] ${i === page ? 'w-[18px] bg-link' : 'w-1.5 bg-border-input'}`} />
        ))}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => (page === 0 ? onClose() : setPage(page - 1))}
          className="h-11 flex-1 cursor-pointer whitespace-nowrap rounded-[12px] border border-border-input bg-surface text-label font-semibold text-ink hover:bg-surface-sunken"
        >
          {page === 0 ? t('common.close') : t('wn.prev')}
        </button>
        <button
          type="button"
          data-autofocus
          onClick={() => (last ? onClose() : setPage(page + 1))}
          className="btn-cta h-11 flex-1 cursor-pointer whitespace-nowrap rounded-[12px] text-label font-semibold"
        >
          {last ? t('wn.done') : t('wn.next')}
        </button>
      </div>
      <button type="button" onClick={onSeeAll} className="-mt-2 min-h-8 cursor-pointer self-center rounded-[8px] px-2 text-label font-semibold text-link hover:underline">
        {t('wn.all')}
      </button>
    </V2Modal>
  )
}
