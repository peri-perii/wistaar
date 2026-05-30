/**
 * @fileoverview Input validation schemas using Zod
 * Defines types and validations for all API endpoints
 * @module schemas/validation
 */

import { z } from 'zod';

/**
 * Signup request validation schema
 * @constant signupSchema
 */
export const signupSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        'Password must contain uppercase, lowercase, number, and special character'
      ),
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(255, 'Name must be less than 255 characters'),
    role: z
      .enum(['USER', 'AUTHOR'])
      .optional()
      .default('USER'),
  }),
});

/**
 * Login request validation schema
 * @constant loginSchema
 */
export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
    password: z.string().min(1, 'Password is required'),
  }),
});

/**
 * Google login request validation schema
 * @constant googleLoginSchema
 */
export const googleLoginSchema = z.object({
  body: z.object({
    credential: z.string().min(1, 'Google credential token is required'),
  }),
});

/**
 * Email verification request validation schema
 * @constant emailVerificationSchema
 */
export const emailVerificationSchema = z.object({
  body: z.object({
    token: z
      .string()
      .min(1, 'Verification token is required')
      .uuid('Invalid token format'),
  }),
});

/**
 * Password reset request validation schema
 * @constant passwordResetRequestSchema
 */
export const passwordResetRequestSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase(),
  }),
});

/**
 * Password reset confirmation validation schema
 * @constant passwordResetSchema
 */
export const passwordResetSchema = z.object({
  body: z.object({
    token: z
      .string()
      .min(1, 'Reset token is required')
      .uuid('Invalid token format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        'Password must contain uppercase, lowercase, number, and special character'
      ),
  }),
});

/**
 * Create book validation schema
 * @constant createBookSchema
 */
export const createBookSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(500, 'Title must be less than 500 characters'),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(5000, 'Description must be less than 5000 characters'),
    genre: z
      .string()
      .min(1, 'Genre is required')
      .max(100, 'Genre must be less than 100 characters'),
    price: z
      .number()
      .positive('Price must be greater than 0')
      .max(100000, 'Price must be reasonable'),
    language: z
      .string()
      .min(2, 'Language code must be at least 2 characters')
      .max(10, 'Language code must be less than 10 characters')
      .optional()
      .default('en'),
    isbn: z
      .string()
      .min(10, 'ISBN must be at least 10 characters')
      .optional(),
  }),
});

/**
 * Update book validation schema
 * @constant updateBookSchema
 */
export const updateBookSchema = z.object({
  body: createBookSchema.shape.body.partial(),
  params: z.object({
    id: z
      .string()
      .min(1, 'Book ID is required')
      .cuid('Invalid book ID format'),
  }),
});

/**
 * Book ID parameter validation schema
 * @constant bookIdSchema
 */
export const bookIdSchema = z.object({
  params: z.object({
    id: z
      .string()
      .min(1, 'Book ID is required')
      .cuid('Invalid book ID format'),
  }),
});

/**
 * Purchase creation validation schema
 * @constant createPurchaseSchema
 */
export const createPurchaseSchema = z.object({
  body: z.object({
    bookId: z
      .string()
      .min(1, 'Book ID is required')
      .cuid('Invalid book ID format'),
    couponCode: z
      .string()
      .max(50, 'Coupon code must be less than 50 characters')
      .optional(),
  }),
});

/**
 * Purchase verification validation schema
 * @constant verifyPurchaseSchema
 */
export const verifyPurchaseSchema = z.object({
  body: z.object({
    transactionId: z
      .string()
      .min(1, 'Transaction ID is required'),
    paymentGatewayResponse: z
      .object({})
      .optional(),
  }),
});

/**
 * Coupon code validation schema
 * @constant couponCodeSchema
 */
export const couponCodeSchema = z.object({
  params: z.object({
    code: z
      .string()
      .min(1, 'Coupon code is required')
      .max(50, 'Coupon code must be less than 50 characters'),
  }),
  query: z.object({
    amount: z
      .string()
      .optional()
      .transform((val) => val ? parseFloat(val) : undefined),
  }),
});

