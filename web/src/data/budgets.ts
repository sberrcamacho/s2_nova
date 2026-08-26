// Web-only planning number — no backend equivalent (budgets are per-category
// limits; this is an aggregate income target used for the overall summary
// KPI). Kept here since budgetService.getOverallBudgetSummary needs it
// alongside the real, backend-computed per-category totals.
export const monthlyIncomeTarget = 4_800_000
