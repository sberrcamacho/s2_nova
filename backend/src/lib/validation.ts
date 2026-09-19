import { z } from "zod";

// A plain regex (`^\d{4}-\d{2}-\d{2}$`) matches syntactically-shaped but
// calendar-invalid strings like "2026-02-30" or "2026-13-01" — `new
// Date(...)` (see parseDateOnly in dates.ts) then silently rolls those
// over into a *different*, wrong date instead of rejecting them. Round-
// tripping the parsed value's Y/M/D back through `Date.UTC` and comparing
// catches that overflow. Shared here instead of the five near-identical
// regexes this replaced (transactions.ts, recurringSeries.ts, goals.ts x2,
// budgets.ts) so a future date-format rule only needs to change in one
// place.
function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date.")
  .refine(
    (value) => {
      const parts = value.split("-").map(Number) as [number, number, number];
      return isValidCalendarDate(parts[0], parts[1], parts[2]);
    },
    { message: "Not a real calendar date." },
  );

export const monthKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Expected a YYYY-MM month key.")
  .refine(
    (value) => {
      const month = Number(value.split("-")[1]);
      return month >= 1 && month <= 12;
    },
    { message: "Not a real calendar month." },
  );
