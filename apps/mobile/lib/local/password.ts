import * as Crypto from 'expo-crypto';

function bytesToHex(bytes: Uint8Array) {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function getRandomHex(bytes: number) {
  try {
    // React Native (Hermes) generally provides WebCrypto.
    const arr = new Uint8Array(bytes);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cryptoObj: any = (globalThis as any).crypto;
    if (cryptoObj?.getRandomValues) {
      cryptoObj.getRandomValues(arr);
      return bytesToHex(arr);
    }
  } catch {
    // ignore
  }

  // Fallback (not cryptographically strong, but ok for local prototype)
  let out = '';
  for (let i = 0; i < bytes; i++) {
    out += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0');
  }
  return out;
}

export function newSalt() {
  return getRandomHex(16);
}

export async function hashPassword(password: string, salt: string) {
  // Simple salted SHA-256. Good enough for local-only prototyping.
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}



