import { useEffect, useRef } from 'react'

// Which of `ids` arrived after the list first showed, so only a row that was
// just added (a movement saved) animates in; the first load, and a new
// `scope` (another month), show at once. Pairs with `animate-row-in`.
export function useFreshIds(ids: readonly string[], ready: boolean, scope: string): (id: string) => boolean {
  const seen = useRef<{ scope: string; ids: Set<string> } | null>(null)
  const known = seen.current?.scope === scope ? seen.current.ids : null

  useEffect(() => {
    if (!ready) return
    const ids0 = seen.current?.scope === scope ? seen.current.ids : new Set<string>()
    for (const id of ids) ids0.add(id)
    seen.current = { scope, ids: ids0 }
  }, [ids, ready, scope])

  return (id) => known !== null && !known.has(id)
}
