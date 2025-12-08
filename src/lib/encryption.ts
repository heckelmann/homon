import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    // Fallback for development or if not set, but warn
    // In production this should probably throw
    console.warn('ENCRYPTION_KEY not set, using default insecure key');
    return crypto.createHash('sha256').update('default-insecure-key').digest();
  }
  return crypto.createHash('sha256').update(key).digest();
}

export function encrypt(text: string | null | undefined): string | null {
  if (!text) return null;
  try {
    const key = getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    return text; // Fallback to plain text if encryption fails? Or throw?
  }
}

export function decrypt(text: string | null | undefined): string | null {
  if (!text) return null;
  
  const parts = text.split(':');
  if (parts.length !== 3) {
    // Not in our encrypted format, assume plain text
    return text;
  }

  try {
    const key = getKey();
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // Decryption failed (wrong key, or not actually encrypted)
    console.warn('Decryption failed, returning original text');
    return text;
  }
}
