"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../src/lib/prisma"));
async function main() {
    const passwordHash = await bcryptjs_1.default.hash('password123', 12);
    const user = await prisma_1.default.user.upsert({
        where: { email: 'test@sticket.in' },
        update: {},
        create: {
            email: 'test@sticket.in',
            username: 'testuser',
            displayName: 'Test User',
            passwordHash,
            city: 'New York',
        },
    });
    console.log('Created test user:', user);
    const artists = await Promise.all([
        prisma_1.default.artist.upsert({
            where: { spotifyId: '1' },
            update: {},
            create: { name: 'The Weeknd', spotifyId: '1', genres: ['pop', 'r&b'] },
        }),
        prisma_1.default.artist.upsert({
            where: { spotifyId: '2' },
            update: {},
            create: { name: 'Taylor Swift', spotifyId: '2', genres: ['pop', 'country'] },
        }),
        prisma_1.default.artist.upsert({
            where: { spotifyId: '3' },
            update: {},
            create: { name: 'BTS', spotifyId: '3', genres: ['k-pop'] },
        }),
    ]);
    console.log('Created artists:', artists.length);
    const badges = await Promise.all([
        prisma_1.default.badge.upsert({
            where: { name: 'First Show' },
            update: {},
            create: {
                name: 'First Show',
                description: 'Logged your first show',
                criteria: { type: 'show_count', value: 1 },
            },
        }),
        prisma_1.default.badge.upsert({
            where: { name: '10 Shows' },
            update: {},
            create: {
                name: '10 Shows',
                description: 'Logged 10 shows',
                criteria: { type: 'show_count', value: 10 },
            },
        }),
    ]);
    console.log('Created badges:', badges.length);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma_1.default.$disconnect();
});
//# sourceMappingURL=seed.js.map