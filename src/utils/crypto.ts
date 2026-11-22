/**
 * Web Crypto API for 100% offline security:
 * - Salting and SHA-256 password & PIN hashing
 * - PBKDF2 + AES-GCM 256-bit encryption for export backups
 * - Unique distributed sync ID generation
 */

export function generateSyncId(prefix = 'item'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateSalt(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashWithSalt(text: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text + ':' + salt);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface EncryptedPayload {
  version: 1;
  salt: string;
  iv: string;
  ciphertext: string;
}

export async function encryptBackup(plainText: string, passphrase: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );

  const payload: EncryptedPayload = {
    version: 1,
    salt: Array.from(salt, (b) => b.toString(16).padStart(2, '0')).join(''),
    iv: Array.from(iv, (b) => b.toString(16).padStart(2, '0')).join(''),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
  };

  return JSON.stringify(payload, null, 2);
}

export async function decryptBackup(payloadJson: string, passphrase: string): Promise<string> {
  const payload: EncryptedPayload = JSON.parse(payloadJson);
  if (!payload.salt || !payload.iv || !payload.ciphertext) {
    throw new Error('Invalid encrypted backup payload structure');
  }

  const salt = new Uint8Array(
    payload.salt.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
  const iv = new Uint8Array(
    payload.iv.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  const binaryStr = atob(payload.ciphertext);
  const encryptedBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    encryptedBytes[i] = binaryStr.charCodeAt(i);
  }

  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedBytes
    );
    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch {
    throw new Error('Incorrect passphrase or corrupted backup file');
  }
}
