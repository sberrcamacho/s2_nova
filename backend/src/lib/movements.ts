import type { PrismaClient, Transaction } from "@prisma/client";
import { fromMinor } from "./currency.js";
import { outstandingOf } from "./loans.js";

// Shared by routes/transactions.ts, the Programados and goal-plan
// processors: how a movement moves wallet balances and how it goes over the
// wire.

export type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export interface BalanceEffectInput {
  accountId: string;
  transferToAccountId: string | null;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amountMinor: bigint;
  // Minor units of the wallet the movement belongs to when its currency
  // differs (NEW_MOVEMENT.md §6). For a transfer between currencies it is
  // what the destination receives, in the destination's currency.
  walletAmountMinor: bigint | null;
}

// direction 1 applies the movement's effect on wallet balances, -1
// reverses it (before an edit/delete of a COMPLETED movement). A PLANNED
// movement never calls this.
export async function applyBalanceEffect(tx: Tx, effect: BalanceEffectInput, direction: 1 | -1) {
  const sign = direction === 1 ? 1n : -1n;
  if (effect.type === "TRANSFER") {
    await tx.account.update({ where: { id: effect.accountId }, data: { currentBalanceMinor: { increment: -sign * effect.amountMinor } } });
    if (effect.transferToAccountId) {
      const received = effect.walletAmountMinor ?? effect.amountMinor;
      await tx.account.update({ where: { id: effect.transferToAccountId }, data: { currentBalanceMinor: { increment: sign * received } } });
    }
    return;
  }
  const walletMinor = effect.walletAmountMinor ?? effect.amountMinor;
  const delta = effect.type === "EXPENSE" ? -walletMinor : walletMinor;
  await tx.account.update({ where: { id: effect.accountId }, data: { currentBalanceMinor: { increment: sign * delta } } });
}

export function effectOf(row: Pick<Transaction, "accountId" | "transferToAccountId" | "type" | "amountMinor" | "walletAmountMinor">): BalanceEffectInput {
  return {
    accountId: row.accountId,
    transferToAccountId: row.transferToAccountId,
    type: row.type,
    amountMinor: row.amountMinor,
    walletAmountMinor: row.walletAmountMinor,
  };
}

type AttachmentMeta = { id: string; kind: string; mime: string; name: string; size: number; createdAt: Date } | null;

export function serializeTransaction(
  row: Transaction & { attachment?: AttachmentMeta },
  walletCurrencies: Map<string, string>,
  repaidMinor?: bigint,
) {
  const walletCurrency =
    walletCurrencies.get(row.type === "TRANSFER" && row.transferToAccountId ? row.transferToAccountId : row.accountId) ?? row.currency;
  return {
    id: row.id,
    accountId: row.accountId,
    transferToAccountId: row.transferToAccountId,
    type: row.type,
    status: row.status,
    amount: fromMinor(row.amountMinor, row.currency),
    currency: row.currency,
    fxRate: row.fxRate === null ? null : Number(row.fxRate),
    // In the wallet's currency (the destination's, for a transfer).
    walletAmount: row.walletAmountMinor === null ? null : fromMinor(row.walletAmountMinor, walletCurrency),
    categoryId: row.categoryId,
    subcategoryId: row.subcategoryId,
    productId: row.productId,
    budgetId: row.budgetId,
    customBudgetId: row.customBudgetId,
    goalId: row.goalId,
    recurringSeriesId: row.recurringSeriesId,
    loanKind: row.loanKind,
    counterpartyName: row.counterpartyName,
    counterpartyKind: row.counterpartyKind,
    dueDate: row.dueDate,
    loanSettledAt: row.loanSettledAt,
    settledByTransactionId: row.settledByTransactionId,
    parentLoanId: row.parentLoanId,
    // Only loans carry an outstanding balance; null for everything else.
    outstanding: row.loanKind ? fromMinor(outstandingOf(row, repaidMinor), row.currency) : null,
    paymentMethod: row.paymentMethod,
    // "Título" (optional). Display falls back to note, then the category.
    description: row.description,
    merchant: row.merchant,
    note: row.note,
    date: row.transactionDate,
    occurredAt: row.occurredAt ?? row.transactionDate,
    attachment: row.attachment
      ? {
          id: row.attachment.id,
          kind: row.attachment.kind,
          mime: row.attachment.mime,
          name: row.attachment.name,
          size: row.attachment.size,
          createdAt: row.attachment.createdAt,
        }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const attachmentMetaSelect = {
  select: { id: true, kind: true, mime: true, name: true, size: true, createdAt: true },
} as const;

export async function walletCurrencyMap(tx: Tx, userId: string): Promise<Map<string, string>> {
  const rows = await tx.account.findMany({ where: { userId }, select: { id: true, currency: true } });
  return new Map(rows.map((r) => [r.id, r.currency]));
}
