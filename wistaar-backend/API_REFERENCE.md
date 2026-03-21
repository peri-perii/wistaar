# 📚 Wistaar Reading Studio - Complete API Reference

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints marked with 🔐 require JWT token in header:
```
Authorization: Bearer <access_token>
```

---

## 📋 API Endpoints

### **Authentication Routes** (`/auth`)

#### 1. Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}

Response: 201 Created
{
  "message": "Account created! Check your email to verify.",
  "userId": "uuid"
}
```

#### 2. Sign In
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response: 200 OK
{
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

#### 3. Verify Email 🔐
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "verification_token_from_email"
}

Response: 200 OK
{
  "message": "Email verified successfully"
}
```

#### 4. Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

Response: 200 OK
{
  "message": "Password reset link sent to email"
}
```

#### 5. Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "newPassword": "NewPassword123!"
}

Response: 200 OK
{
  "message": "Password reset successfully"
}
```

#### 6. Google Sign In
```http
POST /api/auth/google-signin
Content-Type: application/json

{
  "googleToken": "google_id_token"
}

Response: 200 OK
{
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "name": "John Doe",
    "avatar": "url_to_avatar"
  }
}
```

---

### **Books Routes** (`/books`)

#### 1. Get All Books
```http
GET /api/books?page=1&limit=10&genre=fiction&sort=rating

Response: 200 OK
{
  "books": [
    {
      "id": "uuid",
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "genre": "fiction",
      "price": 199.99,
      "rating": 4.5,
      "coverImageUrl": "url",
      "description": "A classic novel..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

#### 2. Get Single Book
```http
GET /api/books/:bookId

Response: 200 OK
{
  "id": "uuid",
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "genre": "fiction",
  "price": 199.99,
  "rating": 4.5,
  "totalChapters": 9,
  "chapters": [
    {
      "id": "uuid",
      "number": 1,
      "title": "Chapter 1",
      "content": "In my younger and more vulnerable years..."
    }
  ]
}
```

#### 3. Get Book Chapter
```http
GET /api/books/:bookId/chapters/:chapterNumber 🔐

Response: 200 OK
{
  "chapterNumber": 1,
  "title": "Chapter 1",
  "content": "Long text...",
  "readingTime": "12 min"
}
```

#### 4. Submit Book (Author) 🔐
```http
POST /api/books/submit
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
  - title: "My Book"
  - description: "Book description"
  - genre: "fiction"
  - price: 199.99
  - totalChapters: 5
  - freeChapters: 2
  - manuscript: <PDF file>
  - coverImage: <Image file>

Response: 201 Created
{
  "message": "Book submitted for review",
  "bookId": "uuid",
  "status": "pending"
}
```

---

### **Cart Routes** (`/cart`)

#### 1. Get Cart 🔐
```http
GET /api/cart
Authorization: Bearer <token>

Response: 200 OK
{
  "items": [
    {
      "id": "uuid",
      "bookId": "uuid",
      "title": "The Great Gatsby",
      "price": 199.99,
      "addedAt": "2024-03-21T10:00:00Z"
    }
  ],
  "count": 2,
  "total": 399.98
}
```

#### 2. Add to Cart 🔐
```http
POST /api/cart/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "bookId": "uuid"
}

Response: 201 Created
{
  "message": "Added to cart",
  "cartItemId": "uuid",
  "bookPrice": 199.99
}
```

#### 3. Remove from Cart 🔐
```http
DELETE /api/cart/remove/:cartItemId
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Removed from cart"
}
```

#### 4. Clear Cart 🔐
```http
DELETE /api/cart/clear
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Cart cleared"
}
```

---

### **Purchases Routes** (`/purchases`)

#### 1. Get Purchase History 🔐
```http
GET /api/purchases
Authorization: Bearer <token>

Response: 200 OK
{
  "purchases": [
    {
      "id": "uuid",
      "bookId": "uuid",
      "title": "The Great Gatsby",
      "amount": 199.99,
      "paymentStatus": "completed",
      "purchasedAt": "2024-03-21T10:00:00Z"
    }
  ],
  "count": 5,
  "totalSpent": 999.95
}
```

#### 2. Initiate Purchase 🔐
```http
POST /api/purchases/initiate
Authorization: Bearer <token>
Content-Type: application/json

