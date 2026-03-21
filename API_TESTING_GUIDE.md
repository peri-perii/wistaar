# 🧪 Complete API Testing Guide

Step-by-step guide to test all 60+ API endpoints end-to-end.

---

## ⚙️ Prerequisites

### Start Backend
```bash
cd wistaar-backend
npm install
npm run dev
# Should be running on http://localhost:5000
```

### Start Frontend
```bash
cd wistaar-reading-studio
npm install
npm run dev
# Should be running on http://localhost:5173
```

### Tools You'll Need
- Postman or curl (for API testing)
- Browser DevTools (for checking tokens)
- Database viewer (MySQL Workbench or similar)

---

## 🔐 1. Authentication Flow

### 1.1 Create Test User (Signup)
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test@12345",
    "name": "Test User",
    "userType": "reader"
  }'
```

**Expected Response:**
```json
{
  "message": "User created successfully",
  "data": {
    "userId": "uuid-here",
    "email": "testuser@example.com",
    "token": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

**✅ Check:** 
- User exists in database
- Tokens stored in localStorage
- User can login

---

### 1.2 Verify Email
```bash
# Copy token from email or DB
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "email-verification-token-from-email"
  }'
```

**Expected:** Email verification status updated

---

### 1.3 Login
```bash
curl -X POST http://localhost:5000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test@12345"
  }'
```

**✅ Check:**
- Returns valid access & refresh tokens
- Tokens work for authenticated requests

---

## 👤 2. User Profile

### 2.1 Get Profile
```bash
curl -X GET http://localhost:5000/api/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**✅ Check:** Returns user email, name, type, createdAt

---

## 📚 3. Book Management

### 3.1 Browse Approved Books
```bash
curl -X GET http://localhost:5000/api/books/browse?page=1&limit=10
```

**✅ Check:** Returns book list with details

---

### 3.2 Search Books
```bash
curl -X GET "http://localhost:5000/api/books/search?q=fiction"
```

**✅ Check:** Search filters by title/author/genre

---

### 3.3 Get Book Details
```bash
curl -X GET http://localhost:5000/api/books/{bookId}
```

**✅ Check:** Full book details including chapters, reviews

---

## 🛒 4. Cart Management

### 4.1 Get Cart
```bash
curl -X GET http://localhost:5000/api/cart \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected:** Empty cart initially
```json
{
  "cartItems": [],
  "total": 0,
  "itemCount": 0
}
```

---

### 4.2 Add Book to Cart
```bash
curl -X POST http://localhost:5000/api/cart/add \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookId": "actual-book-id-from-browse"
  }'
```

**✅ Check:**
- Book appears in cart
- itemCount increments
- total updated
- No duplicates

---

### 4.3 Remove from Cart
```bash
curl -X DELETE http://localhost:5000/api/cart/remove/CART-ITEM-ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**✅ Check:** Item removed, total recalculated

---

### 4.4 Clear Cart
```bash
curl -X DELETE http://localhost:5000/api/cart/clear \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**✅ Check:** All items removed, cart empty

---

## 🎟️ 5. Coupon System

### 5.1 List Active Coupons
```bash
curl -X GET "http://localhost:5000/api/coupons/active?page=1&limit=10"
```

---

### 5.2 Validate Coupon for Discount
```bash
curl -X GET "http://localhost:5000/api/coupons/validate/SUMMER50?amount=500"
```

**Expected:**
```json
{
  "valid": true,
  "discount": {
    "type": "percentage",
    "discountValue": 50,
    "discountAmount": 250,
    "finalAmount": 250
  }
}
```

**✅ Check:** Discount calculation correct

---

### 5.3 [Admin Only] Create Coupon
```bash
curl -X POST http://localhost:5000/api/coupons/admin/create \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SUMMER50",
    "discountType": "percentage",
    "discountValue": 50,
    "maxUses": 100,
    "expiresAt": "2025-12-31",
    "minPurchaseAmount": 100
  }'
```

---

## 💳 6. Purchase Flow (Critical)

### 6.1 Initiate Purchase
```bash
curl -X POST http://localhost:5000/api/purchases/initiate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookId": "book-id-from-cart",
    "couponCode": "SUMMER50"
  }'
```

**Expected:**
```json
{
  "message": "Purchase initiated",
  "data": {
    "transactionId": "txn-xxx",
    "amount": 250,
    "couponDiscount": 250,
    "bookDetails": { ... }
  }
}
```

**✅ Check:**
- transactionId generated
- Discount applied
- Purchase record created with "pending" status

---

### 6.2 Verify Purchase (After Payment)
```bash
curl -X POST http://localhost:5000/api/purchases/verify \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "txn-xxx",
    "paymentGatewayResponse": {
      "status": "completed",
      "paymentId": "pay-xxx"
    }
  }'
```

**Expected:** Purchase marked as completed
```json
{
  "message": "Purchase verified successfully",
  "data": {
    "purchaseId": "purchase-xxx",
    "status": "completed",
    "bookAccess": "granted"
  }
}
```

**✅ Check:**
- Purchase status → "completed"
- author_earnings entry created with correct amount
- User gets book access
- Notification sent to user
- Notification sent to author

---

### 6.3 Check if User Purchased Book
```bash
curl -X GET http://localhost:5000/api/purchases/check/BOOK-ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected:**
```json
{
  "purchased": true,
  "purchaseDate": "2025-01-15T10:30:00Z"
}
```

---

### 6.4 Get Purchase History
```bash
curl -X GET "http://localhost:5000/api/purchases?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**✅ Check:** Recent purchase appears in list

---

## 📜 7. Notifications

### 7.1 Get Notifications
```bash
curl -X GET "http://localhost:5000/api/notifications?page=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**✅ Check:** Includes purchase confirmation & coupon notifications

---

### 7.2 Get Unread Count
```bash
curl -X GET http://localhost:5000/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected:**
```json
{
  "unreadCount": 3
}
```

---

### 7.3 Mark Notification as Read
```bash
curl -X PUT http://localhost:5000/api/notifications/NOTIF-ID/read \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**✅ Check:** Notification marked as read, unread count decrements

---

### 7.4 Mark All as Read
```bash
curl -X PUT http://localhost:5000/api/notifications/mark-all-read \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**✅ Check:** All notifications marked as read, unread count → 0

---

## ❤️ 8. Wishlist Management

### 8.1 Add to Wishlist
```bash
curl -X POST http://localhost:5000/api/wishlists/add \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookId": "book-id"
  }'
```

**✅ Check:** Book added to wishlist

---

### 8.2 Get Wishlist
```bash
curl -X GET "http://localhost:5000/api/wishlists?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**✅ Check:** Shows books with wishlist status and purchase info

---

### 8.3 Check if in Wishlist
```bash
curl -X GET http://localhost:5000/api/wishlists/check/BOOK-ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected:**
```json
{
  "inWishlist": true
}
```

---

### 8.4 Remove from Wishlist
```bash
curl -X DELETE http://localhost:5000/api/wishlists/remove/BOOK-ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**✅ Check:** Book removed, wishlist count decrements

---

## 👨‍💼 9. Author Features

### 9.1 [Author Only] Submit Book
```bash
curl -X POST http://localhost:5000/api/books/submit \
  -H "Authorization: Bearer AUTHOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Novel",
    "description": "A test book",
    "genre": "fiction",
    "price": 199,
    "coverImage": "base64-or-url"
  }'
```

**✅ Check:**
- Book created with status="pending"
- Can view in author submissions dashboard

---

### 9.2 [Author] Get My Submissions
```bash
curl -X GET http://localhost:5000/api/authors/submissions \
  -H "Authorization: Bearer AUTHOR_TOKEN"
```

**✅ Check:** Shows submitted books with status

---

### 9.3 [Author] View Earnings
Make request from frontend:
```typescript
const { data: earnings } = useAuthorEarnings();
// Should show:
// - Total earnings: sum of all book sales
// - Total sales count
// - Per-book breakdown
// - Recent sales real-time feed
```

**✅ Check:**
- Displays earnings after purchase verification
- Real-time updates when new purchase made
- Breakdown matches database

---

## 🛡️ 10. Admin Features

### 10.1 Get Admin Dashboard
```bash
curl -X GET http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected:**
```json
{
  "dashboard": {
    "totalUsers": 5,
    "totalRevenue": 1500,
    "pendingBooks": 2,
    "totalBooks": 8,
    "recentTransactions": [...]
  }
}
```

**✅ Check:** All stats calculated correctly

---

### 10.2 Get Pending Book Submissions
```bash
curl -X GET "http://localhost:5000/api/admin/submissions?status=pending&page=1" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**✅ Check:** Shows only pending submissions

---

### 10.3 Approve Book Submission
```bash
curl -X POST http://localhost:5000/api/admin/submissions/BOOK-ID/approve \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feedback": "Nice story!"
  }'
