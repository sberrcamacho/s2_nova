import "./lib/bigint.js";
import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { env } from "./env.js";
import authPlugin from "./plugins/auth.js";
import { accountRoutes } from "./routes/accounts.js";
import { authRoutes } from "./routes/auth.js";
import { budgetRoutes } from "./routes/budgets.js";
import { categoryRoutes } from "./routes/categories.js";
import { goalRoutes } from "./routes/goals.js";
import { healthRoutes } from "./routes/health.js";
import { meRoutes } from "./routes/me.js";
import { recurringSeriesRoutes } from "./routes/recurringSeries.js";
import { transactionRoutes } from "./routes/transactions.js";

const app = Fastify({
  logger: {
    level: env.NODE_ENV === "production" ? "info" : "debug",
  },
});

app.setErrorHandler((error: FastifyError | ZodError, _request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({ error: "Invalid request.", issues: error.flatten() });
  }
  const statusCode = error.statusCode ?? 500;
  if (statusCode >= 500) {
    app.log.error(error);
  }
  return reply.status(statusCode).send({ error: error.message || "Internal server error." });
});

await app.register(cors, {
  origin: env.CORS_ORIGINS,
  credentials: true,
});

await app.register(cookie);

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

await app.register(authPlugin);

await app.register(healthRoutes, { prefix: "/api/v1" });
await app.register(authRoutes, { prefix: "/api/v1" });
await app.register(meRoutes, { prefix: "/api/v1" });
await app.register(accountRoutes, { prefix: "/api/v1" });
await app.register(categoryRoutes, { prefix: "/api/v1" });
await app.register(transactionRoutes, { prefix: "/api/v1" });
await app.register(budgetRoutes, { prefix: "/api/v1" });
await app.register(goalRoutes, { prefix: "/api/v1" });
await app.register(recurringSeriesRoutes, { prefix: "/api/v1" });

app
  .listen({ port: env.PORT, host: "0.0.0.0" })
  .then((address) => {
    app.log.info(`S2 Nova backend listening at ${address}`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
