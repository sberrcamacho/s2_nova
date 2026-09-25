import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "node:crypto";
import { env } from "../env.js";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AccessTokenPayload {
  sub: string;
  // The login session (refresh_tokens.session_id) this token was minted
  // for — lets /me/sessions mark "Este dispositivo" and keep it open when
  // the others are closed. Absent on tokens signed outside a session.
  sid?: string;
}

export function signAccessToken(userId: string, sessionId?: string): string {
  return jwt.sign(sessionId ? { sub: userId, sid: sessionId } : { sub: userId }, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (typeof payload === "string" || typeof payload.sub !== "string") {
    throw new Error("Malformed access token payload");
  }
  return { sub: payload.sub, sid: typeof payload.sid === "string" ? payload.sid : undefined };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Rotated on every /auth/refresh call — the opaque token is only ever
// returned to the client once; the DB stores just its hash, same pattern
// as password storage, so a DB leak alone can't be replayed as a session.
export function generateRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(48).toString("base64url");
  return {
    token,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  };
}
