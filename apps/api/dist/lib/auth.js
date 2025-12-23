import { verifyToken } from '../services/auth.js';
export function getUserIdFromRequest(req) {
    const headerUserId = req.headers['x-user-id'];
    if (typeof headerUserId === 'string' && headerUserId.trim())
        return headerUserId.trim();
    const auth = req.headers.authorization;
    if (!auth)
        return null;
    const [scheme, token] = auth.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token)
        return null;
    // JWT auth (access token).
    // Dev-friendly fallback: if it doesn't look like a JWT and we're in dev, treat token as userId.
    const raw = token.trim();
    if (!raw)
        return null;
    if (process.env.NODE_ENV !== 'production' && !raw.includes('.')) {
        return raw;
    }
    try {
        const payload = verifyToken(raw);
        if (payload.type !== 'access')
            return null;
        return payload.userId;
    }
    catch {
        return null;
    }
}
