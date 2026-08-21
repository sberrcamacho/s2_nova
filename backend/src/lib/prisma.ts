import { PrismaClient } from "@prisma/client";

// Single shared client per process, per Prisma's own guidance — avoids
// exhausting Postgres connections under tsx's dev-mode module reloads.
export const prisma = new PrismaClient();
