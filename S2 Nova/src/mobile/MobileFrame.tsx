import type { ReactNode } from 'react'

// Cosmetic phone bezel for wide (desktop/tablet) viewports so the mobile
// experience previews like a real device. On an actual phone-width viewport
// the frame collapses to full-bleed — this is a presentation wrapper only,
// never part of the mobile UI's own layout logic.
export function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg-secondary py-0 sm:py-10">
      <div
        className="relative flex h-screen w-full flex-col overflow-hidden bg-bg sm:h-[850px] sm:max-h-[92vh] sm:w-[400px] sm:rounded-[2.75rem] sm:border-[10px] sm:border-black sm:shadow-[var(--shadow-lg)] dark:sm:border-[#1a1a1a]"
      >
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 hidden h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-black sm:block" />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
