"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is required (Postgres connection string)');
}
const globalForPrisma = globalThis;
if (!globalForPrisma.prismaPgPool) {
    globalForPrisma.prismaPgPool = new pg_1.Pool({ connectionString });
}
if (!globalForPrisma.prisma) {
    const adapter = new adapter_pg_1.PrismaPg(globalForPrisma.prismaPgPool);
    globalForPrisma.prisma = new client_1.PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
}
exports.prisma = globalForPrisma.prisma;
exports.default = exports.prisma;
//# sourceMappingURL=prisma.js.map