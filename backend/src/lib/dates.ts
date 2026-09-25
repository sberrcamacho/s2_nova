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

// Last valid UTC day-of-month for `year`/`month` (0-indexed month, same as
// Date's own convention) — day 0 of the *following* month is always the
// last day of `month`.
function lastDayOfUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// `Date.prototype.setUTCMonth`/`setUTCFullYear` silently overflow into the
// next month when the target month has fewer days than `date`'s
// day-of-month (e.g. Jan 31 + 1 month natively becomes Mar 3, skipping
// February entirely instead of landing on Feb 28) — a real bug for a
// MONTHLY/YEARLY RecurringSeries, which would permanently drift off its
// original day. Clamp to the target month's last valid day instead, the
// standard "add a calendar interval" semantics (also matches how most
// billing systems handle a monthly charge anchored to day 29-31).
export type Interval = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export function addInterval(date: Date, interval: Interval): Date {
  if (interval === "DAILY" || interval === "WEEKLY") {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + (interval === "DAILY" ? 1 : 7));
    return result;
  }

  const day = date.getUTCDate();
  const targetYear = interval === "YEARLY" ? date.getUTCFullYear() + 1 : date.getUTCFullYear();
  const targetMonth = interval === "YEARLY" ? date.getUTCMonth() : date.getUTCMonth() + 1;
  const clampedDay = Math.min(day, lastDayOfUtcMonth(targetYear, targetMonth));

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      clampedDay,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
