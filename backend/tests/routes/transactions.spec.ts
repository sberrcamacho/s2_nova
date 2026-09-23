import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/app.js";
import { authHeader, createTestUser } from "../helpers/testUser.js";
import { categoryBySlug, createAccount } from "../helpers/factories.js";
import { prisma } from "../../src/lib/prisma.js";

describe("transaction routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /transactions", () => {
    it("creates an EXPENSE and decrements the wallet balance", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { type: "CASH", initialBalanceMinor: 100000n });
      const category = await categoryBySlug("food");

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: {
          accountId: wallet.id,
          type: "EXPENSE",
          amount: 15000,
          categoryId: category.id,
          description: "Lunch",
          date: "2026-06-01",
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().paymentMethod).toBe("CASH");

      const walletAfter = await prisma.account.findUniqueOrThrow({ where: { id: wallet.id } });
      expect(walletAfter.currentBalanceMinor).toBe(85000n);
    });

    it("creates an INCOME and increments the wallet balance", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { type: "BANK_DEBIT", initialBalanceMinor: 0n });
      const category = await categoryBySlug("salary");

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: { accountId: wallet.id, type: "INCOME", amount: 200000, categoryId: category.id, description: "Pay", date: "2026-06-01" },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().paymentMethod).toBe("BANK_TRANSFER");

      const walletAfter = await prisma.account.findUniqueOrThrow({ where: { id: wallet.id } });
      expect(walletAfter.currentBalanceMinor).toBe(200000n);
    });

    it("a PLANNED transaction does not move the wallet balance", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 50000n });
      const category = await categoryBySlug("bills");

      await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: {
          accountId: wallet.id,
          type: "EXPENSE",
          status: "PLANNED",
          amount: 20000,
          categoryId: category.id,
          description: "Upcoming rent",
          date: "2026-07-01",
        },
      });

      const walletAfter = await prisma.account.findUniqueOrThrow({ where: { id: wallet.id } });
      expect(walletAfter.currentBalanceMinor).toBe(50000n);
    });

    it("TRANSFER moves money from the source to the destination wallet", async () => {
      const user = await createTestUser();
      const source = await createAccount(user.id, { name: "Source", initialBalanceMinor: 100000n });
      const destination = await createAccount(user.id, { name: "Destination", initialBalanceMinor: 0n });
      const category = await categoryBySlug("other");

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: {
          accountId: source.id,
          transferToAccountId: destination.id,
          type: "TRANSFER",
          amount: 30000,
          categoryId: category.id,
          description: "Move funds",
          date: "2026-06-01",
        },
      });
      expect(res.statusCode).toBe(201);

      const sourceAfter = await prisma.account.findUniqueOrThrow({ where: { id: source.id } });
      const destinationAfter = await prisma.account.findUniqueOrThrow({ where: { id: destination.id } });
      expect(sourceAfter.currentBalanceMinor).toBe(70000n);
      expect(destinationAfter.currentBalanceMinor).toBe(30000n);
    });

    it("rejects TRANSFER without transferToAccountId", async () => {
      const user = await createTestUser();
      const source = await createAccount(user.id);
      const category = await categoryBySlug("other");
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: { accountId: source.id, type: "TRANSFER", amount: 1000, categoryId: category.id, description: "x", date: "2026-06-01" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("rejects a TRANSFER whose destination equals its source", async () => {
      const user = await createTestUser();
      const source = await createAccount(user.id);
      const category = await categoryBySlug("other");
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: {
          accountId: source.id,
          transferToAccountId: source.id,
          type: "TRANSFER",
          amount: 1000,
          categoryId: category.id,
          description: "x",
          date: "2026-06-01",
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it("rejects a negative or zero amount", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const category = await categoryBySlug("food");
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: { accountId: wallet.id, type: "EXPENSE", amount: 0, categoryId: category.id, description: "x", date: "2026-06-01" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("rejects a nonexistent account with 422", async () => {
      const user = await createTestUser();
      const category = await categoryBySlug("food");
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: {
          accountId: "00000000-0000-0000-0000-000000000000",
          type: "EXPENSE",
          amount: 1000,
          categoryId: category.id,
          description: "x",
          date: "2026-06-01",
        },
      });
      expect(res.statusCode).toBe(422);
    });

    it("rejects another user's account with 422 (never confirms it merely doesn't belong to you vs. doesn't exist)", async () => {
      const user = await createTestUser();
      const stranger = await createTestUser();
      const strangerWallet = await createAccount(stranger.id);
      const category = await categoryBySlug("food");
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: { accountId: strangerWallet.id, type: "EXPENSE", amount: 1000, categoryId: category.id, description: "x", date: "2026-06-01" },
      });
      expect(res.statusCode).toBe(422);
    });

    it("rejects a syntactically-valid but calendar-invalid date (e.g. Feb 30)", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const category = await categoryBySlug("food");
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: { accountId: wallet.id, type: "EXPENSE", amount: 1000, categoryId: category.id, description: "x", date: "2026-02-30" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("accepts a valid subcategory of the given category", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const category = await categoryBySlug("food");
      const subcategory = await categoryBySlug("food-groceries");
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: {
          accountId: wallet.id,
          type: "EXPENSE",
          amount: 1000,
          categoryId: category.id,
          subcategoryId: subcategory.id,
          description: "x",
          date: "2026-06-01",
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it("rejects a subcategory that doesn't belong to the given category", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const category = await categoryBySlug("food");
      const wrongSubcategory = await categoryBySlug("transportation-fuel");
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: {
          accountId: wallet.id,
          type: "EXPENSE",
          amount: 1000,
          categoryId: category.id,
          subcategoryId: wrongSubcategory.id,
          description: "x",
          date: "2026-06-01",
        },
      });
      expect(res.statusCode).toBe(422);
    });

    // Regression test for a real bug: nothing enforced that a LENT record
    // is an EXPENSE (money leaving your wallet) and a BORROWED record is an
    // INCOME (money entering it) — the two are opposite directions by
    // definition, so a mismatched pairing was nonsensical but previously
    // accepted.
    it("rejects a loanKind that doesn't match its required transaction type (LENT must be EXPENSE)", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const category = await categoryBySlug("other");
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: {
          accountId: wallet.id,
          type: "INCOME",
          amount: 1000,
          categoryId: category.id,
          loanKind: "LENT",
          description: "x",
          date: "2026-06-01",
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it("rejects a loanKind that doesn't match its required transaction type (BORROWED must be INCOME)", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const category = await categoryBySlug("other");
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: {
          accountId: wallet.id,
          type: "EXPENSE",
          amount: 1000,
          categoryId: category.id,
          loanKind: "BORROWED",
          description: "x",
          date: "2026-06-01",
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("PATCH /transactions/:id", () => {
    it("reconciles the wallet balance when the amount changes", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 100000n });
      const category = await categoryBySlug("food");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: { accountId: wallet.id, type: "EXPENSE", amount: 20000, categoryId: category.id, description: "x", date: "2026-06-01" },
      });
      const id = createRes.json().id;

      const patchRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/transactions/${id}`,
        headers: authHeader(user),
        payload: { amount: 50000 },
      });
      expect(patchRes.statusCode).toBe(200);

      const walletAfter = await prisma.account.findUniqueOrThrow({ where: { id: wallet.id } });
      expect(walletAfter.currentBalanceMinor).toBe(50000n); // 100000 - 50000
    });

    // Regression test for a real bug: PATCHing a TRANSFER's `accountId` to
    // equal its own (immutable) transferToAccountId used to be accepted —
    // applyBalanceEffect would decrement then increment the very same
    // account (net zero) while the stored row nonsensically had
    // accountId === transferToAccountId.
    it("rejects patching a TRANSFER's accountId to equal its own transferToAccountId", async () => {
      const user = await createTestUser();
      const source = await createAccount(user.id, { name: "Source" });
      const destination = await createAccount(user.id, { name: "Destination" });
      const category = await categoryBySlug("other");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: {
          accountId: source.id,
          transferToAccountId: destination.id,
          type: "TRANSFER",
          amount: 10000,
          categoryId: category.id,
          description: "x",
          date: "2026-06-01",
        },
      });
      const id = createRes.json().id;

      const patchRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/transactions/${id}`,
        headers: authHeader(user),
        payload: { accountId: destination.id },
      });
      expect(patchRes.statusCode).toBe(422);
    });

    // Pre-existing guard (not part of the loanKind/type fix below): PATCH
    // can only set loanKind on a transaction that was already created as a
    // loan record — the handler rejects adding it to an ordinary
    // transaction after the fact.
    it("rejects setting loanKind on a transaction that wasn't created as a loan record", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const category = await categoryBySlug("other");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: { accountId: wallet.id, type: "INCOME", amount: 10000, categoryId: category.id, description: "x", date: "2026-06-01" },
      });
      const id = createRes.json().id;

      const patchRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/transactions/${id}`,
        headers: authHeader(user),
        payload: { loanKind: "LENT" },
      });
      expect(patchRes.statusCode).toBe(422);
    });

    it("returns 404 for another user's transaction", async () => {
      const owner = await createTestUser();
      const stranger = await createTestUser();
      const wallet = await createAccount(owner.id);
      const category = await categoryBySlug("food");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(owner),
        payload: { accountId: wallet.id, type: "EXPENSE", amount: 1000, categoryId: category.id, description: "x", date: "2026-06-01" },
      });
      const id = createRes.json().id;

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/transactions/${id}`,
        headers: authHeader(stranger),
        payload: { amount: 2000 },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /transactions/:id", () => {
    it("reverses the balance effect before deleting", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 100000n });
      const category = await categoryBySlug("food");
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: { accountId: wallet.id, type: "EXPENSE", amount: 20000, categoryId: category.id, description: "x", date: "2026-06-01" },
      });
      const id = createRes.json().id;

      const deleteRes = await app.inject({ method: "DELETE", url: `/api/v1/transactions/${id}`, headers: authHeader(user) });
      expect(deleteRes.statusCode).toBe(204);

      const walletAfter = await prisma.account.findUniqueOrThrow({ where: { id: wallet.id } });
      expect(walletAfter.currentBalanceMinor).toBe(100000n);
    });
  });

  describe("POST /transactions/:id/settle-loan", () => {
    it("LENT settlement is an INCOME that increases the wallet balance", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 0n });
      const category = await categoryBySlug("other");

      const loanRes = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: {
          accountId: wallet.id,
          type: "EXPENSE",
          amount: 50000,
          categoryId: category.id,
          loanKind: "LENT",
          counterpartyName: "Friend",
          description: "Lent money",
          date: "2026-06-01",
        },
      });
      const loanId = loanRes.json().id;

      const settleRes = await app.inject({
        method: "POST",
        url: `/api/v1/transactions/${loanId}/settle-loan`,
        headers: authHeader(user),
        payload: {},
      });
      expect(settleRes.statusCode).toBe(200);
      expect(settleRes.json().settlement.type).toBe("INCOME");
      expect(settleRes.json().original.loanSettledAt).not.toBeNull();

      const walletAfter = await prisma.account.findUniqueOrThrow({ where: { id: wallet.id } });
      // -50000 (the loan itself) + 50000 (settlement) = 0
      expect(walletAfter.currentBalanceMinor).toBe(0n);
    });

    it("supports a partial repayment, leaving the loan unsettled until the full amount is paid", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 0n });
      const category = await categoryBySlug("other");

      const loanRes = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: {
          accountId: wallet.id,
          type: "EXPENSE",
          amount: 100000,
          categoryId: category.id,
          loanKind: "LENT",
          description: "Lent money",
          date: "2026-06-01",
        },
      });
      const loanId = loanRes.json().id;

      const firstPartial = await app.inject({
        method: "POST",
        url: `/api/v1/transactions/${loanId}/settle-loan`,
        headers: authHeader(user),
        payload: { amount: 40000 },
      });
      expect(firstPartial.statusCode).toBe(200);
      expect(firstPartial.json().original.loanSettledAt).toBeNull();

      const secondPartial = await app.inject({
        method: "POST",
        url: `/api/v1/transactions/${loanId}/settle-loan`,
        headers: authHeader(user),
        payload: { amount: 60000 },
      });
      expect(secondPartial.statusCode).toBe(200);
      expect(secondPartial.json().original.loanSettledAt).not.toBeNull();
    });

    it("rejects overpaying beyond the outstanding amount", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const category = await categoryBySlug("other");
      const loanRes = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: { accountId: wallet.id, type: "EXPENSE", amount: 50000, categoryId: category.id, loanKind: "LENT", description: "x", date: "2026-06-01" },
      });
      const loanId = loanRes.json().id;

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/transactions/${loanId}/settle-loan`,
        headers: authHeader(user),
        payload: { amount: 999999 },
      });
      expect(res.statusCode).toBe(422);
    });

    it("rejects settling twice", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const category = await categoryBySlug("other");
      const loanRes = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: { accountId: wallet.id, type: "EXPENSE", amount: 50000, categoryId: category.id, loanKind: "LENT", description: "x", date: "2026-06-01" },
      });
      const loanId = loanRes.json().id;

      await app.inject({ method: "POST", url: `/api/v1/transactions/${loanId}/settle-loan`, headers: authHeader(user), payload: {} });
      const res = await app.inject({ method: "POST", url: `/api/v1/transactions/${loanId}/settle-loan`, headers: authHeader(user), payload: {} });
      expect(res.statusCode).toBe(409);
    });

    it("rejects settling a transaction that isn't a loan record at all", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const category = await categoryBySlug("food");
      const txnRes = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: { accountId: wallet.id, type: "EXPENSE", amount: 1000, categoryId: category.id, description: "x", date: "2026-06-01" },
      });
      const id = txnRes.json().id;

      const res = await app.inject({ method: "POST", url: `/api/v1/transactions/${id}/settle-loan`, headers: authHeader(user), payload: {} });
      expect(res.statusCode).toBe(422);
    });

    // Regression test for a real bug: a PLANNED ("Upcoming") loan was never
    // disbursed — applyBalanceEffect never ran for it — but settle-loan
    // used to still create a real, balance-affecting settlement
    // transaction, letting money "return" from a loan that never actually
    // moved.
    it("rejects settling a loan that's still PLANNED (never confirmed/disbursed)", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 100000n });
      const category = await categoryBySlug("other");
      const loanRes = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: {
          accountId: wallet.id,
          type: "EXPENSE",
          status: "PLANNED",
          amount: 50000,
          categoryId: category.id,
          loanKind: "LENT",
          description: "Planned loan",
          date: "2026-08-01",
        },
      });
      const loanId = loanRes.json().id;

      const res = await app.inject({ method: "POST", url: `/api/v1/transactions/${loanId}/settle-loan`, headers: authHeader(user), payload: {} });
      expect(res.statusCode).toBe(422);

      const walletAfter = await prisma.account.findUniqueOrThrow({ where: { id: wallet.id } });
      expect(walletAfter.currentBalanceMinor).toBe(100000n);
    });

    // Regression test for a TOCTOU race: two concurrent settle-loan calls
    // for the same loan used to both read the same `paidSoFar` before
    // either wrote, letting both pass the `<= outstanding` check and
    // jointly overpay. The fix takes a row lock (`SELECT ... FOR UPDATE`)
    // inside the transaction before reading `paidSoFar`, serializing
    // concurrent settlement attempts on the same loan.
    it("does not allow two concurrent partial settlements to jointly overpay a loan", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const category = await categoryBySlug("other");
      const loanRes = await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: { accountId: wallet.id, type: "EXPENSE", amount: 100000, categoryId: category.id, loanKind: "LENT", description: "x", date: "2026-06-01" },
      });
      const loanId = loanRes.json().id;

      const [first, second] = await Promise.all([
        app.inject({ method: "POST", url: `/api/v1/transactions/${loanId}/settle-loan`, headers: authHeader(user), payload: { amount: 70000 } }),
        app.inject({ method: "POST", url: `/api/v1/transactions/${loanId}/settle-loan`, headers: authHeader(user), payload: { amount: 70000 } }),
      ]);

      const succeeded = [first, second].filter((res) => res.statusCode === 200);
      const rejected = [first, second].filter((res) => res.statusCode === 422);
      expect(succeeded).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const paidTotal = await prisma.transaction.aggregate({
        where: { parentLoanId: loanId },
        _sum: { amountMinor: true },
      });
      expect(paidTotal._sum.amountMinor).toBe(70000n);
    });
  });

  describe("GET /transactions", () => {
    it("returns a loan's live outstanding balance (null for non-loans and settlement rows)", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id, { initialBalanceMinor: 1000000n });
      const other = await categoryBySlug("other");

      const loan = (
        await app.inject({
          method: "POST",
          url: "/api/v1/transactions",
          headers: authHeader(user),
          payload: { accountId: wallet.id, type: "EXPENSE", amount: 600000, categoryId: other.id, loanKind: "LENT", counterpartyName: "Camilo", description: "Préstamo", date: "2026-08-01" },
        })
      ).json();
      expect(loan.outstanding).toBe(600000);

      const settle = await app.inject({
        method: "POST",
        url: `/api/v1/transactions/${loan.id}/settle-loan`,
        headers: authHeader(user),
        payload: { amount: 180000 },
      });
      expect(settle.json().original.outstanding).toBe(420000);

      const rows = (await app.inject({ method: "GET", url: "/api/v1/transactions", headers: authHeader(user) })).json();
      const listedLoan = rows.find((row: { id: string }) => row.id === loan.id);
      const settlementRow = rows.find((row: { parentLoanId: string | null }) => row.parentLoanId === loan.id);
      expect(listedLoan.outstanding).toBe(420000);
      expect(settlementRow.outstanding).toBeNull();

      const patched = await app.inject({
        method: "PATCH",
        url: `/api/v1/transactions/${loan.id}`,
        headers: authHeader(user),
        payload: { counterpartyName: "Camilo Restrepo" },
      });
      expect(patched.json().outstanding).toBe(420000);
    });

    it("filters by type, category, and date range", async () => {
      const user = await createTestUser();
      const wallet = await createAccount(user.id);
      const food = await categoryBySlug("food");
      const salary = await categoryBySlug("salary");

      await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: { accountId: wallet.id, type: "EXPENSE", amount: 1000, categoryId: food.id, description: "Food", date: "2026-06-01" },
      });
      await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(user),
        payload: { accountId: wallet.id, type: "INCOME", amount: 5000, categoryId: salary.id, description: "Pay", date: "2026-06-15" },
      });

      const res = await app.inject({ method: "GET", url: "/api/v1/transactions?type=EXPENSE", headers: authHeader(user) });
      expect(res.statusCode).toBe(200);
      const rows = res.json();
      expect(rows).toHaveLength(1);
      expect(rows[0].description).toBe("Food");
    });

    it("only returns the authenticated user's own transactions", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();
      const walletA = await createAccount(userA.id);
      const walletB = await createAccount(userB.id);
      const category = await categoryBySlug("food");

      await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(userA),
        payload: { accountId: walletA.id, type: "EXPENSE", amount: 1000, categoryId: category.id, description: "A's", date: "2026-06-01" },
      });
      await app.inject({
        method: "POST",
        url: "/api/v1/transactions",
        headers: authHeader(userB),
        payload: { accountId: walletB.id, type: "EXPENSE", amount: 1000, categoryId: category.id, description: "B's", date: "2026-06-01" },
      });

      const res = await app.inject({ method: "GET", url: "/api/v1/transactions", headers: authHeader(userA) });
      const descriptions = res.json().map((t: { description: string }) => t.description);
      expect(descriptions).toEqual(["A's"]);
    });
  });
});
