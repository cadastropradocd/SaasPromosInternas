import { appLogger } from './logger';

// Interface for encryption key
interface EncryptionKey {
  key: CryptoKey;
}

// Generate a key from a base64-encoded secret (for demonstration)
// In production, use a proper key management system (e.g., AWS KMS, Cloudflare Key Management)
// For this example, we expect an environment variable ENCRYPTION_KEY with a base64-encoded 32-byte key
async function getEncryptionKey(): Promise<EncryptionKey> {
  // Get the base64-encoded key from environment variables
  const keyBase64 = process.env.ENCRYPTION_KEY;
  if (!keyBase64) {
    appLogger.warn('ENCRYPTION_KEY not set, using a fixed key for demonstration (NOT SECURE FOR PRODUCTION)');
    // For demonstration only - in production, this should be a secure key from env
    const fixedKey = new Uint8Array([
      0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
      0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
      0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
      0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F
    ]);
    const key = await crypto.subtle.importKey(
      'raw',
      fixedKey,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
    return { key };
  }

  // Decode the base64 key
  const keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
  if (keyBytes.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits) when decoded from base64');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  return { key };
}

// Encrypt a string using AES-GCM
export async function encrypt(text: string): Promise<string> {
  try {
    const { key } = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits for GCM
    const encoded = new TextEncoder().encode(text);
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    // Combine IV and encrypted data for storage
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    // Return as base64 for easy storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    appLogger.error('Encryption failed', { error: error.message });
    throw error;
  }
}

// Decrypt a string using AES-GCM
export async function decrypt(encryptedText: string): Promise<string> {
  try {
    const { key } = await getEncryptionKey();
    const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encryptedBuffer = combined.slice(12);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedBuffer
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    appLogger.error('Decryption failed', { error: error.message });
    throw error;
  }
}

// Utility to encrypt fields in an object (for demonstration)
export async function encryptObjectFields<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): Promise<T> {
  const encryptedObj = { ...obj };
  for (const field of fieldsToEncrypt) {
    if (obj[field] !== undefined && obj[field] !== null && typeof obj[field] === 'string') {
      encryptedObj[field] = await encrypt(obj[field]);
    }
  }
  return encryptedObj;
}

// Utility to decrypt fields in an object (for demonstration)
export async function decryptObjectFields<T extends Record<string, any>>(
  obj: T,
  fieldsToDecrypt: (keyof T)[]
): Promise<T> {
  const decryptedObj = { ...obj };
  for (const field of fieldsToDecrypt) {
    if (obj[field] !== undefined && obj[field] !== null && typeof obj[field] === 'string') {
      try {
        decryptedObj[field] = await decrypt(obj[field]);
      } catch (e) {
        // If decryption fails, we might have stored plaintext data (backward compatibility)
        appLogger.warn(`Decryption failed for field ${String(field)}, using raw value`, { error: e.message });
        decryptedObj[field] = obj[field];
      }
    }
  }
  return decryptedObj;
}