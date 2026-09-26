import { categoryGlyph, categoryColor, useCategories } from '@/lib/backendCategories'
import { planIcon } from '@/lib/taxonomy'
import type { CategoryId } from '@/types'

// A stroke glyph (24×24 taxonomy paths).
export function Glyph({ paths, size, color, strokeWidth = 2.25 }: { paths: string[]; size: number; color: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

// The bare category glyph (width 2.25).
export function CategoryGlyph({ category, size, color }: { category: CategoryId; size: number; color?: string }) {
  useCategories()
  return <Glyph paths={categoryGlyph(category)} size={size} color={color ?? categoryColor(category)} />
}

// A circle filled with the color at 16% (hex alpha 0x29) and the glyph at
// 46% of the box — the v2 mockups' `mark(cat, box)`.
export function GlyphMark({ paths, color, box }: { paths: string[]; color: string; box: number }) {
  return (
    <span aria-hidden="true" className="flex flex-none items-center justify-center rounded-full" style={{ width: box, height: box, background: `${color}29` }}>
      <Glyph paths={paths} size={Math.round(box * 0.46)} color={color} />
    </span>
  )
}

export function CategoryMark({ category, box, color }: { category: CategoryId; box: number; color?: string }) {
  useCategories()
  const tint = color ?? categoryColor(category)
  return <GlyphMark paths={categoryGlyph(category)} color={tint} box={box} />
}

// Goals and custom budgets use a plan icon, not a category.
export function PlanMark({ icon, box }: { icon: string | undefined; box: number }) {
  const p = planIcon(icon)
  return <GlyphMark paths={p.glyph} color={p.color} box={box} />
}
