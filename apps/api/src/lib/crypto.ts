import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// Symmetric encryption for secrets stored at rest (currently Spotify OAuth
// tokens on User). Uses AES-256-GCM with a key derived from TOKEN_ENC_KEY.
//
// Design goals:
//  - If TOKEN_ENC_KEY is unset, fall back to storing plaintext (with a one-time
//    warning) so local/dev never breaks. Production must set TOKEN_ENC_KEY.
//  - Ciphertext is self-describing via the `enc:v1:` prefix, so reads can tell
//    an encrypted value from a legacy plaintext row and decrypt only the former.
//  - TOKEN_ENC_KEY may be any string (hashed to 32 bytes) or a 64-char hex key.

const RAW_KEY = process.env.TOKEN_ENC_KEY || '';
const PREFIX = 'enc:v1:';
let warnedNoKey = false;

function keyBytes(): Buffer | null {
  if (!RAW_KEY) return null;
  // Accept a 32-byte hex key directly; otherwise derive 32 bytes via SHA-256 so
  // any passphrase works.
  if (/^[0-9a-fA-F]{64}$/.test(RAW_KEY)) return Buffer.from(RAW_KEY, 'hex');
  return createHash('sha256').update(RAW_KEY).digest();
}

export function isTokenEncryptionEnabled(): boolean {
  return Boolean(RAW_KEY);
}

/**
 * Encrypt a secret for storage. Returns plaintext unchanged (with a one-time
 * warning) when TOKEN_ENC_KEY is not configured. Null/undefined pass through.
 */
export function encryptToken(plain: string | null | undefined): string | null {
  if (plain == null) return null;
  const key = keyBytes();
  if (!key) {
    if (!warnedNoKey) {
      console.warn(
        '[crypto] TOKEN_ENC_KEY not set — Spotify tokens will be stored in PLAINTEXT. ' +
          'Set TOKEN_ENC_KEY (any strong secret) in production to encrypt tokens at rest.',
      );
      warnedNoKey = true;
    }
    return plain;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

/**
 * Decrypt a stored secret. Legacy plaintext rows (no `enc:v1:` prefix) are
 * returned as-is so previously-stored tokens keep working. Null/undefined pass
 * through. Returns null if an encrypted value can't be decrypted.
 */
export function decryptToken(stored: string | null | undefined): string | null {
  if (stored == null) return null;
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext
  const key = keyBytes();
  if (!key) {
    console.warn('[crypto] Encrypted token found but TOKEN_ENC_KEY is not set — cannot decrypt.');
    return null;
  }
  try {
    const parts = stored.split(':'); // ['enc','v1', iv, tag, data]
    const iv = Buffer.from(parts[2], 'base64');
    const tag = Buffer.from(parts[3], 'base64');
    const data = Buffer.from(parts[4], 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch (err) {
    console.error('[crypto] Failed to decrypt token:', err);
    return null;
  }
}
