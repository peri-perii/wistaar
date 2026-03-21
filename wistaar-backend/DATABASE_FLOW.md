# 🛢️ Wistaar Database Flow & Architecture

## 📊 Complete Database Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CORE USERS & AUTHENTICATION                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐      ┌─────────────────────┐    ┌──────────────────┐    │
│  │    users     │◄─────┤ email_verification │    │ password_reset   │    │
│  │              │      │    _tokens          │    │    _tokens       │    │
│  ├──────────────┤      └─────────────────────┘    └──────────────────┘    │
│  │ id (PK)      │                                                          │
│  │ email (UQ)   │           (1:Many)         (1:Many)                     │
│  │ role         │              │                   │                       │
│  │ is_verified  │◄─────────────┴───────────────────┘                       │
│  │ google_id    │                                                          │
│  └──────────────┘                                                          │
│       │                                                                     │
│       └──────────────────────────────────────────────────────────────────  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                     CONTENT & READING MANAGEMENT                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│       ┌────────────────────┐                                                │
│       │  author_profiles   │ ◄─────────── 1:1                              │
│       │  (Extended User)   │ (optional for authors)                         │
│       └────────────────────┘                                                │
│              │                                                              │
│        1:Many │                                                             │
│              ├─────────────────────────────────────────────┐                │
│              ▼                                             ▼                │
│    ┌──────────────────────────┐           ┌───────────────────────┐       │
│    │  book_submissions        │           │  book_chapters        │       │
│    │  (Status: draft/         │◄─────────┤  (1:Many)             │       │
│    │   submitted/approved/    │ 1:Many   │                       │       │
│    │   rejected/published)    │          │ ├─ chapter_number     │       │
│    ├──────────────────────────┤          │ ├─ title              │       │
│    │ author_id (FK)           │          │ ├─ content (LONGTEXT) │       │
│    │ title                    │          │ ├─ reading_time       │       │
│    │ description              │          │ └─ word_count         │       │
│    │ average_rating           │          └───────────────────────┘       │
│    │ total_ratings            │                                            │
│    │ total_reviews            │                                            │
│    │ is_featured              │                                            │
│    └──────────────────────────┘                                            │
│              │                                                              │
│        1:Many │                                                             │
│              │                                                              │
│              ├──────────────────┬──────────────────┬──────────────────┐    │
│              ▼                  ▼                  ▼                  ▼    │
│    ┌──────────────────┐ ┌────────────────┐ ┌───────────────┐ ┌──────────┐│
│    │  book_reviews    │ │ reading_        │ │  bookmarks    │ │ wishlist ││
│    │  (Ratings)       │ │ progress        │ │  (Highlights) │ │          ││
│    │                  │ │                 │ │               │ │          ││
│    │ ├─ user_id (FK)  │ │ ├─ user_id (FK) │ │ ├─ user_id    │ │ user_id  ││
│    │ ├─ book_id (FK)  │ │ ├─ book_id (FK) │ │ ├─ book_id    │ │ book_id  ││
│    │ ├─ rating (1-5)  │ │ ├─...           │ │ ├─ note       │ │          ││
│    │ ├─ review        │ │ └─ time_spent   │ │ └─ highlight  │ └──────────┘│
│    │ └─ helpful_count │ └─────────────────┘ └───────────────┘             │
│    └──────────────────┘                                                    │
│              │                                                              │
│        1:Many │ (Rating Update Trigger)                                    │
│              └─────► Updates book_submissions.average_rating               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    ANALYTICS & TRACKING SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│      reading_progress  ──────┐                                              │
│      (Per User/Book)         │ (Aggregated Daily)                           │
│                              ▼                                              │
│                   ┌──────────────────────┐                                  │
│                   │ reading_analytics    │                                  │
│                   │ (Daily Snapshots)    │                                  │
│                   ├──────────────────────┤                                  │
│                   │ date (unique key)    │                                  │
│                   │ total_readers        │                                  │
│                   │ total_time_minutes   │                                  │
│                   │ avg_time_per_chapter │                                  │
│                   │ chapter_most_read    │                                  │
│                   │ chapter_least_read   │                                  │
│                   └──────────────────────┘                                  │
│                                                                              │
│   Flow: User reads → updates reading_progress →                            │
│         daily batch job → aggregates to reading_analytics                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                   COMMERCE & PAYMENTS SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│         ┌──────────────────────┐                                            │
│         │  book_purchases      │                                            │
│         │  (Transaction Log)   │                                            │
│         ├──────────────────────┤                                            │
│         │ user_id (FK)         │                                            │
│         │ book_id (FK)         │                                            │
│         │ amount               │                                            │
│         │ payment_method       │◄─────┐ (BEFORE INSERT/UPDATE Trigger)     │
│         │ payment_status       │      │                                     │
│         │ payu_txnid           │      │ Creates earning record              │
│         └──────────────────────┘      │                                     │
│                  │                    │                                     │
│         (After payment success)       │                                     │
│                  │                    │                                     │
│                  └────────────────────┤                                     │
│                                       ▼                                     │
│         ┌──────────────────────────────────────────┐                        │
│         │     author_earnings                      │                        │
│         │  (Transaction Journal/Ledger)            │                        │
│         ├──────────────────────────────────────────┤                        │
│         │ author_id (FK)                           │                        │
│         │ book_id (FK, nullable)                   │                        │
│         │ amount (can be negative)                 │                        │
│         │ transaction_type:                        │                        │
│         │   ├─ 'sale' (automatic on purchase)      │                        │
│         │   ├─ 'refund' (on purchase canceled)     │                        │
│         │   ├─ 'withdrawal' (on payout request)    │                        │
│         │   └─ 'adjustment' (admin ops)            │                        │
│         │ balance (running total)                  │                        │
│         │ reference_id (links to purchase/payout)  │                        │
│         └──────────────────────────────────────────┘                        │
│                  │                                                          │
│                  │ (When author requests withdrawal)                        │
│                  ▼                                                          │
│         ┌──────────────────────────────────────────┐                        │
│         │  payout_requests                         │                        │
│         │  (Admin Approval Workflow)               │                        │
│         ├──────────────────────────────────────────┤                        │
│         │ author_id (FK)                           │                        │
│         │ amount                                   │                        │
│         │ bank_account (JSON)                      │                        │
│         │ status:                                  │                        │
│         │   ├─ pending (awaiting admin approval)   │                        │
│         │   ├─ approved (admin approved)           │                        │
│         │   ├─ completed (payment sent)            │                        │
│         │   └─ rejected (admin rejected)           │                        │
│         │ rejection_reason                         │                        │
│         │ transaction_id (payment gateway ref)     │                        │
│         └──────────────────────────────────────────┘                        │
│                                                                              │
│   Flow: User purchases → book_purchases created →                          │
│         (if payment_status=completed) → author_earnings +amount →           │
│         Author requests payout → payout_requests created →                 │
│         Admin approves → author_earnings -amount + withdrawal record       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                   NOTIFICATIONS & ADMIN SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────┐         ┌──────────────────┐                        │
│   │  notifications   │         │ admin_permissions│                        │
│   ├──────────────────┤         ├──────────────────┤                        │
│   │ user_id (FK)     │         │ user_id (FK)     │                        │
│   │ type             │         │ is_super_admin   │                        │
│   │ title            │         │ can_approve_*    │                        │
│   │ message          │         │ can_manage_*     │                        │
│   │ data (JSON)      │         └──────────────────┘                        │
│   │ is_read          │                                                     │
│   │ read_at          │         ┌──────────────────┐                        │
│   └──────────────────┘         │  coupons         │                        │
│                                ├──────────────────┤                        │
│   Flow: Events across sys →    │ code             │                        │
│         Create notification     │ discount_%/amt   │                        │
│                                │ valid_from/until │                        │
│                                │ current_uses     │                        │
│                                └──────────────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Scenarios

