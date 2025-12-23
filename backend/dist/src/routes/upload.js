"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const storage_1 = require("../services/storage");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/'))
            cb(null, true);
        else
            cb(new errorHandler_1.AppError('Only images are allowed', 400));
    },
});
// POST /upload/avatar (multipart/form-data with field "image")
router.post('/avatar', auth_1.authenticateToken, upload.single('image'), async (req, res, next) => {
    try {
        if (!req.file)
            throw new errorHandler_1.AppError('No image provided', 400);
        const url = await (0, storage_1.uploadAvatar)(req.file.buffer, req.user.id);
        await prisma_1.default.user.update({
            where: { id: req.user.id },
            data: { avatarUrl: url },
        });
        res.json({ url });
    }
    catch (error) {
        next(error);
    }
});
// POST /upload/photo (multipart/form-data with field "image")
router.post('/photo', auth_1.authenticateToken, upload.single('image'), async (req, res, next) => {
    try {
        if (!req.file)
            throw new errorHandler_1.AppError('No image provided', 400);
        const { url, thumbnailUrl } = await (0, storage_1.uploadLogPhoto)(req.file.buffer, req.user.id);
        res.json({ url, thumbnailUrl });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map