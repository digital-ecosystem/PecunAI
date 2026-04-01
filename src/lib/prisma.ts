// import { PrismaClient } from '@prisma/client';

import { PrismaClient, PasswordResetUserType } from "../../prisma/src/generated/prisma";

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();
export { PasswordResetUserType };

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}