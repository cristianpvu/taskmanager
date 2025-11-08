import * as Crypto from 'expo-crypto';
import Aes from 'react-native-aes-crypto';

/**
 * Generate a random encryption key for a group
 * Returns a 256-bit key as base64 string
 */
export const generateEncryptionKey = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return btoa(String.fromCharCode(...randomBytes));
};

/**
 * Convert base64 to hex
 */
const base64ToHex = (base64: string): string => {
  const raw = atob(base64);
  let hex = '';
  for (let i = 0; i < raw.length; i++) {
    const hexChar = raw.charCodeAt(i).toString(16).padStart(2, '0');
    hex += hexChar;
  }
  return hex;
};

/**
 * Convert hex to base64
 */
const hexToBase64 = (hex: string): string => {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return btoa(String.fromCharCode(...bytes));
};

/**
 * Encrypt text using AES-256-CBC
 * @param plainText - The text to encrypt
 * @param keyBase64 - The encryption key as base64 string
 * @returns Encrypted text as base64 string with IV prepended (format: IV:encrypted)
 */
export const encryptText = async (plainText: string, keyBase64: string): Promise<string> => {
  try {
    if (!plainText || !keyBase64) {
      throw new Error('Plain text and key are required');
    }

    // Convert key from base64 to hex (required by react-native-aes-crypto)
    const keyHex = base64ToHex(keyBase64);

    // Generate random IV (16 bytes for AES-256-CBC)
    const ivBytes = await Crypto.getRandomBytesAsync(16);
    const ivHex = Array.from(ivBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Encrypt using AES-256-CBC
    const encrypted = await Aes.encrypt(plainText, keyHex, ivHex, 'aes-256-cbc');
    
    // Return IV:encrypted format (both in base64)
    const ivBase64 = hexToBase64(ivHex);
    return `${ivBase64}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt text');
  }
};

/**
 * Decrypt text using AES-256-CBC
 * @param encryptedText - The encrypted text in format "IV:encrypted"
 * @param keyBase64 - The encryption key as base64 string
 * @returns Decrypted plain text
 */
export const decryptText = async (encryptedText: string, keyBase64: string): Promise<string> => {
  try {
    if (!encryptedText || !keyBase64) {
      throw new Error('Encrypted text and key are required');
    }

    // Split IV and encrypted data
    const [ivBase64, encrypted] = encryptedText.split(':');
    
    if (!ivBase64 || !encrypted) {
      throw new Error('Invalid encrypted text format');
    }

    // Convert key and IV from base64 to hex
    const keyHex = base64ToHex(keyBase64);
    const ivHex = base64ToHex(ivBase64);
    
    // Decrypt using AES-256-CBC
    const decrypted = await Aes.decrypt(encrypted, keyHex, ivHex, 'aes-256-cbc');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt text');
  }
};

/**
 * Check if encryption is available in current environment
 */
export const isEncryptionAvailable = (): boolean => {
  return true; // react-native-aes-crypto is always available
};
