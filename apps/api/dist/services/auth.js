import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import appleSignin from 'apple-signin-auth';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
function requireEnv(name) {
    const v = process.env[name];
    if (!v) {
        // Dev ergonomics: allow local API usage without configuring a JWT secret.
        // Never rely on this fallback in production.
        if (name === 'JWT_SECRET' && process.env.NODE_ENV !== 'production') {
            return 'sticket-dev-jwt-secret';
        }
        throw new AppError(`${name} is required`, 500);
    }
    return v;
}
export function generateAccessToken(userId, email) {
    return jwt.sign({ userId, email, type: 'access' }, requireEnv('JWT_SECRET'), {
        // jsonwebtoken types expect ms.StringValue; env vars are plain string.
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d'),
    });
}
export function generateRefreshToken(userId, email) {
    return jwt.sign({ userId, email, type: 'refresh' }, requireEnv('JWT_SECRET'), {
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d'),
    });
}
export function verifyToken(token) {
    return jwt.verify(token, requireEnv('JWT_SECRET'));
}
export function generateTokens(userId, email) {
    return {
        accessToken: generateAccessToken(userId, email),
        refreshToken: generateRefreshToken(userId, email),
    };
}
// ==================== PASSWORD HELPERS ====================
export async function hashPassword(password) {
    return bcrypt.hash(password, 12);
}
export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}
export function generateResetToken() {
    // cryptographically secure random token
    return randomBytes(32).toString('hex');
}
// ==================== APPLE SIGN-IN ====================
export async function verifyAppleToken(identityToken) {
    try {
        const payload = await appleSignin.verifyIdToken(identityToken, {
            audience: requireEnv('APPLE_CLIENT_ID'),
            ignoreExpiration: false,
        });
        if (!payload.email) {
            throw new AppError('Apple Sign-In did not return email', 400);
        }
        return {
            email: payload.email,
            appleUserId: payload.sub,
            name: undefined,
        };
    }
    catch (error) {
        console.error('Apple token verification failed:', error);
        throw new AppError('Invalid Apple identity token', 401);
    }
}
export async function handleAppleSignIn(identityToken, fullName) {
    const appleData = await verifyAppleToken(identityToken);
    let user = await prisma.user.findFirst({
        where: {
            OR: [{ appleId: appleData.appleUserId }, { email: appleData.email.toLowerCase() }],
        },
    });
    if (user) {
        if (!user.appleId) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { appleId: appleData.appleUserId },
            });
        }
    }
    else {
        const displayName = fullName?.givenName
            ? `${fullName.givenName} ${fullName.familyName || ''}`.trim()
            : appleData.email.split('@')[0];
        const username = await generateUniqueUsername(displayName);
        user = await prisma.user.create({
            data: {
                email: appleData.email.toLowerCase(),
                appleId: appleData.appleUserId,
                username,
                displayName,
            },
        });
    }
    const tokens = generateTokens(user.id, user.email);
    return {
        user: pickUser(user),
        tokens,
    };
}
// ==================== GOOGLE SIGN-IN ====================
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
export async function verifyGoogleToken(idToken) {
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: requireEnv('GOOGLE_CLIENT_ID'),
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            throw new AppError('Google Sign-In did not return email', 400);
        }
        return {
            email: payload.email,
            googleUserId: payload.sub,
            name: payload.name,
            picture: payload.picture,
        };
    }
    catch (error) {
        console.error('Google token verification failed:', error);
        throw new AppError('Invalid Google ID token', 401);
    }
}
export async function handleGoogleSignIn(idToken) {
    const googleData = await verifyGoogleToken(idToken);
    let user = await prisma.user.findFirst({
        where: {
            OR: [{ googleId: googleData.googleUserId }, { email: googleData.email.toLowerCase() }],
        },
    });
    if (user) {
        const updates = {};
        if (!user.googleId)
            updates.googleId = googleData.googleUserId;
        if (!user.avatarUrl && googleData.picture)
            updates.avatarUrl = googleData.picture;
        if (Object.keys(updates).length > 0) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: updates,
            });
        }
    }
    else {
        const displayName = googleData.name || googleData.email.split('@')[0];
        const username = await generateUniqueUsername(displayName);
        user = await prisma.user.create({
            data: {
                email: googleData.email.toLowerCase(),
                googleId: googleData.googleUserId,
                username,
                displayName,
                avatarUrl: googleData.picture,
            },
        });
    }
    const tokens = generateTokens(user.id, user.email);
    return {
        user: pickUser(user),
        tokens,
    };
}
// ==================== SPOTIFY OAUTH ====================
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';
export async function exchangeSpotifyCode(code) {
    try {
        const response = await axios.post(SPOTIFY_TOKEN_URL, new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: requireEnv('SPOTIFY_REDIRECT_URI'),
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${requireEnv('SPOTIFY_CLIENT_ID')}:${requireEnv('SPOTIFY_CLIENT_SECRET')}`).toString('base64')}`,
            },
        });
        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            expiresIn: response.data.expires_in,
        };
    }
    catch (error) {
        console.error('Spotify code exchange failed:', error);
        throw new AppError('Failed to exchange Spotify code', 400);
    }
}
export async function refreshSpotifyToken(refreshToken) {
    try {
        const response = await axios.post(SPOTIFY_TOKEN_URL, new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${requireEnv('SPOTIFY_CLIENT_ID')}:${requireEnv('SPOTIFY_CLIENT_SECRET')}`).toString('base64')}`,
            },
        });
        return {
            accessToken: response.data.access_token,
            expiresIn: response.data.expires_in,
        };
    }
    catch (error) {
        console.error('Spotify token refresh failed:', error);
        throw new AppError('Failed to refresh Spotify token', 400);
    }
}
export async function getSpotifyProfile(accessToken) {
    try {
        const response = await axios.get(`${SPOTIFY_API_URL}/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.data;
    }
    catch (error) {
        console.error('Failed to get Spotify profile:', error);
        throw new AppError('Failed to get Spotify profile', 400);
    }
}
export async function getSpotifyTopArtists(accessToken, limit = 50, timeRange = 'medium_term') {
    try {
        const response = await axios.get(`${SPOTIFY_API_URL}/me/top/artists`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { limit, time_range: timeRange },
        });
        return response.data.items;
    }
    catch (error) {
        console.error('Failed to get Spotify top artists:', error);
        return [];
    }
}
export async function handleSpotifyConnect(userId, code) {
    const tokens = await exchangeSpotifyCode(code);
    const profile = await getSpotifyProfile(tokens.accessToken);
    await prisma.user.update({
        where: { id: userId },
        data: {
            spotifyId: profile.id,
            spotifyUsername: profile.display_name,
            spotifyToken: tokens.accessToken,
            spotifyRefresh: tokens.refreshToken,
            spotifyTokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
            ...(profile.images?.[0]?.url ? { avatarUrl: profile.images[0].url } : {}),
        },
    });
    const topArtists = await getSpotifyTopArtists(tokens.accessToken);
    for (const spotifyArtist of topArtists) {
        const artist = await prisma.artist.upsert({
            where: { spotifyId: spotifyArtist.id },
            update: {
                name: spotifyArtist.name,
                imageUrl: spotifyArtist.images?.[0]?.url,
                genres: spotifyArtist.genres || [],
            },
            create: {
                spotifyId: spotifyArtist.id,
                name: spotifyArtist.name,
                imageUrl: spotifyArtist.images?.[0]?.url,
                genres: spotifyArtist.genres || [],
            },
        });
        if (topArtists.indexOf(spotifyArtist) < 20) {
            await prisma.userArtistFollow.upsert({
                where: { userId_artistId: { userId, artistId: artist.id } },
                update: {},
                create: { userId, artistId: artist.id, notify: true },
            });
        }
    }
    return { success: true, topArtists };
}
// ==================== HELPERS ====================
function pickUser(user) {
    return {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        city: user.city,
        spotifyId: user.spotifyId,
    };
}
async function generateUniqueUsername(baseName) {
    let username = baseName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 15);
    if (!username)
        username = 'user';
    let candidate = username;
    let counter = 1;
    while (true) {
        const existing = await prisma.user.findUnique({ where: { username: candidate } });
        if (!existing)
            return candidate;
        candidate = `${username}${counter}`;
        counter++;
        if (counter > 1000) {
            candidate = `${username}${Math.random().toString(36).slice(2, 7)}`;
        }
    }
}
export async function getUserWithFreshSpotifyToken(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.spotifyToken || !user.spotifyRefresh) {
        return { user, spotifyToken: null };
    }
    const isExpired = user.spotifyTokenExpiry &&
        new Date(user.spotifyTokenExpiry).getTime() < Date.now() + 5 * 60 * 1000;
    if (isExpired) {
        try {
            const newTokens = await refreshSpotifyToken(user.spotifyRefresh);
            await prisma.user.update({
                where: { id: userId },
                data: {
                    spotifyToken: newTokens.accessToken,
                    spotifyTokenExpiry: new Date(Date.now() + newTokens.expiresIn * 1000),
                },
            });
            return { user, spotifyToken: newTokens.accessToken };
        }
        catch (error) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    spotifyToken: null,
                    spotifyRefresh: null,
                    spotifyTokenExpiry: null,
                    spotifyId: null,
                },
            });
            return { user, spotifyToken: null };
        }
    }
    return { user, spotifyToken: user.spotifyToken };
}
