import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticateToken, type AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { handleSpotifyConnect } from '../services/spotify';

const router = Router();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    // Dev ergonomics: allow local usage without configuring a JWT secret.
    if (name === 'JWT_SECRET' && process.env.NODE_ENV !== 'production') return 'sticket-dev-jwt-secret';
    throw new AppError(`${name} is required`, 500);
  }
  return v;
}

function getRefreshSecret(): string {
  return process.env.JWT_REFRESH_SECRET || requireEnv('JWT_SECRET');
}

function generateTokens(userId: string, email: string) {
  const accessToken = jwt.sign({ userId, email, type: 'access' as const }, requireEnv('JWT_SECRET'), {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ userId, email, type: 'refresh' as const }, getRefreshSecret(), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as jwt.SignOptions['expiresIn'],
  });
  return { accessToken, refreshToken };
}

// POST /auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, username } = req.body as {
      email?: string;
      password?: string;
      username?: string;
    };

    if (!email || !password || !username) {
      throw new AppError('Email, password, and username are required', 400);
    }

    const normalizedUsername = username.toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username: normalizedUsername }],
      },
    });

    if (existingUser) {
      throw new AppError(existingUser.email === email ? 'Email already in use' : 'Username already taken', 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
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
  } catch (error) {
    next(error as Error);
  }
});

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401);
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
  } catch (error) {
    next(error as Error);
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) throw new AppError('Refresh token required', 400);

    const payload = jwt.verify(refreshToken, getRefreshSecret()) as { userId: string; email: string; type?: 'access' | 'refresh' };
    if (payload.type && payload.type !== 'refresh') throw new AppError('Invalid token type', 401);

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new AppError('User not found', 401);

    const tokens = generateTokens(user.id, user.email);
    res.json(tokens);
  } catch (error) {
    next(error as Error);
  }
});

// GET /auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
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
      throw new AppError('User not found', 404);
    }

    res.json(user);
  } catch (error) {
    next(error as Error);
  }
});

// POST /auth/spotify/callback
router.post('/spotify/callback', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code) throw new AppError('Authorization code required', 400);
    const result = await handleSpotifyConnect(req.user!.id, code);
    res.json(result);
  } catch (error) {
    next(error as Error);
  }
});

// GET /auth/spotify/url
router.get('/spotify/url', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_REDIRECT_URI) {
      throw new AppError('Spotify connect is not configured on this server', 501);
    }

    const scopes = ['user-read-email', 'user-read-private', 'user-top-read', 'user-library-read', 'user-follow-read'].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope: scopes,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      // Keep it simple: mobile reads code from redirect; backend authenticates via JWT anyway.
      state: req.user!.id,
    });

    res.json({ url: `https://accounts.spotify.com/authorize?${params.toString()}` });
  } catch (error) {
    next(error as Error);
  }
});

// POST /auth/spotify/disconnect
router.post('/spotify/disconnect', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        spotifyId: null,
        spotifyUsername: null,
        spotifyToken: null,
        spotifyRefresh: null,
        spotifyTokenExpiry: null,
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error as Error);
  }
});

// POST /auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
  void req;
  res.json({ success: true });
});

export default router;



