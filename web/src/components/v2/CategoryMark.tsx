import { CATEGORY_GLYPHS, categoryColor } from '@/lib/categoryGlyphs'
import type { CategoryId } from '@/types'

interface GlyphProps {
  category: CategoryId | 'transfer'
  size: number
  color?: string
}

// The bare category glyph (mockup `CAT_GLYPHS` stroke paths, width 2.25).
export function CategoryGlyph({ category, size, color }: GlyphProps) {
  const paths = CATEGORY_GLYPHS[category] ?? CATEGORY_GLYPHS.other
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? categoryColor(category)}
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

// Category mark per the v2 mockups' `mark(cat, box)`: a circle filled with
// the category color at 16% (hex alpha 0x29) and the glyph at 46% of the box.
export function CategoryMark({ category, box, color }: { category: CategoryId | 'transfer'; box: number; color?: string }) {
  const tint = color ?? categoryColor(category)
  return (
    <span
      aria-hidden="true"
      className="flex flex-none items-center justify-center rounded-full"
      style={{ width: box, height: box, background: `${tint}29` }}
    >
      <CategoryGlyph category={category} size={Math.round(box * 0.46)} color={tint} />
    </span>
  )
}
