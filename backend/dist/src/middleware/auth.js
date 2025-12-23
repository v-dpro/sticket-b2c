"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("./errorHandler");
function jwtSecret() {
    if (process.env.JWT_SECRET)
        return process.env.JWT_SECRET;
    if (process.env.NODE_ENV !== 'production')
        return 'sticket-dev-jwt-secret';
    throw new errorHandler_1.AppError('JWT_SECRET is required', 500);
}
async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            throw new errorHandler_1.AppError('No token provided', 401);
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret());
        if (decoded.type && decoded.type !== 'access') {
            throw new errorHandler_1.AppError('Invalid token type', 401);
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, username: true },
        });
        if (!user) {
            throw new errorHandler_1.AppError('User not found', 401);
        }
        req.user = user;
        next();
    }
    catch (error) {
        next(error);
    }
}
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret());
            if (decoded.type && decoded.type !== 'access') {
                return next();
            }
            const user = await prisma_1.default.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, username: true },
            });
            if (user) {
                req.user = user;
            }
        }
        next();
    }
    catch {
        // Ignore auth errors for optional auth
        next();
    }
}
//# sourceMappingURL=auth.js.map