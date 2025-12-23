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
const router = (0, express_1.Router)();
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
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        });
        res.status(201).json({ user, token });
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
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        });
        res.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                city: user.city,
            },
            token,
        });
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
        void code;
        // TODO: Exchange code for tokens, store in user record
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