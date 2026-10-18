import { AjCard, AjSubHeader } from '@/dashboard/components/ajustes/AjustesUi'
import { CHANGELOG, changelogImage } from '@/lib/changelog'
import { formatLongDate } from '@/lib/date'
import { fill } from '@/lib/i18n/translations'
import { useTheme } from '@/state/ThemeContext'
import { useTranslation } from '@/state/useTranslation'

// Ajustes › Novedades: what changed in each version, newest first.
export default function NovedadesPage() {
  const { t, language } = useTranslation()
  const { theme } = useTheme()

  return (
    <div className="flex max-w-[816px] flex-col gap-5 px-4 pt-6 pb-12 min-[760px]:px-8 min-[760px]:pt-8">
      <AjSubHeader title={t('wn.title')} subtitle={t('wn.subtitle')} />
      {CHANGELOG.map((version, v) => (
        <AjCard key={version.version} className="p-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-title font-semibold text-ink">{fill(t('wn.version'), version.version)}</h2>
            {v === 0 && <span className="whitespace-nowrap rounded-full border border-primary-border px-2 py-0.5 text-caption font-semibold text-link">{t('wn.current')}</span>}
          </div>
          <div className="text-body-sm text-ink-tertiary">{formatLongDate(version.date, language)}</div>
          <ul className="mt-4 flex flex-col gap-3">
            {version.items.map((item) => (
              <li key={item.image} className="flex flex-col gap-3 rounded-[16px] border border-border p-3 min-[560px]:flex-row min-[560px]:items-start">
                <img
                  src={changelogImage(item.image, theme)}
                  alt=""
                  loading="lazy"
                  className="aspect-[3/2] w-full flex-none rounded-[12px] border border-border bg-surface-sunken object-cover object-top min-[560px]:w-[168px]"
                />
                <div className="min-w-0">
                  <h3 className="text-title-sm font-semibold text-ink">{item.title[language]}</h3>
                  <p className="mt-1 text-body-sm text-ink-secondary">{item.body[language]}</p>
                </div>
              </li>
            ))}
          </ul>
          {version.also.length > 0 && (
            <>
              <h3 className="mt-5 text-title-sm font-semibold text-ink">{t('wn.also')}</h3>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-body-sm text-ink-secondary marker:text-ink-tertiary">
                {version.also.map((line) => (
                  <li key={line.es}>{line[language]}</li>
                ))}
              </ul>
            </>
          )}
        </AjCard>
      ))}
    </div>
  )
}
