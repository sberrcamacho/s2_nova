import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/dashboard/components/Sidebar'
import { Header } from '@/dashboard/components/Header'
import { DashboardFiltersProvider } from '@/dashboard/DashboardFiltersContext'
import { useTranslation } from '@/state/useTranslation'
import type { TranslationKey } from '@/lib/i18n/translations'

const PAGE_META: Record<string, { titleKey: TranslationKey; subtitleKey: TranslationKey }> = {
  '/overview': { titleKey: 'page.overview.title', subtitleKey: 'page.overview.subtitle' },
  '/transactions': { titleKey: 'page.transactions.title', subtitleKey: 'page.transactions.subtitle' },
  '/expenses': { titleKey: 'page.expenses.title', subtitleKey: 'page.expenses.subtitle' },
  '/income': { titleKey: 'page.income.title', subtitleKey: 'page.income.subtitle' },
  '/budgets': { titleKey: 'page.budgets.title', subtitleKey: 'page.budgets.subtitle' },
  '/categories': { titleKey: 'page.categories.title', subtitleKey: 'page.categories.subtitle' },
  '/analytics': { titleKey: 'page.analytics.title', subtitleKey: 'page.analytics.subtitle' },
  '/reports': { titleKey: 'page.reports.title', subtitleKey: 'page.reports.subtitle' },
  '/settings': { titleKey: 'page.settings.title', subtitleKey: 'page.settings.subtitle' },
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { t } = useTranslation()
  const meta = PAGE_META[location.pathname]
  const title = meta ? t(meta.titleKey) : 'S2 Nova'
  const subtitle = meta ? t(meta.subtitleKey) : ''

  return (
    <DashboardFiltersProvider>
      <div className="flex h-screen overflow-hidden bg-bg-secondary">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto mb-5 max-w-[1400px]">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
              {subtitle && <p className="mt-0.5 text-sm font-medium text-ink-tertiary">{subtitle}</p>}
            </div>
            <div className="mx-auto max-w-[1400px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </DashboardFiltersProvider>
  )
}