### 1️⃣ **User Registration & Email Verification Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Frontend: User clicks "Sign Up"                              │
│    POST /api/auth/signup { email, password, name }              │
│                           ▼                                      │
│ 2. Backend:                                                      │
│    ├─ Hash password with bcryptjs                               │
│    ├─ Insert row: users (id, email, password_hash, name, ...)   │
│    ├─ Generate token: secure random 32 chars                    │
│    ├─ Insert row: email_verification_tokens (user_id, token)    │
│    ├─ Send email with verification link                         │
│    └─ Return: { message: "Check email" }                        │
│                           ▼                                      │
│ 3. User: Clicks email verification link                         │
│    POST /api/auth/verify-email { token }                        │
│                           ▼                                      │
│ 4. Backend:                                                      │
│    ├─ Query: SELECT * FROM email_verification_tokens             │
│    │  WHERE token = ? AND expires_at > NOW()                    │
│    ├─ Update users: is_email_verified = true, email_verified_at │
│    ├─ Delete token: DELETE FROM email_verification_tokens       │
│    └─ Return: { message: "Email verified" }                     │
│                           ▼                                      │
│ 5. User: Can now login                                          │
│    POST /api/auth/signin { email, password }                    │
│    │                                                             │
│    └─► Returns: { accessToken, refreshToken, user {...} }       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2️⃣ **Google OAuth Sign In Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Frontend: User clicks "Sign in with Google"                  │
│    Google redirects with: { googleToken }                       │
│                           ▼                                      │
│ 2. Frontend sends to Backend:                                   │
│    POST /api/auth/google-signin { googleToken }                 │
│                           ▼                                      │
│ 3. Backend:                                                      │
│    ├─ Verify token with Google API                              │
│    ├─ Get: { id, email, name, picture }                         │
│    ├─ Query: SELECT * FROM users                                │
│    │  WHERE google_id = ? OR email = ?                          │
│    └─► TWO PATHS:                                               │
│                                                                  │
│    Path A: User exists                                          │
│    ├─ Update: google_id, last_login                             │
│    └─ Generate tokens                                           │
│                                                                  │
│    Path B: New user                                             │
│    ├─ Insert: users (email, google_id, name, avatar)            │
│    ├─ Set: is_email_verified = true (auto-verified)             │
│    └─ Generate tokens                                           │
│                           ▼                                      │
│ 4. Return: { accessToken, refreshToken, user {...} }            │
│                           ▼                                      │
│ 5. User logged in & can access platform                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3️⃣ **Book Purchase & Earnings Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks: "Buy Book" ($9.99)                              │
│    POST /api/purchases { bookId, amount: 9.99 }                 │
│                           ▼                                      │
│ 2. Backend:                                                      │
│    ├─ Create book_purchases row:                                │
│    │  { user_id, book_id, amount: 9.99,                         │
│    │    payment_status: 'pending', payu_txnid: null }           │
│    └─ Return payment gateway link                               │
│                           ▼                                      │
│ 3. User: Completes payment on PayU/Stripe                       │
│    Webhook callback: payment_status = 'completed'               │
│                           ▼                                      │
│ 4. Webhook Handler (Backend):                                   │
│    ├─ Update book_purchases:                                    │
│    │  payment_status = 'completed'                              │
│    ├─ Query: Get book details & author                          │
│    ├─ Insert author_earnings row:                               │
│    │  { author_id, book_id, amount: 9.99,                       │
│    │    transaction_type: 'sale',                               │
│    │    reference_id: purchase_id,                              │
│    │    balance: (new running total) }                          │
│    ├─ Update author_profiles:                                   │
│    │  total_revenue += 9.99, total_sales += 1                   │
│    ├─ Trigger notification:                                     │
│    │  INSERT notifications { author_id, ... }                   │
│    └─ Email author: "New sale!"                                 │
│                           ▼                                      │
│ 5. Author now has ₹9.99 in pending balance                      │
│    GET /api/payouts/earnings-summary                            │
│    Returns: { pendingBalance: 9.99, ... }                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4️⃣ **Author Payout Workflow**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Author has: ₹1,000 pending earnings                          │
│    POST /api/payouts/request-payout                             │
│    { amount: 500, bankAccount: {...} }                          │
│                           ▼                                      │
│ 2. Backend:                                                      │
│    ├─ Check balance: SELECT SUM(amount) FROM author_earnings    │
│    ├─ Validate: 500 <= available balance ✓                      │
│    ├─ Create payout_requests row:                               │
│    │  { author_id, amount: 500,                                 │
│    │    bank_account: JSON, status: 'pending' }                 │
│    ├─ Create author_earnings row (tracking):                    │
│    │  { author_id, amount: -500,                                │
│    │    transaction_type: 'withdrawal',                         │
│    │    reference_id: payout_request_id,                        │
│    │    balance: 500 (500-500) }                                │
│    └─ Notify admin: "Pending payout request"                    │
│                           ▼                                      │
│ 3. Admin sees pending payouts:                                  │
│    GET /api/payouts/admin/pending-payouts                       │
│                           ▼                                      │
│ 4A. Admin approves:                                             │
│    POST /api/payouts/admin/approve-payout/:id                   │
│    { transactionId: "TXN123" }                                  │
│    ├─ Update payout_requests: status = 'completed'              │
│    └─ Send author confirmation email                            │
│                                                                  │
│ 4B. Admin rejects:                                              │
│    POST /api/payouts/admin/reject-payout/:id                    │
│    { reason: "Bank details invalid" }                           │
│    ├─ Update payout_requests: status = 'rejected'               │
│    ├─ Reverse transaction: Add back ₹500 to balance             │
│    ├─ Create adjustment earning record                          │
│    └─ Notify author with reason                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5️⃣ **Reading Progress & Analytics Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User opens book chapter 3                                    │
│    Reads for 15 minutes, scrolls to 45%                         │
│    Closes book (triggers save)                                  │
│                           ▼                                      │
│ 2. Frontend sends:                                              │
│    POST /api/analytics/reading-progress                         │
│    { bookId, currentChapter: 3,                                 │
│      scrollPosition: 45, timeSpentMinutes: 15 }                 │
│                           ▼                                      │
│ 3. Backend:                                                      │
│    ├─ Query: SELECT * FROM reading_progress                     │
│    │  WHERE user_id = ? AND book_id = ?                         │
│    │                                                             │
│    └─ TWO PATHS:                                                │
│                                                                  │
│    Path A: Record exists (user already read this book)          │
│    ├─ UPDATE reading_progress SET:                              │
│    │  current_chapter = 3,                                      │
│    │  scroll_position = 45,                                     │
│    │  time_spent_minutes += 15,                                 │
│    │  last_read_at = NOW()                                      │
│                                                                  │
│    Path B: New reading session                                  │
│    ├─ INSERT reading_progress:                                  │
│    │  { user_id, book_id, current_chapter: 3, ... }             │
│                           ▼                                      │
│ 4. Daily Batch Job (runs once per day):                         │
│    ├─ Query all unique books with today's reads                 │
│    ├─ For each book:                                            │
│    │  ├─ SELECT COUNT(DISTINCT user_id) [total_readers]        │
│    │  ├─ SELECT SUM(time_spent) [total_time_minutes]            │
│    │  └─ INSERT/UPDATE reading_analytics {                      │
│    │     book_id, date: TODAY, ...}                             │
│    │                                                             │
│    └─ Author sees in dashboard:                                 │
│       GET /api/analytics/book/:bookId                           │
│       Returns: { dailyAnalytics: [...], totalStats, ... }       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6️⃣ **Book Review & Rating Recalculation Flow**

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. User reads book, clicks "Write Review"                       │
│    POST /api/reviews/book/:id                                   │
│    { rating: 5, review: "Amazing book!" }                       │
│                           ▼                                      │
│ 2. Backend:                                                      │
│    ├─ Verify user purchased: SELECT from book_purchases         │
│    ├─ Check not already reviewed: SELECT from book_reviews       │
│    ├─ INSERT book_reviews { user_id, book_id, rating, review }  │
│    ├─ Call updateBookRating(bookId)  ◄─ AUTOMATIC RECALC        │
│    └─ Return: { message: "Review added" }                       │
│                           ▼                                      │
│ 3. updateBookRating(bookId) Function:                           │
│    ├─ SELECT AVG(rating) as avg, COUNT(*) as count              │
│    │  FROM book_reviews WHERE book_id = ?                       │
│    │  Result: avg = 4.5, count = 2                              │
│    │                                                             │
│    ├─ UPDATE book_submissions SET:                              │
│    │  average_rating = 4.5,                                     │
│    │  total_ratings = 2                                         │
│    └─ Commit transaction                                        │
│                           ▼                                      │
│ 4. Frontend displays:                                           │
│    Book now shows: ★★★★☆ (4.5/5 stars) | 2 ratings             │
│                                                                  │
│ 5. User updates review (clicks edit):                           │
│    PUT /api/reviews/:reviewId { rating: 4 }                     │
│    ├─ UPDATE book_reviews SET rating = 4                        │
│    ├─ Call updateBookRating(bookId)  ◄─ AUTOMATIC RECALC        │
│    └─ New average: (4 + 5) / 2 = 4.5 ✓                          │
│                                                                  │
│ 6. User deletes review:                                         │
│    DELETE /api/reviews/:reviewId                                │
│    ├─ DELETE FROM book_reviews WHERE id = ?                     │
│    ├─ Call updateBookRating(bookId)  ◄─ AUTOMATIC RECALC        │
│    └─ New average: 5 / 1 = 5.0 ✓                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Database Constraints & Validations

