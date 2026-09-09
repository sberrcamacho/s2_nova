// Fixed palette of (icon, color) pairs a Budget or Goal may optionally pick
// as a purely cosmetic override — decoupled from the Category table (see
// schema.prisma's Budget.themeIcon/Goal.themeIcon doc comments). Mirrors
// android/app/src/main/java/com/s2nova/app/ui/components/BudgetGoalTheme.kt
// — keep both lists in sync if a theme is added or removed.
export const BUDGET_GOAL_THEME_IDS = [
  "FLAG",
  "STAR",
  "HOME",
  "TROPHY",
  "FLIGHT",
  "BEACH",
  "FITNESS",
  "CELEBRATION",
  "GIFT",
  "DIAMOND",
  "SAVINGS",
  "TRENDING_UP",
  "PETS",
  "FAMILY",
] as const;

export type BudgetGoalThemeId = (typeof BUDGET_GOAL_THEME_IDS)[number];
