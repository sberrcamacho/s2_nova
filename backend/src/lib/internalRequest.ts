import { randomBytes } from "node:crypto";

// The assistant reads the API through app.inject with the caller's own
// session. Those reads all come from 127.0.0.1, so they would share one
// rate-limit bucket across every user; this header (a secret that never
// leaves the process) lets them skip the IP limiter. The user-facing
// request that started them is still limited.
export const INTERNAL_HEADER = "x-s2nova-internal";
export const INTERNAL_TOKEN = randomBytes(32).toString("hex");

export function isInternalRequest(headers: Record<string, unknown>): boolean {
  return headers[INTERNAL_HEADER] === INTERNAL_TOKEN;
}
