// Goals get their own fixed category set — distinct from the shared
// Budget/Goal decorative theme palette (budgetGoalThemes.ts) and from the
// transaction Category table — because a goal describes what it's *for*
// (Emergency fund, Travel, ...), not what it's spent on. Stored in the same
// `Goal.themeIcon` column as before (no schema change), just validated
// against this list instead of the generic one now that Goals have real
// categories of their own. Mirrors
// android/app/src/main/java/com/s2nova/app/ui/components/GoalCategory.kt —
// keep both lists (and colors) in sync.
export const GOAL_CATEGORY_IDS = [
  "EMERGENCY",
  "TRAVEL",
  "EDUCATION",
  "HOUSING",
  "VEHICLE",
  "TECHNOLOGY",
  "HEALTH",
  "DEBT",
  "RETIREMENT",
  "OTHER",
] as const;

export type GoalCategoryId = (typeof GOAL_CATEGORY_IDS)[number];
