import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AppError } from './errorHandler';

function jwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV !== 'production') return 'sticket-dev-jwt-secret';
  throw new AppError('JWT_SECRET is required', 500);
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const decoded = jwt.verify(token, jwtSecret()) as {
      userId: string;
      email: string;
      type?: 'access' | 'refresh';
    };

    if (decoded.type && decoded.type !== 'access') {
      throw new AppError('Invalid token type', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true },
    });

    if (!user) {
      throw new AppError('User not found', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error as Error);
  }
}

export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, jwtSecret()) as {
        userId: string;
        type?: 'access' | 'refresh';
      };

      if (decoded.type && decoded.type !== 'access') {
        return next();
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, username: true },
      });

      if (user) {
        req.user = user;
      }
    }

    next();
  } catch {
    // Ignore auth errors for optional auth
    next();
  }
}



