// Recharts accepts CSS var() strings directly as SVG paint values, so these
// stay in sync automatically when the app switches between light and dark
// — no re-render or JS color lookup required.
export const chartColors = {
  primary: 'var(--color-primary)',
  primarySecondary: 'var(--color-primary-secondary)',
  accentSoft: 'var(--color-accent-soft)',
  positive: 'var(--color-positive)',
  negative: 'var(--color-negative)',
  grid: 'var(--color-border)',
  axis: 'var(--color-ink-tertiary)',
  ink: 'var(--color-ink)',
}

export const axisTickStyle = {
  fontSize: 11,
  fontWeight: 600,
  fill: chartColors.axis,
  fontFamily: 'Inter, sans-serif',
}
