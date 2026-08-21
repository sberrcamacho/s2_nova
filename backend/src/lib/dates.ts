// All transaction/budget dates are stored as Postgres DATE (UTC midnight,
// no time component) — every helper here works in UTC to avoid local-TZ
// drift shifting a date by a day.

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function monthStart(monthKey: string): Date {
  return new Date(`${monthKey}-01T00:00:00.000Z`);
}

export function monthEnd(monthKey: string): Date {
  const start = monthStart(monthKey);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthKeyOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function addInterval(date: Date, interval: "WEEKLY" | "MONTHLY" | "YEARLY"): Date {
  const result = new Date(date);
  if (interval === "WEEKLY") result.setUTCDate(result.getUTCDate() + 7);
  if (interval === "MONTHLY") result.setUTCMonth(result.getUTCMonth() + 1);
  if (interval === "YEARLY") result.setUTCFullYear(result.getUTCFullYear() + 1);
  return result;
}
