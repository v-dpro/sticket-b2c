"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
function errorHandler(err, req, res, next) {
    console.error('Error:', err);
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
        });
    }
    if (err.name === 'PrismaClientKnownRequestError') {
        return res.status(400).json({
            error: 'Database error',
        });
    }
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token',
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expired',
        });
    }
    return res.status(500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
}
//# sourceMappingURL=errorHandler.js.map