```

**✅ Check:**
- Book status → "approved"
- Book appears in browse/search
- Author receives notification
- Appears in author dashboard

---

### 10.4 Reject Book Submission
```bash
curl -X POST http://localhost:5000/api/admin/submissions/BOOK-ID/reject \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Inappropriate content",
    "feedback": "Please revise and resubmit"
  }'
```

**✅ Check:**
- Book status → "rejected"
- Author receives notification with reason
- Book doesn't appear in public listings

---

### 10.5 Get All Admins
```bash
curl -X GET http://localhost:5000/api/admin/admins \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN"
```

**✅ Check:** Shows admin list with permissions

---

### 10.6 Add Admin User
```bash
curl -X POST http://localhost:5000/api/admin/admins/add \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id",
    "permissions": ["can_approve_reject", "can_manage_coupons"]
  }'
```

**✅ Check:** User gets admin permissions

---

## 📊 11. Analytics & Reviews

### 11.1 Get Book Reviews
```bash
curl -X GET "http://localhost:5000/api/reviews?bookId=BOOK-ID&page=1"
```

---

### 11.2 Post Review
```bash
curl -X POST http://localhost:5000/api/reviews \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookId": "book-id",
    "rating": 5,
    "title": "Amazing!",
    "reviewText": "Loved this book..."
  }'
