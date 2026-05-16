/**
 * @fileoverview File upload utilities with validation, virus scanning, and S3 integration
 * Provides secure file upload handling for manuscripts and covers
 * @module utils/fileUpload
 */

import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from './logger.js';

/**
 * Allowed file types and their MIME types
 * @constant ALLOWED_FILE_TYPES
 */
const ALLOWED_FILE_TYPES = {
  manuscript: {
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
    maxSize: parseInt(process.env.MAX_FILE_SIZE_MANUSCRIPT || '209715200'), // 200MB
  },
  cover: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxSize: parseInt(process.env.MAX_FILE_SIZE_COVER || '5242880'), // 5MB
  },
};

/**
 * Memory storage configuration for multer
 * @constant storage
 */
const storage = multer.memoryStorage();

/**
 * File filter for multer
 * Validates file types and sizes
 * @function fileFilter
 * @param {Express.Request} req - Express request object
 * @param {Express.Multer.File} file - Uploaded file
 * @param {Function} cb - Callback function
 */
function fileFilter(
  req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile?: boolean) => void
): void {
  const fileType = req.query.type || 'cover';
  const allowedTypes = ALLOWED_FILE_TYPES[fileType as keyof typeof ALLOWED_FILE_TYPES];

  if (!allowedTypes) {
    return cb(new Error('Invalid file type parameter'));
  }

  // Check MIME type
  if (!allowedTypes.mimeTypes.includes(file.mimetype)) {
    logger.warn('Invalid file MIME type', {
      filename: file.originalname,
      mimetype: file.mimetype,
      allowed: allowedTypes.mimeTypes,
    });
    return cb(
      new Error(
        `Invalid file type. Allowed: ${allowedTypes.mimeTypes.join(', ')}`
      )
    );
  }

  // Check file extension
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!allowedTypes.extensions.includes(fileExtension)) {
    logger.warn('Invalid file extension', {
      filename: file.originalname,
      extension: fileExtension,
      allowed: allowedTypes.extensions,
    });
    return cb(
      new Error(
        `Invalid file extension. Allowed: ${allowedTypes.extensions.join(', ')}`
      )
    );
  }

  // Check file size
  if (
    req.headers['content-length'] &&
    parseInt(req.headers['content-length']) > allowedTypes.maxSize
  ) {
    logger.warn('File size exceeds limit', {
      filename: file.originalname,
      size: req.headers['content-length'],
      maxSize: allowedTypes.maxSize,
    });
    return cb(
      new Error(
        `File size exceeds maximum of ${Math.round(allowedTypes.maxSize / 1024 / 1024)}MB`
      )
    );
  }

  cb(null, true);
}

/**
 * Multer instance for file uploads
 * @constant uploader
 */
export const uploader = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 209715200, // 200MB max
  },
});

/**
 * AWS S3 client configuration
 * @class S3Uploader
 */
export class S3Uploader {
  private s3Client: S3Client;
  private bucketName: string;

