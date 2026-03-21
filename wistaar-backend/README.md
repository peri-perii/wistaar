# Wistaar Reading Studio - Backend API

A complete Node.js + Express backend for the Wistaar Reading Studio platform with MySQL database.

## 🚀 Features Implemented

### ✅ Authentication & Authorization
- **Email & Password Recovery**: Sign up, sign in, email verification
- **Google OAuth Integration**: Seamless Google login/signup
- **Password Reset**: Secure forgot password flow with email tokens
- **JSON Web Tokens (JWT)**: Access & refresh token system
- **Role-based Access Control**: User, Author, Admin roles

### ✅ Book Management
- **Book Submission**: Authors can submit books for review (draft/submitted/approved/published)
- **Full-Text Search**: Search across book titles and descriptions
- **Advanced Filtering**: By genre, price, language, ratings
- **Chapter Management**: Support for multi-chapter books
- **Book Ratings**: Automatic rating calculation from reviews (weighted average)

### ✅ Reading Analytics
- **Progress Tracking**: Track reading progress per user/book
- **Reading History**: View all books user has read
- **Time Tracking**: Total time spent on each book
- **Chapter Analytics**: Most/least read chapters
- **Daily Analytics**: Aggregated reading statistics by date

### ✅ Reviews & Ratings
- **Book Reviews**: Users can leave text reviews with ratings (1-5)
- **Rating Recalculation**: Automatic update of average book rating
- **Review Management**: Edit and delete own reviews
- **Helpful Votes**: Mark reviews as helpful

### ✅ Author Earnings Dashboard
- **Earnings Tracking**: View all earnings from book sales
- **Monthly Summary**: Earnings stats by month
- **Payout Requests**: Request withdrawals to bank account
- **Top Performing Books**: See which books generate most revenue
- **Pending Balance**: Track available balance for withdrawal

### ✅ Payout System
- **Admin Approval Workflow**: Admins can approve/reject payouts
- **Bank Account Integration**: Save bank details securely (JSON format)
- **Transaction Tracking**: Full audit trail of all payouts
- **Balance Management**: Automatic balance calculation

### ✅ Author Profiles
- **Public Author Profiles**: View author info and published books
- **Author Statistics**: Total books, average rating, total readers
- **Profile Management**: Authors can update bio, avatar, social links
- **Book Listings**: Display all published books for an author

### ✅ User Management
- **Wishlist**: Save books to read later
- **User Profiles**: Public and private profile management
- **Reading History**: Track reading activity
- **Notifications**: Ready for implementation

## 📋 Prerequisites

- Node.js v18+ and npm/yarn
- MySQL 8.0+
- Git

## 🔧 Installation

### 1. Clone and Setup

```bash
cd wistaar-backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=wistaar_user
DB_PASSWORD=yourpassword
DB_NAME=wistaar_db

# JWT
JWT_SECRET=your_super_secret_key_min_32_chars_recommended
JWT_REFRESH_SECRET=your_refresh_token_secret

# Frontend
FRONTEND_URL=http://localhost:5173

# Email (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxx
EMAIL_FROM=noreply@wistaar.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Payment Gateway
PAYU_MERCHANT_ID=your_payu_merchant_id
PAYU_MERCHANT_KEY=your_key
```

### 3. Setup MySQL Database

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE wistaar_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Create user
mysql -u root -p -e "CREATE USER 'wistaar_user'@'localhost' IDENTIFIED BY 'yourpassword';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON wistaar_db.* TO 'wistaar_user'@'localhost';"
mysql -u root -p -e "FLUSH PRIVILEGES;"

# Run schema
mysql -u wistaar_user -p wistaar_db < database.sql
```

### 4. Start Development Server

```bash
npm run dev
```

Server runs at `http://localhost:5000`

## 📚 API Documentation

### Authentication Endpoints