{
  "bookId": "uuid",
  "couponCode": "SAVE20"  // optional
}

Response: 201 Created
{
  "purchaseId": "uuid",
  "transactionId": "TXN_123456",
  "bookId": "uuid",
  "amount": 159.99,
  "currency": "INR",
  "paymentData": {
    "txnId": "TXN_123456",
    "amount": 159.99,
    "bookTitle": "The Great Gatsby"
  }
}
```

#### 3. Verify Purchase 🔐
```http
POST /api/purchases/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "transactionId": "TXN_123456",
  "paymentGatewayResponse": { /* PayU response */ }
}

Response: 200 OK
{
  "message": "Purchase completed",
  "purchaseId": "uuid",
  "bookId": "uuid",
  "amount": 199.99
}
```

#### 4. Check if Purchased 🔐
```http
GET /api/purchases/check/:bookId
Authorization: Bearer <token>

Response: 200 OK
{
  "hasPurchased": true
}
```

---

### **Coupons Routes** (`/coupons`)

#### 1. Validate Coupon
```http
GET /api/coupons/validate/SAVE20?amount=1000

Response: 200 OK
{
  "valid": true,
  "coupon": {
    "code": "SAVE20",
    "discountType": "percentage",
    "discountValue": 20,
    "minPurchase": 500
  },
  "discount": {
    "discountAmount": 200,
    "finalAmount": 800,
    "savings": 200
  }
}
```

#### 2. Get Active Coupons
```http
GET /api/coupons/active?page=1&limit=10

Response: 200 OK
{
  "coupons": [
    {
      "code": "SAVE20",
      "discountType": "percentage",
      "discountValue": 20,
      "minPurchase": 500,
      "expiresAt": "2024-12-31"
    }
  ]
}
```

#### 3. Create Coupon (Admin) 🔐
```http
POST /api/coupons/admin/create
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "code": "SUMMER50",
  "discountType": "percentage",
  "discountValue": 50,
  "minPurchase": 999,
  "maxUses": 100,
  "expiresAt": "2024-06-30"
}

Response: 201 Created
{
  "message": "Coupon created",
  "couponId": "uuid",
  "code": "SUMMER50"
}
```

#### 4. Update Coupon (Admin) 🔐
```http
PUT /api/coupons/admin/:couponId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "discountValue": 60,
  "isActive": false
}

Response: 200 OK
{
  "message": "Coupon updated"
}
```

---

### **Admin Routes** (`/admin`)

#### 1. Get Dashboard 🔐
```http
GET /api/admin/dashboard
Authorization: Bearer <admin_token>

Response: 200 OK
{
  "stats": {
    "totalUsers": 1500,
    "totalRevenue": 49999.50,
    "pendingBooks": 23,
    "totalBooks": 456,
    "recentTransactions": 145
  }
}
```

#### 2. Get Pending Submissions 🔐
```http
GET /api/admin/submissions?status=pending&page=1&limit=10
Authorization: Bearer <admin_token>

Response: 200 OK
{
  "submissions": [
    {
      "id": "uuid",
      "title": "New Book",
      "description": "...",
      "genre": "fiction",
      "price": 199.99,
      "authorName": "John Doe",
      "authorEmail": "john@example.com",
      "status": "pending",
      "submittedAt": "2024-03-21"
    }
  ],
  "pagination": { /* ... */ }
}
```

#### 3. Approve Book 🔐
```http
POST /api/admin/submissions/:bookId/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "feedback": "Great book! Published." // optional
}

Response: 200 OK
{
  "message": "Book approved"
}
```

#### 4. Reject Book 🔐
```http
POST /api/admin/submissions/:bookId/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Quality issues",
  "feedback": "Please improve grammar and formatting"
}

Response: 200 OK
{
  "message": "Book rejected"
}
```

#### 5. Add Admin User 🔐
```http
POST /api/admin/admins/add
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "targetUserId": "uuid",
  "canApproveReject": true,
  "canManageCoupons": false,
  "canManageAdmins": false
}

