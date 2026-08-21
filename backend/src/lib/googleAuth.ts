import { OAuth2Client } from "google-auth-library";
import { env } from "../env.js";

const client = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

// Thrown when GOOGLE_CLIENT_ID isn't set — lets the route return 501
// instead of a misleading "invalid token" for an unconfigured server.
export class GoogleNotConfiguredError extends Error {
  constructor() {
    super("GOOGLE_NOT_CONFIGURED");
  }
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  if (!client) {
    throw new GoogleNotConfiguredError();
  }

  const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw new Error("INVALID_GOOGLE_TOKEN");
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified ?? false,
    name: payload.name ?? payload.email,
  };
}
