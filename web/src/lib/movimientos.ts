// How many months the period selector offers, newest first (the Web v2
// mockup shows the current month and the ones before it).
export const PERIOD_MONTHS = 6

// "YYYY-MM" keys for the current month and the n-1 before it.
export function recentMonths(today: string, n = PERIOD_MONTHS): string[] {
  const [y, m] = today.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(y, m - 1 - i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

// Mockup shortWallet: "Bancolombia — Ahorros" reads as "Bancolombia".
export function shortWallet(name: string): string {
  return name.split('—')[0].trim()
}
