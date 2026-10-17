import { OAuth2Client } from "google-auth-library";
import { env } from "../env.js";

// Both clients get ID tokens audienced to the same *Web* OAuth client ID:
// Android's Credential Manager is called with it as `serverClientId` (the
// Android-type client, registered with the package name + signing SHA-1,
// only authorizes the app to ask). GOOGLE_CLIENT_IDS is a list so another
// client could be accepted too, but one ID is enough today.
const client = env.GOOGLE_CLIENT_IDS.length > 0 ? new OAuth2Client() : null;

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  // Seconds since the epoch the token was issued (Google's `iat`).
  issuedAt?: number;
}

// Thrown when GOOGLE_CLIENT_IDS is empty — lets the route return 501
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

  const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_IDS });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw new Error("INVALID_GOOGLE_TOKEN");
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified ?? false,
    name: payload.name ?? payload.email,
    issuedAt: payload.iat,
  };
}
