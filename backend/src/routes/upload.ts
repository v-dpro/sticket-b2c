import { Router } from 'express';
import multer from 'multer';

import prisma from '../lib/prisma';
import { authenticateToken, type AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { uploadAvatar, uploadLogPhoto } from '../services/storage';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new AppError('Only images are allowed', 400));
  },
});

// POST /upload/avatar (multipart/form-data with field "image")
router.post('/avatar', authenticateToken, upload.single('image'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) throw new AppError('No image provided', 400);

    const url = await uploadAvatar(req.file.buffer, req.user!.id);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatarUrl: url },
    });

    res.json({ url });
  } catch (error) {
    next(error as Error);
  }
});

// POST /upload/photo (multipart/form-data with field "image")
router.post('/photo', authenticateToken, upload.single('image'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) throw new AppError('No image provided', 400);

    const { url, thumbnailUrl } = await uploadLogPhoto(req.file.buffer, req.user!.id);

    res.json({ url, thumbnailUrl });
  } catch (error) {
    next(error as Error);
  }
});

export default router;