Response: 201 Created
{
  "message": "Admin added",
  "permissionId": "uuid"
}
```

#### 6. Get All Admins 🔐
```http
GET /api/admin/admins
Authorization: Bearer <super_admin_token>

Response: 200 OK
{
  "admins": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "Admin Name",
      "email": "admin@example.com",
      "canApproveReject": true,
      "canManageCoupons": true,
      "canManageAdmins": false,
      "isSuperAdmin": false
    }
  ],
  "count": 5
}
```

---

### **Notifications Routes** (`/notifications`)

#### 1. Get Notifications 🔐
```http
GET /api/notifications?page=1&limit=10&unreadOnly=false
Authorization: Bearer <token>

Response: 200 OK
{
  "notifications": [
    {
      "id": "uuid",
      "title": "📖 Book Approved",
      "message": "Your book has been approved!",
      "type": "book_approved",
      "isRead": false,
      "createdAt": "2024-03-21T10:00:00Z"
    }
  ],
  "unreadCount": 3,
  "pagination": { /* ... */ }
}
```

#### 2. Get Unread Count 🔐
```http
GET /api/notifications/unread-count
Authorization: Bearer <token>

Response: 200 OK
{
  "unreadCount": 5
}
```

#### 3. Mark as Read 🔐
```http
PUT /api/notifications/:notificationId/read
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Marked as read"
}
```

#### 4. Mark All as Read 🔐
```http
PUT /api/notifications/mark-all-read
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "All notifications marked as read"
}
```

#### 5. Delete Notification 🔐
```http
DELETE /api/notifications/:notificationId
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Notification deleted"
}
```

---

### **Wishlists Routes** (`/wishlists`)

#### 1. Get Wishlist 🔐
```http
GET /api/wishlists?page=1&limit=10
Authorization: Bearer <token>

Response: 200 OK
{
  "items": [
    {
      "id": "uuid",
      "bookId": "uuid",
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "price": 199.99,
      "rating": 4.5,
      "genre": "fiction",
      "hasPurchased": false,
      "addedAt": "2024-03-20"
    }
  ],
  "count": 5,
  "pagination": { /* ... */ }
}
```

#### 2. Add to Wishlist 🔐
```http
POST /api/wishlists/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "bookId": "uuid"
}

Response: 201 Created
{
  "message": "Added to wishlist",
  "wishlistId": "uuid"
}
```

#### 3. Remove from Wishlist 🔐
```http
DELETE /api/wishlists/remove/:bookId
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Removed from wishlist"
}
```

#### 4. Check if in Wishlist 🔐
```http
GET /api/wishlists/check/:bookId
Authorization: Bearer <token>

Response: 200 OK
{
  "inWishlist": true
}
```

---

### **Reviews Routes** (`/reviews`)

#### 1. Get Book Reviews
```http
GET /api/reviews/book/:bookId?page=1&limit=10&sort=helpful

Response: 200 OK
{
  "reviews": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "John Doe",
      "userAvatar": "url",
      "rating": 5,
      "reviewText": "Amazing book!",
      "isVerifiedPurchase": true,
      "helpfulCount": 25,
      "createdAt": "2024-03-20"
    }
  ],
  "averageRating": 4.5
}
```

#### 2. Submit Review 🔐
```http
POST /api/reviews/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "bookId": "uuid",
  "rating": 5,
  "reviewText": "Amazing book! Highly recommend."
}

Response: 201 Created
{
  "message": "Review submitted",
  "reviewId": "uuid"
}
```

#### 3. Update Review 🔐
```http
PUT /api/reviews/:reviewId
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 4,
  "reviewText": "Good but could be better"
}

Response: 200 OK
{
  "message": "Review updated"
}
```

---

### **Authors Routes** (`/authors`)

#### 1. Get Author Profile
```http
GET /api/authors/profile/:userId

