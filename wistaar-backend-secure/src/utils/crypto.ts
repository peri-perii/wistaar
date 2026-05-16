/**
 * @fileoverview Cryptographic utilities for AES-256-GCM encryption/decryption
 * Provides symmetric encryption for sensitive data at rest
 * @module utils/crypto
 */

import crypto from 'crypto';
import { logger } from './logger.js';

/**
 * Encryption result containing encrypted data, IV, and authentication tag
 * @interface EncryptionResult
 */
export interface EncryptionResult {
  encrypted: string;
  iv: string;
  tag: string;
}

/**
 * Cryptographic utility class for AES-256-GCM encryption
 * @class CryptoUtil
 */
class CryptoUtil {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private encryptionKey: Buffer;

  /**
   * Initialize crypto utility with encryption key from environment
   * @constructor
   * @throws {Error} If ENCRYPTION_KEY is not set or invalid
   */
  constructor() {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    // Convert hex string to buffer
    this.encryptionKey = Buffer.from(keyHex, 'hex');

    if (this.encryptionKey.length !== this.keyLength) {
      throw new Error(
        `ENCRYPTION_KEY must be exactly ${this.keyLength * 2} hex characters (256 bits), got ${keyHex.length}`
      );
    }

    logger.info('CryptoUtil initialized with 256-bit encryption key');
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   * @method encrypt
   * @param {string} plaintext - The data to encrypt
   * @returns {EncryptionResult} Object containing encrypted data, IV, and auth tag
   * @example
   * const result = cryptoUtil.encrypt('sensitive@email.com');
   * // Store result.encrypted, result.iv, result.tag in database
   */
  public encrypt(plaintext: string): EncryptionResult {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      );

      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
      };
    } catch (error) {
      logger.error('Encryption failed', { error });
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt ciphertext using AES-256-GCM
   * @method decrypt
   * @param {string} encrypted - The encrypted hex string
   * @param {string} iv - The initialization vector as hex string
   * @param {string} tag - The authentication tag as hex string
   * @returns {string} The decrypted plaintext
   * @throws {Error} If decryption fails (invalid tag or corrupted data)
   * @example
   * const plaintext = cryptoUtil.decrypt(
   *   result.encrypted,
   *   result.iv,
   *   result.tag
   * );
   */
  public decrypt(encrypted: string, iv: string, tag: string): string {
    try {
      // Convert hex strings back to buffers
      const ivBuffer = Buffer.from(iv, 'hex');
      const tagBuffer = Buffer.from(tag, 'hex');

      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        ivBuffer
      );

      // Set authentication tag
      decipher.setAuthTag(tagBuffer);

      // Decrypt data
      let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed - authentication tag verification failed', {
        error,
      });
      throw new Error('Failed to decrypt data - authentication tag verification failed');
    }
  }

  /**
   * Generate a random encryption key (for development/setup only)
   * @static
   * @method generateKey
   * @returns {string} A 64-character hex string (256-bit AES key)
   * @example
   * const keyHex = CryptoUtil.generateKey();
   * console.log('Set ENCRYPTION_KEY=' + keyHex);
   */
  public static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a string using bcrypt (for passwords)
   * @static
   * @async
   * @method hashPassword
   * @param {string} password - The password to hash
   * @param {number} [saltRounds=12] - Number of salt rounds (higher = slower but more secure)
   * @returns {Promise<string>} The bcrypt hash
   */
  public static async hashPassword(
    password: string,
    saltRounds = 12
  ): Promise<string> {
    try {
      const bcrypt = await import('bcryptjs');
      return await bcrypt.default.hash(password, saltRounds);
    } catch (error) {
      logger.error('Password hashing failed', { error });
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Compare password with hash using bcrypt
   * @static
   * @async
   * @method comparePassword
   * @param {string} password - The plain password to compare
   * @param {string} hash - The bcrypt hash to compare against
   * @returns {Promise<boolean>} True if password matches hash
   */
  public static async comparePassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    try {
      const bcrypt = await import('bcryptjs');
      return await bcrypt.default.compare(password, hash);
    } catch (error) {
      logger.error('Password comparison failed', { error });
      return false;
    }
  }

  /**
   * Create HMAC signature for request verification
   * @method createSignature
   * @param {string} data - The data to sign
   * @param {string} [secret] - Optional secret (uses encryption key if not provided)
   * @returns {string} The HMAC signature as hex string
   */
  public createSignature(data: string, secret?: string): string {
    const secretBuffer = secret
      ? Buffer.from(secret)
      : this.encryptionKey;

    return crypto
      .createHmac('sha256', secretBuffer)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   * @method verifySignature
   * @param {string} data - The original data
   * @param {string} signature - The signature to verify
   * @param {string} [secret] - Optional secret (uses encryption key if not provided)
   * @returns {boolean} True if signature is valid
   */
  public verifySignature(data: string, signature: string, secret?: string): boolean {
    try {
      const expectedSignature = this.createSignature(data, secret);
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.warn('Signature verification failed', { error });
      return false;
    }
  }
}

// Export singleton instance
export const cryptoUtil = new CryptoUtil();
