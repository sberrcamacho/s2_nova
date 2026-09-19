import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/app.js";
import { authHeader, createTestUser } from "../helpers/testUser.js";

describe("me routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /me", () => {
    it("returns the authenticated user's profile and preferences", async () => {
      const user = await createTestUser({ name: "Profile Person" });
      const res = await app.inject({ method: "GET", url: "/api/v1/me", headers: authHeader(user) });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toMatchObject({ name: "Profile Person", email: user.email, hasPassword: true });
      expect(body.preferences).toMatchObject({
        language: "es",
        currency: "COP",
        theme: "SYSTEM",
        notifications: true,
        biometricLogin: false,
        blurBalance: false,
        autoLockMinutes: 5,
        onboardingCompleted: false,
        tutorialCompleted: false,
      });
    });

    it("returns 401 without a token", async () => {
      const res = await app.inject({ method: "GET", url: "/api/v1/me" });
      expect(res.statusCode).toBe(401);
    });

    it("returns 401 for a garbage token", async () => {
      const res = await app.inject({ method: "GET", url: "/api/v1/me", headers: { authorization: "Bearer not-a-real-token" } });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("PATCH /me", () => {
    it("updates name without requiring a password", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "PATCH",
        url: "/api/v1/me",
        headers: authHeader(user),
        payload: { name: "New Name" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe("New Name");
    });

    it("updates phone/city without requiring a password", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "PATCH",
        url: "/api/v1/me",
        headers: authHeader(user),
        payload: { phone: "3001234567", city: "Medellín" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ phone: "3001234567", city: "Medellín" });
    });

    it("requires the current password to change email", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "PATCH",
        url: "/api/v1/me",
        headers: authHeader(user),
        payload: { email: "new-email@example.com" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("changes email when the current password is correct", async () => {
      const user = await createTestUser();
      const newEmail = `changed-${user.email}`;
      const res = await app.inject({
        method: "PATCH",
        url: "/api/v1/me",
        headers: authHeader(user),
        payload: { email: newEmail, currentPassword: user.password },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().email).toBe(newEmail);
    });

    it("rejects changing email to one already used by another account", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();
      const res = await app.inject({
        method: "PATCH",
        url: "/api/v1/me",
        headers: authHeader(userB),
        payload: { email: userA.email, currentPassword: userB.password },
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe("POST /me/password", () => {
    it("rejects without the correct current password", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/me/password",
        headers: authHeader(user),
        payload: { currentPassword: "wrong-password", newPassword: "BrandNewPass1" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("rotates the password and revokes existing refresh tokens", async () => {
      const user = await createTestUser();
      // Issue a real refresh token for this user via register, so we can
      // prove it gets revoked.
      const registerRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: user.email, password: user.password },
      });
      const refreshToken = registerRes.json().refreshToken as string;

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/me/password",
        headers: authHeader(user),
        payload: { currentPassword: user.password, newPassword: "BrandNewPass1" },
      });
      expect(res.statusCode).toBe(204);

      const refreshAfter = await app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken } });
      expect(refreshAfter.statusCode).toBe(401);

      const loginWithNew = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: user.email, password: "BrandNewPass1" },
      });
      expect(loginWithNew.statusCode).toBe(200);
    });
  });

  describe("POST /me/verify-password", () => {
    it("returns 204 for the correct password without mutating anything", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/me/verify-password",
        headers: authHeader(user),
        payload: { password: user.password },
      });
      expect(res.statusCode).toBe(204);
    });

    it("returns 401 for the wrong password", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/me/verify-password",
        headers: authHeader(user),
        payload: { password: "totally-wrong" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("does not revoke refresh tokens (unlike POST /me/password) — it's just a re-auth check", async () => {
      const user = await createTestUser();
      const loginRes = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { email: user.email, password: user.password } });
      const refreshToken = loginRes.json().refreshToken as string;

      await app.inject({
        method: "POST",
        url: "/api/v1/me/verify-password",
        headers: authHeader(user),
        payload: { password: user.password },
      });

      const refreshAfter = await app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken } });
      expect(refreshAfter.statusCode).toBe(200);
    });
  });

  describe("PATCH /me/preferences", () => {
    it("updates blurBalance and autoLockMinutes", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "PATCH",
        url: "/api/v1/me/preferences",
        headers: authHeader(user),
        payload: { blurBalance: true, autoLockMinutes: 15 },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().preferences).toMatchObject({ blurBalance: true, autoLockMinutes: 15 });
    });

    it("rejects an autoLockMinutes value outside the fixed option set", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "PATCH",
        url: "/api/v1/me/preferences",
        headers: authHeader(user),
        payload: { autoLockMinutes: 7 },
      });
      expect(res.statusCode).toBe(400);
    });

    it("accepts 0 (Never) as a valid autoLockMinutes value", async () => {
      const user = await createTestUser();
      const res = await app.inject({
        method: "PATCH",
        url: "/api/v1/me/preferences",
        headers: authHeader(user),
        payload: { autoLockMinutes: 0 },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().preferences.autoLockMinutes).toBe(0);
    });

    it("marks onboarding completed and it stays completed (no accidental regression) after a later unrelated update", async () => {
      const user = await createTestUser();
      await app.inject({
        method: "PATCH",
        url: "/api/v1/me/preferences",
        headers: authHeader(user),
        payload: { onboardingCompleted: true },
      });
      const res = await app.inject({
        method: "PATCH",
        url: "/api/v1/me/preferences",
        headers: authHeader(user),
        payload: { theme: "DARK" },
      });
      expect(res.json().preferences.onboardingCompleted).toBe(true);
    });
  });
});
