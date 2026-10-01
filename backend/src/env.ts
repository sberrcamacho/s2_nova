import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  GOOGLE_CLIENT_IDS: z
    .string()
    .default("")
    .transform((value) => value.split(",").map((id) => id.trim()).filter(Boolean)),
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean)),
  // Transactional email (password recovery) through Resend's HTTP API. Left
  // unset, the message is printed to the server log instead of being sent.
  RESEND_API_KEY: z.string().default(""),
  MAIL_FROM: z.string().default("S2 Nova <no-reply@s2nova.app>"),
  // Scanner: last-resort product identification with Claude + web search when
  // no product database knows a barcode. Unset = that step is skipped.
  ANTHROPIC_API_KEY: z.string().default(""),
  // Same step through Google Gemini + Google Search grounding (free tier).
  // Tried before Claude when both are set.
  GEMINI_API_KEY: z.string().default(""),
  // Where the recovery link in the email points (the Web client).
  WEB_APP_URL: z.string().default("http://localhost:8443"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
