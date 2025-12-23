import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required (Postgres connection string)');
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPgPool?: Pool;
};

if (!globalForPrisma.prismaPgPool) {
  globalForPrisma.prismaPgPool = new Pool({ connectionString });
}

if (!globalForPrisma.prisma) {
  const adapter = new PrismaPg(globalForPrisma.prismaPgPool);
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma;




