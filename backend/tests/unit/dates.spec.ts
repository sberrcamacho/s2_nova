import { describe, expect, it } from "vitest";
import { addInterval, currentMonthKey, monthEnd, monthKeyOf, monthStart, parseDateOnly } from "../../src/lib/dates.js";

describe("parseDateOnly", () => {
  it("parses a calendar date as UTC midnight", () => {
    const date = parseDateOnly("2026-03-15");
    expect(date.toISOString()).toBe("2026-03-15T00:00:00.000Z");
  });
});

describe("monthStart / monthEnd", () => {
  it("computes the first and last instant of a month", () => {
    expect(monthStart("2026-02").toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(monthEnd("2026-02").toISOString()).toBe("2026-02-28T23:59:59.999Z");
  });

  it("handles a leap-year February", () => {
    expect(monthEnd("2028-02").toISOString()).toBe("2028-02-29T23:59:59.999Z");
  });

  it("handles December correctly (year rollover)", () => {
    expect(monthEnd("2026-12").toISOString()).toBe("2026-12-31T23:59:59.999Z");
  });
});

describe("monthKeyOf / currentMonthKey", () => {
  it("formats a Date back into a YYYY-MM key", () => {
    expect(monthKeyOf(new Date("2026-07-04T12:00:00.000Z"))).toBe("2026-07");
  });

  it("currentMonthKey matches today's UTC year-month", () => {
    const now = new Date();
    const expected = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    expect(currentMonthKey()).toBe(expected);
  });
});

describe("addInterval", () => {
  it("WEEKLY always adds exactly 7 days, never overflows a month", () => {
    expect(addInterval(new Date("2026-01-28T00:00:00.000Z"), "WEEKLY").toISOString()).toBe(
      "2026-02-04T00:00:00.000Z",
    );
  });

  // Regression test for a real recurring-series bug: a MONTHLY series that
  // starts on the 31st drifts permanently off its original day, because
  // `Date.prototype.setUTCMonth` silently overflows into the following
  // month when the target month is shorter than the current day-of-month
  // (Feb has at most 29 days, so "Jan 31 + 1 month" natively becomes
  // "Mar 3", not "Feb 28"). The fix clamps to the last valid day of the
  // target month instead.
  it("MONTHLY clamps to the last day of the target month instead of overflowing (Jan 31 -> Feb 28)", () => {
    const result = addInterval(new Date("2026-01-31T00:00:00.000Z"), "MONTHLY");
    expect(result.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });

  it("MONTHLY clamps into a leap-year February 29th when applicable", () => {
    const result = addInterval(new Date("2028-01-31T00:00:00.000Z"), "MONTHLY");
    expect(result.toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });

  it("MONTHLY on a day that exists in every month just advances normally", () => {
    const result = addInterval(new Date("2026-03-15T00:00:00.000Z"), "MONTHLY");
    expect(result.toISOString()).toBe("2026-04-15T00:00:00.000Z");
  });

  it("MONTHLY on the 30th rolls correctly past a clamped February into March", () => {
    // Jan 30 -> Feb (clamped to 28, non-leap 2026) -> next MONTHLY call
    // should advance from that clamped date, i.e. Feb 28 -> Mar 28, not
    // try to "remember" the original 30th.
    const feb = addInterval(new Date("2026-01-30T00:00:00.000Z"), "MONTHLY");
    expect(feb.toISOString()).toBe("2026-02-28T00:00:00.000Z");
    const mar = addInterval(feb, "MONTHLY");
    expect(mar.toISOString()).toBe("2026-03-28T00:00:00.000Z");
  });

  // Regression test: a YEARLY series starting on a leap day rolls into
  // March 1st on a non-leap year unless clamped to Feb 28.
  it("YEARLY clamps Feb 29 into Feb 28 on a following non-leap year", () => {
    const result = addInterval(new Date("2028-02-29T00:00:00.000Z"), "YEARLY");
    expect(result.toISOString()).toBe("2029-02-28T00:00:00.000Z");
  });

  it("YEARLY on a normal date just advances the year", () => {
    const result = addInterval(new Date("2026-06-10T00:00:00.000Z"), "YEARLY");
    expect(result.toISOString()).toBe("2027-06-10T00:00:00.000Z");
  });
});