#### Sign Up
```
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

#### Sign In
```
POST /api/auth/signin
{
  "email": "user@example.com",
  "password": "password123"
}
Response: { accessToken, refreshToken, user }
```

#### Google Sign In
```
POST /api/auth/google-signin
{
  "googleToken": "google_access_token"
}
```

#### Verify Email
```
POST /api/auth/verify-email
{
  "token": "verification_token_from_email"
}
```

#### Forgot Password
```
POST /api/auth/forgot-password
{
  "email": "user@example.com"
}
```

#### Reset Password
```
POST /api/auth/reset-password
{
  "token": "reset_token_from_email",
  "newPassword": "newpassword123"
}
```

### Books Endpoints

#### Get All Books (with search/filter)
```
GET /api/books?page=1&limit=20&genre=fiction&price=free&sort=newest&search=query
```

#### Get Book Details
```
GET /api/books/:bookId
```

#### Get Book Chapters
```
GET /api/books/:bookId/chapters
```

#### Get Chapter Content
```
GET /api/books/:bookId/chapters/:chapterNumber
```

#### Submit Book (Authors)
```
POST /api/books
Authorization: Bearer token
{
  "title": "Book Title",
  "description": "Short description",
  "fullDescription": "Full description",
  "genre": "fiction",
  "price": "free",
  "language": "English"
}
```

### Reviews & Ratings

#### Get Book Reviews
```
GET /api/reviews/book/:bookId?page=1&sort=recent
```

#### Add Review
```
POST /api/reviews/book/:bookId
Authorization: Bearer token
{
  "rating": 4,
  "review": "Great book!"
}
```

#### Update Review
```
PUT /api/reviews/:reviewId
Authorization: Bearer token
{
  "rating": 5,
  "review": "Updated review"
}
```

#### Delete Review
```
DELETE /api/reviews/:reviewId
Authorization: Bearer token
```

### Analytics Endpoints

#### Update Reading Progress
```
POST /api/analytics/reading-progress
Authorization: Bearer token
{
  "bookId": "book-id",
  "currentChapter": 3,
  "scrollPosition": 50,
  "timeSpentMinutes": 15
}
```

#### Get Reading History
```
GET /api/analytics/reading-history
Authorization: Bearer token
```

#### Get Book Analytics
```
GET /api/analytics/book/:bookId
Authorization: Bearer token
(Author only - their own books)
```

#### Get Author Summary Analytics
```
GET /api/analytics/author/summary
Authorization: Bearer token
(Author only)
```

### Author Earnings

#### Get Earnings
```
GET /api/payouts/earnings?month=1&year=2024
Authorization: Bearer token
```

#### Get Earnings Summary
```
GET /api/payouts/earnings-summary
Authorization: Bearer token
```

#### Request Payout
```
POST /api/payouts/request-payout
Authorization: Bearer token
{
  "amount": 5000,
  "bankAccount": {
    "accountNumber": "1234567890",
    "ifscCode": "HDFC0001234",
    "accountHolder": "Name"
  }
}
```

#### Get Payout Requests
```
GET /api/payouts/payout-requests
Authorization: Bearer token
```

### Search Endpoints

#### Full-Text Search
```
GET /api/search?q=search_term&type=all&page=1&limit=20
Types: all, books, authors, chapters
```

#### Search by Genre
```
GET /api/search/genre/:genre?sort=newest&page=1
```

#### Advanced Filter
```
GET /api/search/advanced?genre=fiction&minRating=3&maxRating=5&price=free&language=English&sortBy=popularity
```

### Author Endpoints

#### Get Public Author Profile
```
GET /api/authors/profile/:userId
```

#### Get My Books
```
GET /api/authors/my-books?status=published&page=1
Authorization: Bearer token
```

#### Update Book
```
PUT /api/authors/:bookId
Authorization: Bearer token
```

### User Endpoints

#### Get User Wishlist
```
GET /api/users/wishlist
Authorization: Bearer token
```

#### Add to Wishlist
```
POST /api/users/wishlist/:bookId
Authorization: Bearer token
```

#### Remove from Wishlist
```
DELETE /api/users/wishlist/:bookId
Authorization: Bearer token
```

## 🏗️ Database Schema Highlights

### Core Tables
- **users**: User accounts with email verification
- **author_profiles**: Author-specific information
- **book_submissions**: Books with status tracking (draft/submitted/approved/published)
- **book_chapters**: Multi-chapter support
- **book_reviews**: Reviews with automatic rating calculation

### Analytics Tables
- **reading_progress**: User progress per book
- **reading_analytics**: Daily aggregated analytics
- **bookmarks**: Highlights and bookmarks

### Business Tables
- **author_earnings**: All earnings transactions
- **payout_requests**: Withdrawal requests with approval workflow
- **book_purchases**: Purchase history and payment status

### Security Tables
- **email_verification_tokens**: Email verification
- **password_reset_tokens**: Password reset tokens

## 🔐 Security Features

- ✅ Password hashing with bcryptjs (10 salt rounds)
- ✅ JWT-based authentication
- ✅ CORS configured for frontend
- ✅ Helmet.js for security headers
- ✅ Rate limiting (100 requests/15 min)
- ✅ Input validation with Joi
- ✅ SQL injection prevention with parameterized queries
- ✅ Email verification required before access
- ✅ Secure password reset with expiring tokens

## 📝 Admin Capabilities

Admins can:
- View pending payout requests
- Approve payouts (with optional transaction ID)
- Reject payouts with reason
- Manage users and authors
- Approve/reject book submissions
- Generate system reports

## 📦 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker (optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

### Deployment Platforms
- ✅ Railway.app (recommended for ease)
- ✅ Render.com
- ✅ Heroku
- ✅ AWS EC2
- ✅ DigitalOcean
- ✅ VPS with PM2/systemd

## 🔗 Integration with Frontend

Update frontend `.env`:

```env
VITE_API_URL=http://localhost:5000/api  # dev
# VITE_API_URL=https://api.wistaar.com/api  # prod
```

Update frontend auth hook to use new API endpoints instead of Supabase.

## 📊 Monitoring & Logs

Monitor in production:
- Verify email delivery (SendGrid dashboard)
- Database query logs
- API error logs
- Payout transaction tracking

## 🚀 Next Steps

1. **Setup Email Service**: Configure SendGrid/SMTP
2. **Setup Google OAuth**: Add credentials from Google Cloud Console
3. **Setup Payment Gateway**: Integrate PayU or Stripe
4. **Setup AWS S3**: For book cover uploads
5. **Deploy Database**: Use AWS RDS or self-hosted MySQL
6. **Setup Monitoring**: Add logging and error tracking
7. **Launch**: Go live!

## 📞 Support

For issues or questions, refer to the codebase documentation or reach out to the development team.

---

**Built with ❤️ for Wistaar Reading Studio**
