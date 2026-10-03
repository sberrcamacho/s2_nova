import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../helpers/app.js";
import { authHeader, createTestUser, type TestUser } from "../helpers/testUser.js";
import { prisma } from "../../src/lib/prisma.js";

describe("biometric login", () => {
  let app: FastifyInstance;
  let user: TestUser;

  beforeEach(async () => {
    app = await createTestApp();
    user = await createTestUser();
  });

  afterEach(async () => {
    await app.close();
  });

  async function enrol() {
    const res = await app.inject({ method: "POST", url: "/api/v1/auth/biometric", headers: authHeader(user) });
    expect(res.statusCode).toBe(201);
    return res.json() as { credentialId: string; secret: string };
  }

  function turnOn(on: boolean) {
    return app.inject({ method: "PATCH", url: "/api/v1/me/preferences", headers: authHeader(user), payload: { biometricLogin: on } });
  }

  function login(payload: { credentialId: string; secret: string }) {
    return app.inject({ method: "POST", url: "/api/v1/auth/biometric/login", payload });
  }

  it("needs a signed-in user to enrol and stores only the secret's hash", async () => {
    const anonymous = await app.inject({ method: "POST", url: "/api/v1/auth/biometric" });
    expect(anonymous.statusCode).toBe(401);

    const { credentialId, secret } = await enrol();
    const stored = await prisma.biometricCredential.findUniqueOrThrow({ where: { id: credentialId } });
    expect(stored.userId).toBe(user.id);
    expect(stored.secretHash).not.toBe(secret);
  });

  it("trades the credential for a working session while the preference is on", async () => {
    await turnOn(true);
    const credential = await enrol();

    const res = await login(credential);
    expect(res.statusCode).toBe(200);
    expect(res.json().user.id).toBe(user.id);
    expect(res.json().refreshToken).toEqual(expect.any(String));

    const me = await app.inject({ method: "GET", url: "/api/v1/me", headers: { authorization: `Bearer ${res.json().accessToken}` } });
    expect(me.statusCode).toBe(200);
  });

  it("rejects a wrong secret, an unknown credential and a preference that is off", async () => {
    const credential = await enrol();

    // Enrolled, but "Ingreso biométrico" was never turned on.
    expect((await login(credential)).statusCode).toBe(401);

    await turnOn(true);
    expect((await login({ ...credential, secret: "x".repeat(64) })).statusCode).toBe(401);
    expect((await login({ credentialId: "00000000-0000-4000-8000-000000000000", secret: credential.secret })).statusCode).toBe(401);
    expect((await login(credential)).statusCode).toBe(200);
  });

  it("retires the credential when the preference is turned off", async () => {
    await turnOn(true);
    const credential = await enrol();
    await turnOn(false);
    await turnOn(true);
    expect((await login(credential)).statusCode).toBe(401);
  });

  it("retires the credential when the password changes", async () => {
    await turnOn(true);
    const credential = await enrol();
    const changed = await app.inject({
      method: "POST",
      url: "/api/v1/me/password",
      headers: authHeader(user),
      payload: { currentPassword: user.password, newPassword: "an0therPass" },
    });
    expect(changed.statusCode).toBe(204);
    expect((await login(credential)).statusCode).toBe(401);
  });
});
