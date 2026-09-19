import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { hashRefreshToken } from "../../src/lib/tokens.js";

const { verifyGoogleIdToken, GoogleNotConfiguredError } = vi.hoisted(() => {
  class GoogleNotConfiguredError extends Error {
    constructor() {
      super("GOOGLE_NOT_CONFIGURED");
    }
  }
  return { verifyGoogleIdToken: vi.fn(), GoogleNotConfiguredError };
});

// Mocked so Google Sign-In tests are deterministic and never make a real
// network call — the route layer's job (link-by-verified-email vs.
// create-new vs. reuse-existing-identity) is what's under test here, not
// google-auth-library itself.
vi.mock("../../src/lib/googleAuth.js", () => ({ verifyGoogleIdToken, GoogleNotConfiguredError }));

function randomEmail() {
  return `auth-${Math.random().toString(36).slice(2)}@example.com`;
}

describe("auth routes", () => {
  // A fresh app (and fresh in-memory rate-limit store) per test, since
  // AUTH_RATE_LIMIT is only 10/min and this suite easily makes more than
  // 10 register/login/google calls across all its tests combined — a
  // shared instance would make later tests flake from rate-limit
  // exhaustion caused by earlier, unrelated tests.
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /auth/register", () => {
    it("creates a user and issues tokens for native clients", async () => {
      const email = randomEmail();
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { name: "Ada Lovelace", email, password: "Sup3rSecret" },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.user).toMatchObject({ name: "Ada Lovelace", email });
      expect(typeof body.accessToken).toBe("string");
      expect(typeof body.refreshToken).toBe("string");
    });

    it("delivers the refresh token via an httpOnly cookie for web clients, not the body", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        headers: { "x-client-platform": "web" },
        payload: { name: "Grace Hopper", email: randomEmail(), password: "Sup3rSecret" },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().refreshToken).toBeUndefined();
      const cookie = res.cookies.find((c) => c.name === "s2nova_refresh");
      expect(cookie).toBeDefined();
      expect(cookie?.httpOnly).toBe(true);
    });

    it("rejects a duplicate email with 409", async () => {
      const email = randomEmail();
      await app.inject({ method: "POST", url: "/api/v1/auth/register", payload: { name: "A", email, password: "Sup3rSecret" } });
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { name: "B", email, password: "Different1" },
      });
      expect(res.statusCode).toBe(409);
    });

    it("rejects a missing name with 400 and Zod issue details", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { email: randomEmail(), password: "Sup3rSecret" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().issues).toBeDefined();
    });

    it("rejects a too-short password with 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { name: "Short Pass", email: randomEmail(), password: "abc" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("rejects a malformed email with 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { name: "Bad Email", email: "not-an-email", password: "Sup3rSecret" },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /auth/login", () => {
    it("logs in with correct credentials", async () => {
      const email = randomEmail();
      await app.inject({ method: "POST", url: "/api/v1/auth/register", payload: { name: "Login User", email, password: "Sup3rSecret" } });
      const res = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { email, password: "Sup3rSecret" } });
      expect(res.statusCode).toBe(200);
      expect(res.json().user.email).toBe(email);
    });

    it("rejects the wrong password with 401", async () => {
      const email = randomEmail();
      await app.inject({ method: "POST", url: "/api/v1/auth/register", payload: { name: "Login User", email, password: "Sup3rSecret" } });
      const res = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { email, password: "WrongPass1" } });
      expect(res.statusCode).toBe(401);
    });

    it("rejects a nonexistent email with 401 (not 404 — never confirms an email exists)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: randomEmail(), password: "Whatever1" },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /auth/google", () => {
    it("returns 501 when Google Sign-In isn't configured", async () => {
      verifyGoogleIdToken.mockRejectedValueOnce(new GoogleNotConfiguredError());
      const res = await app.inject({ method: "POST", url: "/api/v1/auth/google", payload: { idToken: "whatever" } });
      expect(res.statusCode).toBe(501);
    });

    it("returns 401 for an invalid Google token", async () => {
      verifyGoogleIdToken.mockRejectedValueOnce(new Error("bad token"));
      const res = await app.inject({ method: "POST", url: "/api/v1/auth/google", payload: { idToken: "garbage" } });
      expect(res.statusCode).toBe(401);
    });

    it("creates a brand-new user for a first-time, verified Google identity", async () => {
      const email = randomEmail();
      verifyGoogleIdToken.mockResolvedValueOnce({ sub: `sub-${email}`, email, emailVerified: true, name: "New Googler" });
      const res = await app.inject({ method: "POST", url: "/api/v1/auth/google", payload: { idToken: "tok" } });
      expect(res.statusCode).toBe(200);
      expect(res.json().user.email).toBe(email);
    });

    it("links into an existing user by verified email instead of creating a duplicate account", async () => {
      const email = randomEmail();
      const registerRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { name: "Existing User", email, password: "Sup3rSecret" },
      });
      const existingUserId = registerRes.json().user.id;

      verifyGoogleIdToken.mockResolvedValueOnce({ sub: `sub-${email}`, email, emailVerified: true, name: "Existing User" });
      const res = await app.inject({ method: "POST", url: "/api/v1/auth/google", payload: { idToken: "tok" } });
      expect(res.statusCode).toBe(200);
      expect(res.json().user.id).toBe(existingUserId);

      const identities = await prisma.authIdentity.findMany({ where: { userId: existingUserId } });
      expect(identities.map((i) => i.provider).sort()).toEqual(["GOOGLE", "PASSWORD"]);
    });

    // Regression test for a real bug: an unverified Google email can't
    // auto-link into an existing account (anyone can claim an unverified
    // email at Google), but the route used to then try to INSERT a new
    // `users` row with that same email anyway — violating the column's
    // unique constraint and crashing with an unhandled 500 instead of a
    // clean rejection. Fixed in auth.ts to check for the email collision
    // explicitly and return 409.
    it("rejects with 409 (not a 500, not a silent link) when an unverified Google email collides with an existing account", async () => {
      const email = randomEmail();
      await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { name: "Existing User", email, password: "Sup3rSecret" },
      });

      verifyGoogleIdToken.mockResolvedValueOnce({ sub: `sub-unverified-${email}`, email, emailVerified: false, name: "Impostor" });
      const res = await app.inject({ method: "POST", url: "/api/v1/auth/google", payload: { idToken: "tok" } });
      expect(res.statusCode).toBe(409);

      const usersWithEmail = await prisma.user.findMany({ where: { email } });
      expect(usersWithEmail).toHaveLength(1);
    });

    it("still creates a brand-new user for an unverified Google email that has no existing account", async () => {
      const email = randomEmail();
      verifyGoogleIdToken.mockResolvedValueOnce({ sub: `sub-unverified-${email}`, email, emailVerified: false, name: "New Unverified" });
      const res = await app.inject({ method: "POST", url: "/api/v1/auth/google", payload: { idToken: "tok" } });
      expect(res.statusCode).toBe(200);
      expect(res.json().user.email).toBe(email);
    });

    it("reuses the same user on a second Google login with the same provider sub", async () => {
      const email = randomEmail();
      verifyGoogleIdToken.mockResolvedValueOnce({ sub: `sub-${email}`, email, emailVerified: true, name: "Repeat Googler" });
      const first = await app.inject({ method: "POST", url: "/api/v1/auth/google", payload: { idToken: "tok" } });

      verifyGoogleIdToken.mockResolvedValueOnce({ sub: `sub-${email}`, email, emailVerified: true, name: "Repeat Googler" });
      const second = await app.inject({ method: "POST", url: "/api/v1/auth/google", payload: { idToken: "tok" } });

      expect(second.json().user.id).toBe(first.json().user.id);
    });
  });

  describe("POST /auth/refresh", () => {
    it("rotates the refresh token so the old one stops working", async () => {
      const email = randomEmail();
      const registerRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { name: "Refresh User", email, password: "Sup3rSecret" },
      });
      const originalRefreshToken = registerRes.json().refreshToken as string;

      const refreshRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: { refreshToken: originalRefreshToken },
      });
      expect(refreshRes.statusCode).toBe(200);
      const newRefreshToken = refreshRes.json().refreshToken as string;
      expect(newRefreshToken).not.toBe(originalRefreshToken);

      // Reusing the now-revoked original token must fail.
      const reuseRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: { refreshToken: originalRefreshToken },
      });
      expect(reuseRes.statusCode).toBe(401);

      // Reusing a revoked token is treated as a compromise signal, which
      // revokes the whole session including the token that was legitimately
      // rotated from it — see the dedicated reuse-detection test below for
      // the full scenario (other sessions included).
      const secondRefresh = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: { refreshToken: newRefreshToken },
      });
      expect(secondRefresh.statusCode).toBe(401);
    });

    // Regression test for a real bug: replaying an already-revoked refresh
    // token used to just 401 without any further effect, leaving whatever
    // token *was* legitimately rotated from it still valid — so a stolen,
    // already-used token gave an attacker no reason to stop trying, and a
    // genuine hijack wouldn't revoke the victim's still-active session.
    // Fixed in auth.ts to treat "presented token is already revoked" as
    // reuse and revoke every other active refresh token for that user too.
    it("revokes every other active session when a revoked refresh token is reused", async () => {
      const email = randomEmail();
      const registerRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { name: "Reuse Victim", email, password: "Sup3rSecret" },
      });
      const originalRefreshToken = registerRes.json().refreshToken as string;

      // A second, independent session for the same user (e.g. another
      // device) that should get swept up by the reuse-detection revocation.
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email, password: "Sup3rSecret" },
      });
      const otherDeviceRefreshToken = loginRes.json().refreshToken as string;

      const rotateRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: { refreshToken: originalRefreshToken },
      });
      const rotatedRefreshToken = rotateRes.json().refreshToken as string;

      // Replay the now-revoked original token — this is the reuse.
      const reuseRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: { refreshToken: originalRefreshToken },
      });
      expect(reuseRes.statusCode).toBe(401);

      // The token that legitimately came out of the rotation above must
      // now be revoked too, even though it was never itself reused.
      const rotatedAfterReuse = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: { refreshToken: rotatedRefreshToken },
      });
      expect(rotatedAfterReuse.statusCode).toBe(401);

      // A completely different session (the second device) must also be
      // revoked, not just tokens descended from the reused one.
      const otherDeviceAfterReuse = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        payload: { refreshToken: otherDeviceRefreshToken },
      });
      expect(otherDeviceAfterReuse.statusCode).toBe(401);
    });

    it("rejects an expired refresh token with 401", async () => {
      const email = randomEmail();
      const registerRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { name: "Expired User", email, password: "Sup3rSecret" },
      });
      const refreshToken = registerRes.json().refreshToken as string;

      await prisma.refreshToken.update({
        where: { tokenHash: hashRefreshToken(refreshToken) },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const res = await app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken } });
      expect(res.statusCode).toBe(401);
    });

    it("rejects a request with no refresh token at all", async () => {
      const res = await app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: {} });
      expect(res.statusCode).toBe(401);
    });

    it("reads the refresh token from a cookie for web sessions and responds with a rotated cookie, not a body token", async () => {
      const registerRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        headers: { "x-client-platform": "web" },
        payload: { name: "Web Refresh", email: randomEmail(), password: "Sup3rSecret" },
      });
      const cookie = registerRes.cookies.find((c) => c.name === "s2nova_refresh")!;

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        cookies: { s2nova_refresh: cookie.value },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().refreshToken).toBeUndefined();
      expect(res.cookies.find((c) => c.name === "s2nova_refresh")).toBeDefined();
    });
  });

  describe("POST /auth/logout", () => {
    it("revokes the presented refresh token so it can no longer be used to refresh", async () => {
      const registerRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { name: "Logout User", email: randomEmail(), password: "Sup3rSecret" },
      });
      const refreshToken = registerRes.json().refreshToken as string;

      const logoutRes = await app.inject({ method: "POST", url: "/api/v1/auth/logout", payload: { refreshToken } });
      expect(logoutRes.statusCode).toBe(204);

      const refreshAfterLogout = await app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken } });
      expect(refreshAfterLogout.statusCode).toBe(401);
    });

    it("succeeds even with no token presented (already-logged-out client)", async () => {
      const res = await app.inject({ method: "POST", url: "/api/v1/auth/logout", payload: {} });
      expect(res.statusCode).toBe(204);
    });
  });

  describe("rate limiting on /auth/register", () => {
    it("returns 429 after exceeding the auth rate limit within the time window", async () => {
      const attempts = await Promise.all(
        Array.from({ length: 11 }, () =>
          app.inject({
            method: "POST",
            url: "/api/v1/auth/register",
            payload: { name: "Rate Limited", email: randomEmail(), password: "Sup3rSecret" },
          }),
        ),
      );
      const statusCodes = attempts.map((res) => res.statusCode);
      expect(statusCodes.filter((code) => code === 429).length).toBeGreaterThan(0);
    });
  });
});