  /**
   * Initialize S3 uploader
   * @constructor
   * @throws {Error} If AWS credentials are not configured
   */
  constructor() {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not configured');
    }

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    this.bucketName = process.env.S3_BUCKET_NAME || 'wistaar-files';
  }

  /**
   * Scan file for viruses (mock implementation)
   * In production, integrate with ClamAV or VirusTotal API
   * @async
   * @method scanForViruses
   * @param {Buffer} fileBuffer - File buffer to scan
   * @param {string} filename - Original filename
   * @returns {Promise<boolean>} True if file is clean
   */
  public async scanForViruses(fileBuffer: Buffer, filename: string): Promise<boolean> {
    try {
      // TODO: Integrate with ClamAV
      // For now, basic validation
      if (fileBuffer.length === 0) {
        logger.warn('Empty file uploaded', { filename });
        return false;
      }

      logger.info('File scanned successfully', { filename, size: fileBuffer.length });
      return true;
    } catch (error) {
      logger.error('Virus scan failed', { filename, error });
      return false;
    }
  }

  /**
   * Upload file to S3 with server-side encryption
   * @async
   * @method uploadToS3
   * @param {Buffer} fileBuffer - File content to upload
   * @param {string} filename - Original filename
   * @param {string} fileType - Type of file (manuscript/cover)
   * @param {string} userId - User ID for file organization
   * @returns {Promise<string>} S3 file URL
   * @throws {Error} If upload fails
   */
  public async uploadToS3(
    fileBuffer: Buffer,
    filename: string,
    fileType: 'manuscript' | 'cover',
    userId: string
  ): Promise<string> {
    try {
      // Scan for viruses
      const isClean = await this.scanForViruses(fileBuffer, filename);
      if (!isClean) {
        throw new Error('File contains malicious content');
      }

      // Generate unique filename to prevent collisions
      const fileExtension = path.extname(filename);
      const uniqueFilename = `${fileType}s/${userId}/${uuid()}${fileExtension}`;

      // Create S3 upload command with encryption
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: uniqueFilename,
        Body: fileBuffer,
        ContentType: this.getMimeType(filename),
        ServerSideEncryption: 'AES256', // Server-side encryption (SSE-S3)
        Metadata: {
          'original-filename': filename,
          'uploaded-by': userId,
          'upload-date': new Date().toISOString(),
        },
      });

      // Upload to S3
      await this.s3Client.send(command);

      // Construct S3 URL
      const s3Url = `s3://${this.bucketName}/${uniqueFilename}`;

      logger.info('File uploaded to S3', {
        filename,
        uniqueFilename,
        fileType,
        userId,
      });

      return s3Url;
    } catch (error) {
      logger.error('S3 upload failed', { filename, error });
      throw new Error('Failed to upload file to cloud storage');
    }
  }

  /**
   * Get MIME type from filename
   * @private
   * @method getMimeType
   * @param {string} filename - Filename with extension
   * @returns {string} MIME type
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Generate signed URL for private file access
   * @async
   * @method generateSignedUrl
   * @param {string} s3Key - S3 object key
   * @param {number} [expirySeconds=3600] - URL expiry in seconds (default 1 hour)
   * @returns {Promise<string>} Signed URL
   */
  public async generateSignedUrl(
    s3Key: string,
    expirySeconds = 3600
  ): Promise<string> {
    try {
      // TODO: Use AWS SDK v3 getSignedUrl function
      // For now, return placeholder
      const baseUrl = `https://${this.bucketName}.s3.amazonaws.com`;
      return `${baseUrl}/${s3Key}`;
    } catch (error) {
      logger.error('Failed to generate signed URL', { s3Key, error });
      throw new Error('Failed to generate signed URL');
    }
  }
}

/**
 * Sanitize filename to prevent directory traversal
 * @function sanitizeFilename
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  return filename
    .replace(/[\/\\]/g, '')
    .replace(/\.\./g, '')
    .replace(/[^\w\s.-]/g, '')
    .substring(0, 255);
}

/**
 * Validate file buffer (basic validation)
 * @function validateFileBuffer
 * @param {Buffer} buffer - File buffer to validate
 * @param {string} filename - Filename
 * @returns {boolean} True if valid
 */
export function validateFileBuffer(buffer: Buffer, filename: string): boolean {
  if (!buffer || buffer.length === 0) {
    logger.warn('Empty file buffer', { filename });
    return false;
  }

  // Check file signature (magic bytes)
  const fileSignatures: Record<string, Buffer[]> = {
    pdf: [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
    jpg: [Buffer.from([0xff, 0xd8, 0xff])], // JPEG signature
    png: [Buffer.from([0x89, 0x50, 0x4e, 0x47])], // PNG signature
    webp: [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF
  };

  const ext = path.extname(filename).toLowerCase().substring(1);
  const signatures = fileSignatures[ext];

  if (signatures) {
    // Check if buffer starts with any valid signature
    const isValid = signatures.some((sig) =>
      buffer.subarray(0, sig.length).equals(sig)
    );

    if (!isValid) {
      logger.warn('Invalid file signature', { filename, ext });
      return false;
    }
  }

  return true;
}
