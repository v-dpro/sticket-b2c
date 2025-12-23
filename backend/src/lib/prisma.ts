import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required (Postgres connection string)');
}

type GlobalForPrisma = {
  prisma?: PrismaClient;
  prismaPgPool?: Pool;
};

const globalForPrisma = globalThis as unknown as GlobalForPrisma;

if (!globalForPrisma.prismaPgPool) {
  globalForPrisma.prismaPgPool = new Pool({ connectionString });
}

if (!globalForPrisma.prisma) {
  const adapter = new PrismaPg(globalForPrisma.prismaPgPool);
  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma;

export default prisma;



