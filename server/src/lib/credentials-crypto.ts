import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const KEY_SALT = 'brieflane-ac-credentials-v1';

function getEncryptionKey(): Buffer {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY?.trim() || process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY or JWT_SECRET is not configured');
  }

  return scryptSync(secret, KEY_SALT, 32);
}

/** Encrypt a secret for storage. Format: `iv:tag:ciphertext` (base64). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

/** Decrypt a value produced by `encryptSecret`. */
export function decryptSecret(payload: string): string {
  const parts = payload.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted credential payload');
  }

  const [ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
