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

// Text as the search compares it: lower case and without accents, so "cafe"
// finds "Café" and "ALIMENTACION" finds "Alimentación".
export function searchKey(text: string): string {
  return text.normalize('NFD').replace(/\p{Mn}+/gu, '').toLowerCase()
}

// True when every word of the query appears somewhere in the text, in any
// order. A blank query matches everything.
export function matchesSearch(text: string, query: string): boolean {
  const haystack = searchKey(text)
  return searchKey(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
}
