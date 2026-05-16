# Wistaar Secure Backend

Production-ready, end-to-end encrypted backend for the Wistaar book publishing platform.

## 🔐 Security Features

### 1. **Authentication & Authorization**
- **Passwords**: BCrypt hashing with 12 salt rounds
- **JWT Tokens**: 
  - Access tokens: 15 minutes validity
  - Refresh tokens: 7 days validity (stored in httpOnly secure cookies)
- **Account Lockout**: 5 failed login attempts → 30-minute lockout
- **Role-Based Access Control (RBAC)**: User, Author, Admin, Super-Admin roles
- **Rate Limiting**: 
  - General: 100 req/15min
  - Auth: 5 req/15min
  - File upload: 10 uploads/hour
  - Payments: 5 attempts/hour

### 2. **Data Encryption at Rest**
- **Algorithm**: AES-256-GCM
- **Encrypted Fields**: Email, payment info, sensitive user data
- **Key Management**: Stored in `.env`, never in code
- **Encryption Utility**: `src/utils/crypto.ts`

### 3. **Data in Transit**
- **HTTPS Only**: Automatic redirect from HTTP
- **HSTS Headers**: 1-year max-age with preload
- **TLS 1.3**: Configured on deployment
- **Certificate Pinning**: Supported for production

### 4. **Input Validation & Sanitization**
- **Zod Schemas**: Every endpoint has typed validation
- **XSS Prevention**: DOMPurify sanitization
- **SQL Injection**: Prisma parameterized queries
- **CSRF Protection**: Token validation middleware

### 5. **Security Headers** (Helmet)
- Content-Security-Policy
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### 6. **Database Security**
- **SSL/TLS Connection**: Encrypted MySQL connections
- **Principle of Least Privilege**: Separate read/write DB users
- **Automated Backups**: Encrypted backups configured
- **Audit Logs**: All admin actions tracked

### 7. **File Upload Security**
- **Size Limits**: 
  - Manuscripts: 200MB
  - Cover images: 5MB
- **File Type Whitelist**: PDF for manuscripts, JPEG/PNG/WebP for covers
- **Virus Scanning**: ClamAV integration (can be enabled)
- **Signed URLs**: Expire in 1 hour for private file access
- **S3 Encryption**: Server-side encryption (SSE-S3)

### 8. **Real-time Security (Socket.io)**
- **JWT Authentication**: Socket connections verified with JWT
- **Encrypted Payloads**: Notifications encrypted with AES-256
- **Namespace Isolation**: Separate namespaces per role

### 9. **Logging & Monitoring**
- **Winston Logger**: Structured JSON logging
- **Log Files**:
  - `logs/error.log`: Error events only
  - `logs/auth.log`: Authentication events
  - `logs/combined.log`: All events
  - `logs/exceptions.log`: Unhandled exceptions
- **Log Levels**: error, warn, info, debug
- **Sensitive Data**: Never logs passwords, tokens, encryption keys

### 10. **Environment & Secrets**
- **Environment Variables**: All secrets in `.env`
- **Never Committed**: `.env` excluded from git
- **Separate Environments**: `.env.development`, `.env.production`
- **Validation**: All required env vars checked on startup

---

## 📁 Project Structure

```
src/
├── app.ts                          # Express app setup
├── config/
│   ├── database.ts                # Prisma database client
│   └── cors.ts                    # CORS configuration
├── middleware/
│   ├── auth.ts                    # JWT authentication, token verification
│   ├── rbac.ts                    # Role-based access control
│   ├── rateLimit.ts               # Rate limiting strategies
│   ├── validation.ts              # Input validation & sanitization
│   └── error.ts                   # Error handling, logger
├── modules/
│   ├── auth/
│   │   ├── service.ts             # Auth business logic
│   │   ├── controller.ts          # Signup, login, refresh
│   │   └── routes.ts              # Auth endpoints
│   ├── books/
│   │   ├── service.ts             # Book CRUD, submissions
│   │   ├── controller.ts          # Book endpoints
│   │   └── routes.ts              # Book routes
│   ├── admin/
│   │   ├── service.ts             # Admin operations
│   │   ├── controller.ts          # Admin endpoints
│   │   └── routes.ts              # Admin routes
│   ├── payments/
│   │   ├── service.ts             # Payment processing
│   │   ├── controller.ts          # Payment endpoints
│   │   └── routes.ts              # Payment routes
│   ├── notifications/
│   │   ├── service.ts             # Notification management
│   │   │── controller.ts          # Notification endpoints
│   │   └── routes.ts              # Notification routes
│   └── users/
│       ├── service.ts             # User management
│       ├── controller.ts          # User endpoints
│       └── routes.ts              # User routes
├── utils/
│   ├── crypto.ts                  # AES-256-GCM encryption
│   ├── logger.ts                  # Winston logger
│   ├── fileUpload.ts              # File upload, S3, virus scan
│   └── types.ts                   # TypeScript types & interfaces
└── prisma/
    ├── schema.prisma              # Database schema
    └── migrations/                # Database migrations

.env.example                        # Environment variables template
package.json                        # Dependencies
tsconfig.json                       # TypeScript config
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### 1. Installation

```bash
# Clone repository
git clone <repository-url>
cd wistaar-backend-secure

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration
```

### 2. Generate Encryption Key

```bash
node -e "
const crypto = require('crypto');
const key = crypto.randomBytes(32).toString('hex');
console.log('ENCRYPTION_KEY=' + key);
"
# Copy output and add to .env
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio
npm run prisma:studio
```

### 4. Start Development Server

```bash
npm run dev
# Server running on http://localhost:5000
```

### 5. Build for Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

---

## 📚 API Documentation

### Authentication Endpoints

**POST** `/api/auth/signup`
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe",
    "role": "user"
  }'
```