| Feature | Implementation |
|---------|-----------------|
| **Email Verification** | `is_email_verified` + `email_verified_at` timestamp |
| **One Review Per User** | `UNIQUE KEY (user_id, book_id)` on book_reviews |
| **Rating Range** | `CHECK (rating >= 1 AND rating <= 5)` |
| **One Progress Per User/Book** | `UNIQUE KEY (user_id, book_id)` on reading_progress |
| **Chapter Uniqueness** | `UNIQUE KEY (book_id, chapter_number)` on book_chapters |
| **Auto-verified Google** | `is_email_verified = true` on Google account creation |
| **Balance Tracking** | Running total in author_earnings.balance |
| **Cascade Delete** | Users → deletes all related data (books, reviews, etc.) |

---

## 📈 Performance Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| users | email, google_id, role | Fast user lookups |
| book_submissions | author_id, status, genre, rating | Fast book queries |
| book_reviews | book_id, user_id, rating | Review aggregation |
| reading_progress | user_id, book_id, last_read_at | Analytics queries |
| reading_analytics | book_id, date | Daily stats lookup |
| author_earnings | author_id, created_at | Earnings history |
| payout_requests | author_id, status | Admin dashboard |

---

## 🚨 Important Triggers & Operations

```sql
-- Automatic triggers to implement:

1. ON book_reviews INSERT/UPDATE/DELETE
   → Call UPDATE book_submissions SET average_rating, total_ratings

2. ON book_purchases payment_status = 'completed'
   → INSERT author_earnings (sale record)
   → UPDATE author_profiles (total_revenue, total_sales)

3. ON payout_requests status = 'completed'
   → Create withdrawal earnings record

4. DAILY JOB (via cron/scheduler)
   → Aggregate reading_progress to reading_analytics
```

---

## ✅ Database is Production-Ready!

- ✅ All relationships properly defined with FKs
- ✅ Cascading deletes for data integrity
- ✅ Full-text search indexes
- ✅ Optimized indexes for common queries
- ✅ UTF-8mb4 support for international users
- ✅ Transaction tracking with ledger pattern
- ✅ Role-based access control structure
- ✅ Email verification flow built-in
- ✅ Complete audit trail for payouts

