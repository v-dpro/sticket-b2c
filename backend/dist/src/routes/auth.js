"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const spotify_1 = require("../services/spotify");
const router = (0, express_1.Router)();
function requireEnv(name) {
    const v = process.env[name];
    if (!v) {
        // Dev ergonomics: allow local usage without configuring a JWT secret.
        if (name === 'JWT_SECRET' && process.env.NODE_ENV !== 'production')
            return 'sticket-dev-jwt-secret';
        throw new errorHandler_1.AppError(`${name} is required`, 500);
    }
    return v;
}
function getRefreshSecret() {
    return process.env.JWT_REFRESH_SECRET || requireEnv('JWT_SECRET');
}
function generateTokens(userId, email) {
    const accessToken = jsonwebtoken_1.default.sign({ userId, email, type: 'access' }, requireEnv('JWT_SECRET'), {
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d'),
    });
    const refreshToken = jsonwebtoken_1.default.sign({ userId, email, type: 'refresh' }, getRefreshSecret(), {
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d'),
    });
    return { accessToken, refreshToken };
}
// POST /auth/signup
router.post('/signup', async (req, res, next) => {
    try {
        const { email, password, username } = req.body;
        if (!email || !password || !username) {
            throw new errorHandler_1.AppError('Email, password, and username are required', 400);
        }
        const normalizedUsername = username.toLowerCase();
        const existingUser = await prisma_1.default.user.findFirst({
            where: {
                OR: [{ email }, { username: normalizedUsername }],
            },
        });
        if (existingUser) {
            throw new errorHandler_1.AppError(existingUser.email === email ? 'Email already in use' : 'Username already taken', 400);
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma_1.default.user.create({
            data: {
                email,
                passwordHash,
                username: normalizedUsername,
                displayName: username,
            },
            select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                city: true,
            },
        });
        const tokens = generateTokens(user.id, user.email);
        // Backwards compatible: keep `token` = accessToken for older clients.
        res.status(201).json({ user, token: tokens.accessToken, ...tokens });
    }
    catch (error) {
        next(error);
    }
});
// POST /auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new errorHandler_1.AppError('Email and password are required', 400);
        }
        const user = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (!user || !user.passwordHash) {
            throw new errorHandler_1.AppError('Invalid email or password', 401);
        }
        const isValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isValid) {
            throw new errorHandler_1.AppError('Invalid email or password', 401);
        }
        const tokens = generateTokens(user.id, user.email);
        res.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                city: user.city,
            },
            token: tokens.accessToken,
            ...tokens,
        });
    }
    catch (error) {
        next(error);
    }
});
// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken)
            throw new errorHandler_1.AppError('Refresh token required', 400);
        const payload = jsonwebtoken_1.default.verify(refreshToken, getRefreshSecret());
        if (payload.type && payload.type !== 'refresh')
            throw new errorHandler_1.AppError('Invalid token type', 401);
        const user = await prisma_1.default.user.findUnique({ where: { id: payload.userId } });
        if (!user)
            throw new errorHandler_1.AppError('User not found', 401);
        const tokens = generateTokens(user.id, user.email);
        res.json(tokens);
    }
    catch (error) {
        next(error);
    }
});
// GET /auth/me
router.get('/me', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                bio: true,
                avatarUrl: true,
                city: true,
                spotifyId: true,
                spotifyUsername: true,
                privacySetting: true,
                createdAt: true,
            },
        });
        if (!user) {
            throw new errorHandler_1.AppError('User not found', 404);
        }
        res.json(user);
    }
    catch (error) {
        next(error);
    }
});
// POST /auth/spotify/callback
router.post('/spotify/callback', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code)
            throw new errorHandler_1.AppError('Authorization code required', 400);
        const result = await (0, spotify_1.handleSpotifyConnect)(req.user.id, code);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
// GET /auth/spotify/url
router.get('/spotify/url', auth_1.authenticateToken, async (req, res, next) => {
    try {
        if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_REDIRECT_URI) {
            throw new errorHandler_1.AppError('Spotify connect is not configured on this server', 501);
        }
        const scopes = ['user-read-email', 'user-read-private', 'user-top-read', 'user-library-read', 'user-follow-read'].join(' ');
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: process.env.SPOTIFY_CLIENT_ID,
            scope: scopes,
            redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
            // Keep it simple: mobile reads code from redirect; backend authenticates via JWT anyway.
            state: req.user.id,
        });
        res.json({ url: `https://accounts.spotify.com/authorize?${params.toString()}` });
    }
    catch (error) {
        next(error);
    }
});
// POST /auth/spotify/disconnect
router.post('/spotify/disconnect', auth_1.authenticateToken, async (req, res, next) => {
    try {
        await prisma_1.default.user.update({
            where: { id: req.user.id },
            data: {
                spotifyId: null,
                spotifyUsername: null,
                spotifyToken: null,
                spotifyRefresh: null,
                spotifyTokenExpiry: null,
            },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// POST /auth/logout
router.post('/logout', auth_1.authenticateToken, async (req, res) => {
    void req;
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=auth.js.map