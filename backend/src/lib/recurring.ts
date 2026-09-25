import type { RecurringSeries } from "@prisma/client";
import { addInterval, type Interval } from "./dates.js";
import { convertMinor, referenceRate } from "./currency.js";
import { applyBalanceEffect, type Tx } from "./movements.js";
import { prisma } from "./prisma.js";

// Programados (RecurringSeries). A series produces a movement only when the
// user confirms a due date, except "Registrar automáticamente"
// (autoConfirm), whose due dates are recorded the next time the user's data
// is read (processDueSeries, called from the list endpoints) — there is no
// timer, so nothing runs while nobody is looking.

// Has the series used up its "Termina" rule once `next` is its next date?
export function seriesEnded(series: Pick<RecurringSeries, "occurrences" | "occurrencesDone" | "endDate">, next: Date): boolean {
  if (series.occurrences !== null && series.occurrencesDone >= series.occurrences) return true;
  if (series.endDate !== null && next > series.endDate) return true;
  return false;
}

// Moves the series past its current date (after a confirm or skip) and
// pauses it when its end rule is reached.
export function advanceData(series: RecurringSeries) {
  const next = addInterval(series.nextOccurrenceDate, series.interval as Interval);
  const done = series.occurrencesDone + 1;
  const ended = seriesEnded({ ...series, occurrencesDone: done }, next);
  return { nextOccurrenceDate: next, occurrencesDone: done, active: ended ? false : series.active };
}

// Records one occurrence of the series as a COMPLETED movement.
export async function materializeOccurrence(tx: Tx, series: RecurringSeries, date: Date, amountMinor = series.amountMinor) {
  const account = await tx.account.findUniqueOrThrow({ where: { id: series.accountId } });
  const foreign = series.currency !== account.currency;
  const rate = foreign ? referenceRate(series.currency, account.currency) : null;
  const walletAmountMinor = foreign ? convertMinor(amountMinor, series.currency, account.currency, rate!) : null;
  const occurredAt = new Date(date);
  const transaction = await tx.transaction.create({
    data: {
      userId: series.userId,
      accountId: series.accountId,
      type: series.type,
      status: "COMPLETED",
      amountMinor,
      currency: series.currency,
      fxRate: rate,
      walletAmountMinor,
      categoryId: series.categoryId,
      subcategoryId: series.subcategoryId,
      customBudgetId: series.customBudgetId,
      counterpartyName: series.counterpartyName,
      counterpartyKind: series.counterpartyKind,
      paymentMethod: series.paymentMethod,
      description: series.name,
      note: series.note,
      recurringSeriesId: series.id,
      transactionDate: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())),
      occurredAt,
    },
  });
  await applyBalanceEffect(
    tx,
    { accountId: series.accountId, transferToAccountId: null, type: series.type, amountMinor, walletAmountMinor },
    1,
  );
  return transaction;
}

// Records every due date of the user's automatic series, up to `today`.
export async function processDueSeries(userId: string, today: Date) {
  const due = await prisma.recurringSeries.findMany({
    where: { userId, active: true, autoConfirm: true, nextOccurrenceDate: { lte: today } },
  });
  for (const initial of due) {
    await prisma.$transaction(async (tx) => {
      let series = initial;
      // Bounded: a daily series left alone for a long time still stops.
      for (let i = 0; i < 400 && series.active && series.nextOccurrenceDate <= today; i++) {
        await materializeOccurrence(tx, series, series.nextOccurrenceDate);
        series = await tx.recurringSeries.update({ where: { id: series.id }, data: advanceData(series) });
      }
    });
  }
}
