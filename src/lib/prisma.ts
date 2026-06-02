// import { PrismaClient } from '@prisma/client';

import { PrismaClient, PasswordResetUserType, SessionStatus } from "../../prisma/src/generated/prisma";

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();
export { PasswordResetUserType, SessionStatus };

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}