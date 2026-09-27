import { prisma } from "./prisma.js";

// A login lasts at most this long, however often its tokens rotate.
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// Clients report activity at most once a minute (POST /auth/activity), so
// the server allows that much on top of the user's "Cierre automático"
// before it ends the session itself — the clients log out on time; this is
// the backstop for a client that was killed, tampered with or offline.
const IDLE_SLACK_MS = 60 * 1000;

// Two requests racing to refresh the same token: the loser presents a
// token the winner rotated a moment ago. Within this window that's a race,
// not a stolen token, so it's rejected without revoking every session.
export const ROTATION_GRACE_MS = 30 * 1000;

export class SessionEndedError extends Error {
  constructor(readonly code: "session_ended" | "session_idle") {
    super(code);
  }
}

export function isIdle(lastActivityAt: Date, autoLockMinutes: number, now = new Date()): boolean {
  return autoLockMinutes > 0 && now.getTime() - lastActivityAt.getTime() > autoLockMinutes * 60_000 + IDLE_SLACK_MS;
}

export async function revokeSession(sessionId: string) {
  await prisma.refreshToken.updateMany({ where: { sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}

// The access token's session must still be open: logging out, closing it
// from Ajustes › Sesiones activas, changing the password or going idle
// ends it at once, not when the 15-minute access token runs out.
export async function assertSessionOpen(userId: string, sessionId: string) {
  const now = new Date();
  const token = await prisma.refreshToken.findFirst({
    where: { userId, sessionId, revokedAt: null, expiresAt: { gt: now } },
    select: { lastActivityAt: true, user: { select: { preferences: { select: { autoLockMinutes: true } } } } },
  });
  if (!token) throw new SessionEndedError("session_ended");
  if (isIdle(token.lastActivityAt, token.user.preferences?.autoLockMinutes ?? 0, now)) {
    await revokeSession(sessionId);
    throw new SessionEndedError("session_idle");
  }
}