**POST** `/api/auth/login`
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**POST** `/api/auth/refresh`
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -H "Cookie: refreshToken=<token>"
```

**POST** `/api/auth/logout`
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer <access-token>"
```

---

## 🔑 Environment Variables

### Required
- `DATABASE_URL`: MySQL connection string with SSL
- `JWT_SECRET`: Secret for signing access tokens (min 32 chars)
- `JWT_REFRESH_SECRET`: Secret for signing refresh tokens (min 32 chars)
- `ENCRYPTION_KEY`: 256-bit hex key for AES-256-GCM (64 chars)
- `AWS_REGION`: AWS region (e.g., us-east-1)
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `S3_BUCKET_NAME`: S3 bucket for file storage

### Optional
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `FRONTEND_URL`: Frontend URL for CORS
- `LOG_LEVEL`: Logging level (debug/info/warn/error)
- `RAZORPAY_KEY_ID`: Razorpay payment key
- `RAZORPAY_KEY_SECRET`: Razorpay secret
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`: Email configuration

---

## 📊 Database Schema

### Core Tables
- **users**: User accounts with authentication data
- **refresh_tokens**: JWT refresh token management
- **books**: Book listings and metadata
- **chapters**: Book chapters
- **purchases**: Purchase records with encryption keys
- **reviews**: User reviews and ratings
- **wishlists**: User wishlists
- **notifications**: In-app notifications
- **audit_logs**: Admin action audit trail
- **coupons**: Promotional codes
- **author_earnings**: Author earnings tracking

### Encryption
Sensitive fields (email, payment info) are encrypted in application code before storage.

---

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:integration
```

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

---

## 📈 Monitoring & Logging

### Structured Logging

All logs are in JSON format for easy parsing:

```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "info",
  "message": "User login successful",
  "userId": "user-uuid",
  "email": "user@example.com",
  "duration": "142ms"
}
```

### Security Events

Critical security events are logged to `logs/auth.log`:
- Login attempts (success/failure)
- Failed login attempts
- Account lockouts
- Token operations
- Permission denied attempts

### Example Log Analysis

```bash
# View recent security events
tail -50 logs/auth.log

# Count failed login attempts
grep "login.*failure" logs/auth.log | wc -l

# Find rate limit violations
grep "rate_limit_exceeded" logs/combined.log
```

---

## 🚨 Error Handling

### Standard Error Response

```json
{
  "success": false,
  "message": "Validation error",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": "Request validation failed",
    "validationErrors": {
      "body": [
        {
          "path": ["email"],
          "message": "Invalid email format"
        }
      ]
    }
  },
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

### HTTP Status Codes

- `200` OK - Successful request
- `201` Created - Resource created
- `400` Bad Request - Validation error
- `401` Unauthorized - Authentication failed
- `403` Forbidden - Insufficient permissions
- `404` Not Found - Resource not found
- `409` Conflict - Duplicate resource
- `413` Payload Too Large - File size exceeded
- `429` Too Many Requests - Rate limit exceeded
- `500` Internal Server Error - Server error

---

## 🔒 Security Best Practices

### For Developers

1. **Never** log passwords, tokens, or encryption keys
2. **Always** validate and sanitize user input
3. **Use** parameterized queries (Prisma handles this)
4. **Hash** passwords with bcrypt (12+ rounds)
5. **Encrypt** sensitive data before storage
6. **Rotate** encryption keys regularly
7. **Enable** HTTPS in production
8. **Use** strong JWT secrets (min 32 chars)
9. **Keep** dependencies updated
10. **Test** security features regularly

### For Deployment

1. Enable HTTPS with valid SSL certificate
2. Set strong `ENCRYPTION_KEY` environment variable
3. Use managed database (AWS RDS) with SSL
4. Enable automated backups
5. Configure firewall rules
6. Use secrets vault (AWS Secrets Manager, HashiCorp Vault)
7. Enable audit logging
8. Monitor error logs
9. Set up alerts for security events
10. Regular security audits

---

## 🤝 Contributing

1. Create a feature branch
2. Commit changes with clear messages
3. Ensure all tests pass
4. Submit pull request with description

---

## 📄 License

ISC

---

## 📞 Support

For issues or questions, open a GitHub issue or contact the team.

---

**Last Updated**: January 2025
**Version**: 1.0.0-secure