```

---

## 🔄 12. Complete User Flow Test

### Step 1: Signup & Login (5 min)
```
1. Create new test user ✅
2. Verify email ✅
3. Login ✅
4. Check profile ✅
```

### Step 2: Browse & Wishlist (5 min)
```
1. Browse books ✅
2. Add book to wishlist ✅
3. View wishlist ✅
```

### Step 3: Shopping (10 min)
```
1. Add book to cart ✅
2. Get cart total ✅
3. Validate coupon ✅
4. Initiate purchase with coupon ✅
5. Mock payment verification ✅
6. Check purchase history ✅
```

### Step 4: Author Flow (10 min)
```
1. Create author user ✅
2. Submit book ✅
3. Check submissions as author ✅
4. Check earnings (should be 0 initially)
5. Go back to reader account
6. Purchase author's book ✅
7. Switch to author account
8. Verify earnings updated ✅
9. Check recent sales ✅
```

### Step 5: Admin Flow (10 min)
```
1. Create admin account ✅
2. Get admin dashboard ✅
3. View pending submissions ✅
4. Approve submitted book ✅
5. Check notifications received by author ✅
6. View updated dashboard stats ✅
```

### Step 6: Notifications (5 min)
```
1. Get all notifications ✅
2. Check unread count ✅
3. Mark one as read ✅
4. Mark all as read ✅
5. Verify counts updated ✅
```

**Total Time:** ~45 minutes for complete end-to-end test

---

## ❌ Error Cases to Test

### 1. Unauthorized Access
```bash
# Without token - should fail
curl -X GET http://localhost:5000/api/cart
# Expected: 401 Unauthorized
```

### 2. Invalid Token
```bash
curl -X GET http://localhost:5000/api/cart \
  -H "Authorization: Bearer invalid-token"
# Expected: 401 Invalid token
```

### 3. Duplicate Coupon
```bash
# Try to create coupon with existing code
# Expected: 409 Conflict - Code already exists
```

### 4. Out of Stock
```bash
# Try to purchase same book twice
# Expected: Should work (multiple purchases allowed)
```

### 5. Permission Denied
```bash
# Non-admin trying to approve book
# Expected: 403 Forbidden
```

---

## 📈 Performance & Load Testing

Once all endpoints pass, test with:

```bash
# Simple load test with 10 concurrent requests
for i in {1..10}; do
  curl -s http://localhost:5000/api/books/browse &
done
```

Expected: All requests complete in < 2 seconds

---

## ✅ Final Checklist

- [ ] All 60+ endpoints tested
- [ ] All CRUD operations working
- [ ] Pagination working
- [ ] Filtering working
- [ ] Authentication verified
- [ ] Authorization verified
- [ ] Error handling correct
- [ ] Database updates verified
- [ ] Real-time features working
- [ ] Notifications sending correctly
- [ ] Earnings calculated correctly
- [ ] Coupon discounts applied
- [ ] Complete user flow passing

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized
**Solution:** Ensure token is valid and not expired. Get new token with login.

### Issue: Coupon not applying
**Solution:** Check coupon expiry date, min purchase amount, and uses count.

### Issue: Earnings not updating
**Solution:** Ensure purchase verification was called, check database earnings table.

### Issue: Notifications not appearing
**Solution:** Check if notification creation was triggered during purchase/approval, check notification table.

### Issue: Cart not persisting
**Solution:** Ensure cart is tied to userId, not just session.

---

Done! Your API is now fully tested and production-ready! 🚀