/**
 * Review creation validation schema
 * @constant createReviewSchema
 */
export const createReviewSchema = z.object({
  body: z.object({
    bookId: z
      .string()
      .min(1, 'Book ID is required')
      .cuid('Invalid book ID format'),
    rating: z
      .number()
      .int('Rating must be an integer')
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating must be at most 5'),
    title: z
      .string()
      .min(1, 'Review title is required')
      .max(200, 'Review title must be less than 200 characters')
      .optional(),
    content: z
      .string()
      .min(10, 'Review content must be at least 10 characters')
      .max(5000, 'Review content must be less than 5000 characters')
      .optional(),
  }),
});

/**
 * Pagination query validation schema
 * @constant paginationSchema
 */
export const paginationSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .default('1')
      .transform((val) => Math.max(1, parseInt(val, 10)))
      .catch(1),
    limit: z
      .string()
      .optional()
      .default('20')
      .transform((val) => Math.min(Math.max(1, parseInt(val, 10)), 100))
      .catch(20),
    sort: z
      .string()
      .optional(),
  }),
});

/**
 * Admin approve book validation schema
 * @constant approveBookSchema
 */
export const approveBookSchema = z.object({
  params: z.object({
    id: z
      .string()
      .min(1, 'Book ID is required')
      .cuid('Invalid book ID format'),
  }),
  body: z.object({
    feedback: z
      .string()
      .max(1000, 'Feedback must be less than 1000 characters')
      .optional(),
  }),
});

/**
 * Admin reject book validation schema
 * @constant rejectBookSchema
 */
export const rejectBookSchema = z.object({
  params: z.object({
    id: z
      .string()
      .min(1, 'Book ID is required')
      .cuid('Invalid book ID format'),
  }),
  body: z.object({
    reason: z
      .string()
      .min(1, 'Rejection reason is required')
      .max(500, 'Reason must be less than 500 characters'),
    feedback: z
      .string()
      .max(1000, 'Feedback must be less than 1000 characters')
      .optional(),
  }),
});

/**
 * Wishlist item validation schema
 * @constant wishlistItemSchema
 */
export const wishlistItemSchema = z.object({
  body: z.object({
    bookId: z
      .string()
      .min(1, 'Book ID is required')
      .cuid('Invalid book ID format'),
  }),
});

/**
 * User profile update validation schema
 * @constant updateProfileSchema
 */
export const updateProfileSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(255, 'Name must be less than 255 characters')
      .optional(),
    bio: z
      .string()
      .max(500, 'Bio must be less than 500 characters')
      .optional(),
    avatar: z
      .string()
      .url('Avatar must be a valid URL')
      .optional(),
  }),
});

/**
 * Change password validation schema
 * @constant changePasswordSchema
 */
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z
      .string()
      .min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        'Password must contain uppercase, lowercase, number, and special character'
      ),
  }),
});

/**
 * Create coupon validation schema (admin only)
 * @constant createCouponSchema
 */
export const createCouponSchema = z.object({
  body: z.object({
    code: z
      .string()
      .min(3, 'Coupon code must be at least 3 characters')
      .max(50, 'Coupon code must be less than 50 characters')
      .toUpperCase(),
    description: z
      .string()
      .max(500, 'Description must be less than 500 characters')
      .optional(),
    discountType: z
      .enum(['percentage', 'fixed'], {
        errorMap: () => ({ message: 'Discount type must be percentage or fixed' }),
      }),
    discountValue: z
      .number()
      .positive('Discount value must be greater than 0'),
    maxUses: z
      .number()
      .positive('Max uses must be greater than 0')
      .optional(),
    minPurchaseAmount: z
      .number()
      .positive('Min purchase amount must be greater than 0')
      .optional(),
    validFrom: z
      .string()
      .datetime('Invalid datetime format'),
    validUntil: z
      .string()
      .datetime('Invalid datetime format'),
  }),
});
