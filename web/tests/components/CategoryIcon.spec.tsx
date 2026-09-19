import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { CategoryIcon, getCategoryIcon } from '@/components/ui/CategoryIcon'
import { categories } from '@/data/categories'

// Regression guard: every category's `icon` string must have a matching
// Lucide entry in CategoryIcon's ICONS map, or it silently falls back to
// CircleEllipsis (see web/AGENTS.md's Project Structure note on
// data/categories.ts) — this test fails loudly instead the moment a new
// category is added without its icon wired up.
describe('CategoryIcon', () => {
  it('resolves a real icon (not the silent CircleEllipsis fallback) for every seeded category', () => {
    const Fallback = getCategoryIcon('__definitely_not_a_real_icon__')
    for (const category of categories) {
      // 'other' legitimately maps to CircleEllipsis itself, so it can't be
      // distinguished from the fallback by identity — everyone else must be.
      if (category.icon === 'CircleEllipsis') continue
      const Resolved = getCategoryIcon(category.icon)
      expect(Resolved, `category "${category.id}" has icon "${category.icon}" with no matching Lucide entry`).not.toBe(Fallback)
    }
  })

  it('renders an svg for a known category', () => {
    const { container } = render(<CategoryIcon category="food" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('falls back to CircleEllipsis without crashing for an unknown category id', () => {
    // @ts-expect-error - deliberately outside the CategoryId union
    const { container } = render(<CategoryIcon category="not-a-real-category" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