Response: 200 OK
{
  "id": "uuid",
  "name": "F. Scott Fitzgerald",
  "bio": "Famous American author...",
  "avatar": "url",
  "booksCount": 15,
  "totalReaders": 50000,
  "averageRating": 4.5,
  "socialLinks": {
    "twitter": "https://twitter.com/...",
    "website": "https://example.com"
  }
}
```

#### 2. Get Author's Books
```http
GET /api/authors/my-books 🔐
Authorization: Bearer <token>

Response: 200 OK
{
  "books": [
    {
      "id": "uuid",
      "title": "My Book",
      "status": "approved",
      "price": 199.99,
      "totalChapters": 15,
      "rating": 4.5,
      "readCount": 1000,
      "earnings": 19999.00
    }
  ]
}
```

#### 3. Update Author Profile 🔐
```http
PUT /api/authors/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "bio": "Updated biography",
  "socialLinks": {
    "twitter": "https://twitter.com/author",
    "website": "https://author.com"
  }
}

Response: 200 OK
{
  "message": "Profile updated"
}
```

---

### **Search Routes** (`/search`)

#### 1. Full-Text Search
```http
GET /api/search?q=gatsby&type=all&page=1&limit=10

Response: 200 OK
{
  "results": {
    "books": [ /* books */ ],
    "authors": [ /* authors */ ],
    "chapters": [ /* chapters */ ]
  }
}
```

#### 2. Advanced Search
```http
GET /api/search/advanced?genre=fiction&minRating=4&price=premium&sort=rating

Response: 200 OK
{
  "books": [ /* filtered books */ ]
}
```

#### 3. Search by Genre
```http
GET /api/search/genre/fiction?page=1&limit=20

Response: 200 OK
{
  "books": [ /* fiction books */ ]
}
```

---

### **Analytics Routes** (`/analytics`)

#### 1. Update Reading Progress 🔐
```http
POST /api/analytics/reading-progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "bookId": "uuid",
  "currentChapter": 5,
  "scrollPosition": 450,
  "timeSpentMinutes": 15
}

Response: 201 Created or 200 Updated
{
  "message": "Progress saved"
}
```

#### 2. Get Reading History 🔐
```http
GET /api/analytics/reading-history?page=1&limit=10
Authorization: Bearer <token>

Response: 200 OK
{
  "history": [
    {
      "bookId": "uuid",
      "title": "The Great Gatsby",
      "lastReadAt": "2024-03-21T10:00:00Z",
      "currentChapter": 5,
      "progress": 45
    }
  ]
}
```

#### 3. Get Book Analytics (Author) 🔐
```http
GET /api/analytics/book/:bookId
Authorization: Bearer <author_token>

Response: 200 OK
{
  "bookId": "uuid",
  "totalReaders": 500,
  "averageReadingTime": 120,
  "totalTimeSpent": 60000,
  "mostReadChapters": [1, 2, 3],
  "leastReadChapters": [9, 10]
}
```

---

## 🔄 Real-Time Features

### WebSocket Connection (Future)
```
ws://localhost:5000/socket
```

Events:
- `notification` - Real-time notification
- `book_approved` - Book approval
- `purchase_success` - Purchase notification
- `earning_update` - Author earnings update

---

## 🛡️ Error Responses

All errors follow this format:
```json
{
  "error": "Error message",
  "status": 400,
  "timestamp": "2024-03-21T10:00:00Z"
}
```

Common Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Server Error

---

## 🧪 Testing with cURL

### Example: Sign In
```bash
curl -X POST http://localhost:5000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### Example: Add to Cart (with Auth)
```bash
curl -X POST http://localhost:5000/api/cart/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{"bookId": "book-uuid"}'
```

---

## 📦 Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

---

## 🚀 Deployment Checklist

- [ ] Set up MySQL database
- [ ] Configure environment variables (.env)
- [ ] Set email service (SMTP, SendGrid, etc.)
- [ ] Configure Payment Gateway (PayU)
- [ ] Generate JWT secret key
- [ ] Set CORS origin to production URL
- [ ] Enable HTTPS
- [ ] Test all endpoints
- [ ] Set up monitoring & logging
- [ ] Create database backups

---

## 📞 Support

For API issues, check:
1. Authentication token validity
2. Request payload format
3. Database connection
4. Server logs
5. API rate limiting
