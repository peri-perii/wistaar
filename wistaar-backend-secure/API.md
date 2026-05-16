# 📚 API Documentation

Complete API reference for Wistaar Secure Backend with examples and status codes.

## Table of Contents

1. [Base URL & Authentication](#base-url--authentication)
2. [Response Format](#response-format)
3. [Error Handling](#error-handling)
4. [Authentication Endpoints](#authentication-endpoints)
5. [Book Endpoints](#book-endpoints)
6. [Admin Endpoints](#admin-endpoints)
7. [User Endpoints](#user-endpoints)
8. [Payment Endpoints](#payment-endpoints)
9. [Notification Endpoints](#notification-endpoints)
10. [Rate Limiting](#rate-limiting)

---

## Base URL & Authentication

### Base URL

```
Development: http://localhost:5000/api
Production:  https://wistaar.com/api
```

### Authentication

Include JWT access token in all authenticated requests:

```
Authorization: Bearer <access_token>
```

Access tokens expire in 15 minutes. Use refresh tokens to obtain new access tokens.

### Headers

```javascript
// All requests must include
Content-Type: application/json

// Optional but recommended
User-Agent: Wistaar-Client/1.0
X-Request-ID: <unique-id>

// For authenticated requests
Authorization: Bearer <token>
X-CSRF-Token: <csrf-token>
```

---

## Response Format

### Success Response

All successful responses return:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // response data
  },
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

### Paginated Response

List endpoints return paginated data:

```json
{
  "success": true,
  "message": "Books retrieved successfully",
  "data": [
    {
      "id": "book-id-1",
      "title": "Example Book",
      "price": 299
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

---

## Error Handling

### Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | GET /api/books/book-id |
| 201 | Created | POST /api/books |
| 400 | Bad Request | Invalid validation |
| 401 | Unauthorized | Missing/expired token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Email already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Database connection failed |

### Error Codes

| Code | Meaning | HTTP | Resolution |
|------|---------|------|-----------|
| INVALID_TOKEN | JWT token is malformed | 401 | Refresh token |
| TOKEN_EXPIRED | Access token expired | 401 | Use refresh endpoint |
| MISSING_TOKEN | No auth token provided | 401 | Add Authorization header |
| UNAUTHORIZED | Insufficient permissions | 403 | Use correct role |
| VALIDATION_ERROR | Input validation failed | 400 | Fix request data |
| UNIQUE_CONSTRAINT | Email/field already exists | 409 | Use different value |
| RECORD_NOT_FOUND | Resource doesn't exist | 404 | Verify resource ID |
| RATE_LIMIT_EXCEEDED | Too many requests | 429 | Wait and retry |
| PAYMENT_FAILED | Payment processing failed | 402 | Retry or change method |

---

## Authentication Endpoints

### POST /auth/signup

Register a new user account.

**Request**

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

**Request Body**

```typescript
{
  email: string;        // Valid email, will be lowercase
  password: string;     // Min 8 chars, upper/lower/number/special
  name: string;         // 2-255 characters
  role?: string;        // Optional: 'user' or 'author' (default: 'user')
}
```

**Response** (201 Created)

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "user-uuid-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2025-01-15T10:30:45.123Z",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "emailVerificationToken": "verify-token-uuid"
  },
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

**Set-Cookie Header**
```
refreshToken=<value>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Errors**

- 400: Validation error (weak password, invalid email)
- 409: Email already registered

**Rate Limit**: 5 requests per 15 minutes

---

### POST /auth/login

Authenticate user and get access token.

**Request**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**Request Body**

```typescript
{
  email: string;        // Registered email
  password: string;     // User password
}
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "user-uuid-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "isEmailVerified": true,
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  },
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

**Errors**

- 400: Validation error
- 401: Invalid credentials
- 429: Account locked (5 failed attempts)

**Rate Limit**: 5 requests per 15 minutes

---

### POST /auth/refresh

Get new access token using refresh token.

**Request**

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -H "Cookie: refreshToken=<value>"
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  },
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

**Errors**

- 401: Invalid/expired refresh token
- 401: Refresh token revoked

---

### POST /auth/logout

Revoke all refresh tokens and logout.

**Request**

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer <access_token>"
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Logout successful",
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

**Set-Cookie Header**
```
refreshToken=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0
```

---

### POST /auth/verify-email

Verify user email with token sent during signup.

**Request**

```bash
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "verify-token-uuid"
  }'
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Email verified successfully",
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

**Errors**

- 400: Invalid/expired token
- 404: User not found

**Rate Limit**: 3 attempts per 24 hours

---

### POST /auth/forgot-password

Request password reset token.

**Request**

```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Reset email sent to user@example.com",
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

**Rate Limit**: 3 attempts per 24 hours

---

### POST /auth/reset-password

Reset password with token from email.

**Request**

```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset-token-uuid",
    "password": "NewPassword123!"
  }'
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Password reset successfully",
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

**Errors**

- 400: Invalid/expired token
- 400: Weak password

---

## Book Endpoints

### GET /books

List all approved books.

**Request**

```bash
curl -X GET "http://localhost:5000/api/books?page=1&limit=20&genre=fiction&sort=-createdAt"
```

**Query Parameters**

```typescript
page?: number;          // Default: 1
limit?: number;         // Default: 20, Max: 100
genre?: string;         // Filter by genre
sort?: string;          // Field name, prefix with - for DESC
search?: string;        // Search in title/description
minPrice?: number;      // Minimum price
maxPrice?: number;      // Maximum price
authorId?: string;      // Filter by author
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Books retrieved successfully",
  "data": [
    {
      "id": "book-uuid-1",
      "title": "Example Book",
      "description": "A great book",
      "genre": "fiction",
      "price": 299,
      "authorId": "author-uuid-1",
      "authorName": "John Author",
      "coverImage": "https://s3.example.com/covers/book-1.jpg",
      "rating": 4.5,
      "reviewCount": 42,
      "viewCount": 1000,
      "purchaseCount": 50,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true
  },
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

**Rate Limit**: 100 requests per 15 minutes

---

### GET /books/:bookId

Get detailed book information.

**Request**

```bash
curl -X GET http://localhost:5000/api/books/book-uuid-1 \
  -H "Authorization: Bearer <access_token>"
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Book retrieved successfully",
  "data": {
    "id": "book-uuid-1",
    "title": "Example Book",
    "description": "A great book",
    "genre": "fiction",
    "price": 299,
    "language": "en",
    "isbn": "978-3-16-148410-0",
    "authorId": "author-uuid-1",
    "authorName": "John Author",
    "authorBio": "Award-winning author",
    "coverImage": "https://s3.example.com/covers/book-1.jpg",
    "manuscriptUrl": "https://s3.example.com/manuscripts/book-1.pdf",
    "totalChapters": 25,
    "rating": 4.5,
    "reviews": [
      {
        "id": "review-uuid-1",
        "userId": "user-uuid-1",
        "userName": "Jane Reader",
        "rating": 5,
        "title": "Excellent book!",
        "content": "Highly recommended",
        "createdAt": "2025-01-10T00:00:00.000Z"
      }
    ],
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:45.123Z"
  },
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

**Errors**

- 404: Book not found

---

### GET /books/:bookId/chapters

Get all chapters of a book.

**Request**

```bash
curl -X GET http://localhost:5000/api/books/book-uuid-1/chapters
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Chapters retrieved successfully",
  "data": [
    {
      "id": "chapter-uuid-1",
      "bookId": "book-uuid-1",
      "title": "Chapter 1: Introduction",
      "orderNum": 1,
      "pageStart": 1,
      "pageEnd": 25
    }
  ],
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

---

### POST /books

Create new book (authors only).

**Request**

```bash
curl -X POST http://localhost:5000/api/books \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "title": "My New Book",
    "description": "A detailed description of the book",
    "genre": "fiction",
    "price": 499,
    "language": "en",
    "isbn": "978-3-16-148410-0"
  }'
```

**Request Body**

```typescript
{
  title: string;              // 1-500 characters
  description: string;        // 10-5000 characters
  genre: string;              // fiction, non-fiction, mystery, etc.
  price: number;              // Greater than 0
  language?: string;          // Language code (default: 'en')
  isbn?: string;              // ISBN-10 or ISBN-13
}
```

**Response** (201 Created)

```json
{
  "success": true,
  "message": "Book created successfully",
  "data": {
    "id": "book-uuid-new",
    "title": "My New Book",
    "status": "draft",
    "authorId": "author-uuid-1",
    "createdAt": "2025-01-15T10:30:45.123Z"
  },
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

**Requires**: Author role

---

### PUT /books/:bookId

Update book details.

**Request**

```bash
curl -X PUT http://localhost:5000/api/books/book-uuid-1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "title": "Updated Title",
    "price": 599
  }'
```

**Errors**

- 404: Book not found
- 403: Not book owner (unless admin)

---

## Admin Endpoints

### GET /admin/books/pending

List pending book submissions (admin only).

**Request**

```bash
curl -X GET "http://localhost:5000/api/admin/books/pending?page=1&limit=20" \
  -H "Authorization: Bearer <admin_token>"
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Pending books retrieved successfully",
  "data": [
    {
      "id": "book-uuid-pending",
      "title": "Book Awaiting Review",
      "authorName": "Author Name",
      "submittedAt": "2025-01-15T08:00:00.000Z",
      "description": "..."
    }
  ],
  "meta": {},
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

**Requires**: Admin role

---

### POST /admin/books/:bookId/approve

Approve a book submission.

**Request**

```bash
curl -X POST http://localhost:5000/api/admin/books/book-uuid-1/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "feedback": "Great content, approved for publication"
  }'
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Book approved successfully",
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

**Requires**: Admin role

---

### POST /admin/books/:bookId/reject

Reject a book submission.

**Request**

```bash
curl -X POST http://localhost:5000/api/admin/books/book-uuid-1/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "reason": "Content policy violation",
    "feedback": "Please review our content guidelines"
  }'
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Book rejected successfully",
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

**Requires**: Admin role

---

## User Endpoints

### GET /users/profile

Get current user profile.

**Request**

```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer <access_token>"
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "user-uuid-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "avatar": "https://s3.example.com/avatars/user-123.jpg",
    "bio": "Book lover",
    "isEmailVerified": true,
    "booksRead": 15,
    "booksWishlisted": 8,
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

**Requires**: Authentication

---

### PUT /users/profile

Update user profile.

**Request**

```bash
curl -X PUT http://localhost:5000/api/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "name": "Jane Doe",
    "bio": "Avid reader",
    "avatar": "https://example.com/avatar.jpg"
  }'
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

---

### POST /users/change-password

Change account password.

**Request**

```bash
curl -X POST http://localhost:5000/api/users/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "currentPassword": "OldPass123!",
    "newPassword": "NewPass456!"
  }'
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Password changed successfully",
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

**Errors**

- 400: Current password incorrect
- 400: New password too weak

---

## Payment Endpoints

### POST /payments/purchase

Purchase a book.

**Request**

```bash
curl -X POST http://localhost:5000/api/payments/purchase \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "bookId": "book-uuid-1",
    "couponCode": "SAVE20"
  }'
```

**Response** (201 Created)

```json
{
  "success": true,
  "message": "Purchase initiated",
  "data": {
    "orderId": "order-uuid-123",
    "amount": 399,
    "discountAmount": 100,
    "finalAmount": 299,
    "paymentUrl": "https://payment-gateway.com/checkout?order=order-uuid-123",
    "status": "pending"
  },
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

**Errors**

- 404: Book not found
- 400: Invalid coupon code
- 409: Book already purchased

---

### POST /payments/verify

Verify payment completion.

**Request**

```bash
curl -X POST http://localhost:5000/api/payments/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "transactionId": "txn-payment-123",
    "orderId": "order-uuid-123",
    "paymentResponse": {}
  }'
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "orderId": "order-uuid-123",
    "status": "completed",
    "bookAccess": "https://s3.example.com/books/book-uuid-1.pdf"
  },
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

---

## Notification Endpoints

### GET /notifications

Get user notifications.

**Request**

```bash
curl -X GET "http://localhost:5000/api/notifications?limit=20" \
  -H "Authorization: Bearer <access_token>"
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": [
    {
      "id": "notif-uuid-1",
      "type": "purchase_confirmation",
      "title": "Purchase Successful",
      "message": "Your book purchase was successful",
      "read": false,
      "createdAt": "2025-01-15T10:30:45.123Z"
    }
  ],
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

---

### POST /notifications/:id/read

Mark notification as read.

**Request**

```bash
curl -X POST http://localhost:5000/api/notifications/notif-uuid-1/read \
  -H "Authorization: Bearer <access_token>"
```

**Response** (200 OK)

```json
{
  "success": true,
  "message": "Notification marked as read",
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

---

## Rate Limiting

Different endpoints have different rate limits based on sensitivity.

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Auth (login/signup) | 5 | 15 min |
| General API | 100 | 15 min |
| Upload | 10 | 1 hour |
| Payments | 5 | 1 hour |
| Email Verification | 3 | 24 hours |

**Rate Limit Headers**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705328400
```

**429 Response**

```json
{
  "success": false,
  "message": "Too many requests, please try again later",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "retryAfter": 60
  },
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

---

## Webhooks (Future)

Future webhook endpoints for payment gateway integrations:

- `POST /webhooks/razorpay` - Razorpay payment notifications
- `POST /webhooks/stripe` - Stripe payment notifications

---

**Last Updated**: January 2025
**API Version**: 1.0.0
