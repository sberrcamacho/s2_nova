import type { FastifyInstance } from "fastify";
import { computeProgress } from "../lib/goalProgress.js";
import { loanRepaidMap, outstandingOf } from "../lib/loans.js";
import { prisma } from "../lib/prisma.js";

// "Guardar una copia" on the delete-account screen: one CSV with a block
// per kind of record (movimientos, presupuestos, metas, préstamos), each
// with its own header row and separated by a blank line. Headers are the
// Spanish UI vocabulary since the file is for the user, not for import.
// Amounts are whole pesos (amount_minor is the peso value, see bigint.ts).

const TYPE_LABEL = { INCOME: "Ingreso", EXPENSE: "Gasto", TRANSFER: "Transferencia" } as const;
const STATUS_LABEL = { COMPLETED: "Registrado", PLANNED: "Próximo" } as const;
const LOAN_LABEL = { LENT: "Prestado", BORROWED: "Recibido" } as const;

function cell(value: string | number | bigint | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function day(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function block(title: string, header: string[], rows: (string | number | bigint | null | undefined)[][]): string {
  return [title, header.join(","), ...rows.map((row) => row.map(cell).join(","))].join("\r\n");
}

export async function dataExportRoutes(app: FastifyInstance) {
  app.get("/me/export", { preHandler: app.authenticate }, async (request, reply) => {
    const userId = request.userId!;
    const [transactions, budgets, goals] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
        include: { account: true, transferToAccount: true, category: true, subcategory: true },
      }),
      prisma.budget.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, include: { category: true } }),
      prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    ]);

    const loans = transactions.filter((tx) => tx.loanKind !== null);
    const repaid = await loanRepaidMap(loans.map((loan) => loan.id));
    const saved = await Promise.all(goals.map((goal) => computeProgress(goal.id)));

    const csv = [
      block(
        "Movimientos",
        ["Fecha", "Tipo", "Estado", "Descripción", "Comercio", "Categoría", "Subcategoría", "Billetera", "Billetera destino", "Monto", "Nota"],
        transactions.map((tx) => [
          day(tx.transactionDate),
          TYPE_LABEL[tx.type],
          STATUS_LABEL[tx.status],
          tx.description,
          tx.merchant,
          tx.category.name,
          tx.subcategory?.name,
          tx.account.name,
          tx.transferToAccount?.name,
          tx.amountMinor,
          tx.note,
        ]),
      ),
      block(
        "Presupuestos",
        ["Nombre", "Categoría", "Límite mensual", "Desde", "Hasta"],
        budgets.map((budget) => [budget.name, budget.category?.name ?? "Personalizado", budget.amountMinor, day(budget.startDate), day(budget.endDate)]),
      ),
      block(
        "Metas",
        ["Nombre", "Objetivo", "Ahorrado", "Fecha objetivo"],
        goals.map((goal, i) => [goal.name, goal.targetAmountMinor, saved[i], day(goal.targetDate)]),
      ),
      block(
        "Préstamos",
        ["Fecha", "Tipo", "Persona", "Monto", "Pendiente", "Vence", "Billetera"],
        loans.map((loan) => [
          day(loan.transactionDate),
          LOAN_LABEL[loan.loanKind!],
          loan.counterpartyName,
          loan.amountMinor,
          outstandingOf(loan, repaid.get(loan.id)),
          day(loan.dueDate),
          loan.account.name,
        ]),
      ),
    ].join("\r\n\r\n");

    const today = new Date().toISOString().slice(0, 10);
    return reply
      .header("content-type", "text/csv; charset=utf-8")
      .header("content-disposition", `attachment; filename="s2-nova-${today}.csv"`)
      // BOM so Excel opens the accents as UTF-8.
      .send(`﻿${csv}\r\n`);
  });
}
