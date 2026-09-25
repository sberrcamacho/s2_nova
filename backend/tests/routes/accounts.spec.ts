import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/app.js";
import { authHeader, createTestUser } from "../helpers/testUser.js";
import { createAccount } from "../helpers/factories.js";
import { prisma } from "../../src/lib/prisma.js";

describe("account (wallet) routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /accounts", () => {
    it("creates a wallet with the given initial balance", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/accounts",
        headers: authHeader(user),
        payload: { name: "Nequi", type: "NEQUI", initialBalance: 50000 },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ name: "Nequi", type: "NEQUI", initialBalance: 50000, currentBalance: 50000 });
    });

    it("allows a negative initial balance (debt-style wallet, e.g. a credit card)", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/accounts",
        headers: authHeader(user),
        payload: { name: "Credit Card", type: "BANK_CREDIT", initialBalance: -100000 },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().currentBalance).toBe(-100000);
    });

    it("keeps decimals for a wallet in a currency with cents", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/accounts",
        headers: authHeader(user),
        payload: { name: "Wise", type: "SAVINGS", initialBalance: 12.5, currency: "USD" },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ currency: "USD", currentBalance: 12.5 });
    });

    it("rejects an unknown account type", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/accounts",
        headers: authHeader(user),
        payload: { name: "Bad", type: "BITCOIN_WALLET", initialBalance: 0 },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /accounts", () => {
    it("only returns the authenticated user's own wallets", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();
      await createAccount(userA.id, { name: "A's wallet" });
      await createAccount(userB.id, { name: "B's wallet" });

      const res = await app.inject({ method: "GET", url: "/api/v1/accounts", headers: authHeader(userA) });
      expect(res.statusCode).toBe(200);
      const names = res.json().map((a: { name: string }) => a.name);
      expect(names).toEqual(["A's wallet"]);
    });
  });

  describe("PATCH /accounts/:id", () => {
    it("returns 404 (not 403) when patching another user's wallet", async () => {
      const owner = await createTestUser();
      const stranger = await createTestUser();
      const account = await createAccount(owner.id);

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/accounts/${account.id}`,
        headers: authHeader(stranger),
        payload: { name: "Hijacked" },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /accounts/:id (reassignment)", () => {
    it("moves the balance and transactions to the destination wallet, then deletes the source", async () => {
      const user = await createTestUser();
      const source = await createAccount(user.id, { name: "Source", initialBalanceMinor: 30000n });
      const destination = await createAccount(user.id, { name: "Destination", initialBalanceMinor: 10000n });
      const category = await prisma.category.findFirstOrThrow({ where: { userId: null, slug: "exp.other" } });

      const txn = await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: source.id,
          type: "INCOME",
          amountMinor: 5000n,
          categoryId: category.id,
          paymentMethod: "CASH",
          description: "test income",
          transactionDate: new Date(),
        },
      });

      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/accounts/${source.id}`,
        headers: authHeader(user),
        payload: { reassignToAccountId: destination.id },
      });
      expect(res.statusCode).toBe(204);

      const destinationAfter = await prisma.account.findUniqueOrThrow({ where: { id: destination.id } });
      expect(destinationAfter.currentBalanceMinor).toBe(40000n);

      const sourceAfter = await prisma.account.findUnique({ where: { id: source.id } });
      expect(sourceAfter).toBeNull();

      const txnAfter = await prisma.transaction.findUniqueOrThrow({ where: { id: txn.id } });
      expect(txnAfter.accountId).toBe(destination.id);
    });

    it("rejects reassigning a wallet to itself", async () => {
      const user = await createTestUser();
      const account = await createAccount(user.id);
      await createAccount(user.id);
      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/accounts/${account.id}`,
        headers: authHeader(user),
        payload: { reassignToAccountId: account.id },
      });
      expect(res.statusCode).toBe(422);
    });

    it("rejects a nonexistent destination wallet", async () => {
      const user = await createTestUser();
      const account = await createAccount(user.id);
      await createAccount(user.id);
      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/accounts/${account.id}`,
        headers: authHeader(user),
        payload: { reassignToAccountId: "00000000-0000-0000-0000-000000000000" },
      });
      expect(res.statusCode).toBe(422);
    });

    it("never deletes the last wallet", async () => {
      const user = await createTestUser();
      const account = await createAccount(user.id);
      const res = await app.inject({ method: "DELETE", url: `/api/v1/accounts/${account.id}`, headers: authHeader(user), payload: {} });
      expect(res.statusCode).toBe(409);
    });

    it("without reassignToAccountId deletes the wallet with its movements", async () => {
      const user = await createTestUser();
      const account = await createAccount(user.id);
      const other = await createAccount(user.id, { initialBalanceMinor: 1000n });
      const category = await prisma.category.findFirstOrThrow({ where: { userId: null, slug: "exp.other" } });
      await prisma.transaction.create({
        data: { userId: user.id, accountId: account.id, type: "EXPENSE", amountMinor: 5n, categoryId: category.id, paymentMethod: "CASH", description: "x", transactionDate: new Date() },
      });
      const res = await app.inject({ method: "DELETE", url: `/api/v1/accounts/${account.id}`, headers: authHeader(user), payload: {} });
      expect(res.statusCode).toBe(204);
      expect(await prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
      expect((await prisma.account.findUniqueOrThrow({ where: { id: other.id } })).currentBalanceMinor).toBe(1000n);
    });
  });
});
