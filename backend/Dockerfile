# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src
RUN pnpm exec prisma generate
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable && addgroup -S s2nova && adduser -S s2nova -G s2nova
COPY package.json pnpm-lock.yaml* ./
# Full install (not --prod) — the `prisma` CLI is a devDependency, and the
# CMD below needs it at container start to run `prisma migrate deploy`
# (there's no separate migration step on Render, unlike the docker-compose
# `migrate` service this Dockerfile was originally written for).
RUN pnpm install --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
USER s2nova
EXPOSE 3000
# Runs pending migrations (no-op if already applied — safe on every
# restart/redeploy, including Render free tier waking from sleep) before
# starting the server.
CMD ["sh", "-c", "pnpm prisma:deploy && node dist/server.js"]
