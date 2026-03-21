# 🔐 Security Documentation

Comprehensive security architecture and implementation details for Wistaar Secure Backend.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Password Security](#password-security)
3. [Encryption](#encryption)
4. [Network Security](#network-security)
5. [Input Validation](#input-validation)
6. [Rate Limiting & DDoS Protection](#rate-limiting--ddos-protection)
7. [File Upload Security](#file-upload-security)
8. [Database Security](#database-security)
9. [Logging & Auditing](#logging--auditing)
10. [Incident Response](#incident-response)

---

## Authentication & Authorization

### JWT Tokens

**Access Tokens**
- **Duration**: 15 minutes
- **Purpose**: API request authentication
- **Storage**: Client-side (memory, not localStorage for XSS safety)
- **Header**: `Authorization: Bearer <token>`

**Refresh Tokens**
- **Duration**: 7 days
- **Purpose**: Obtain new access tokens
- **Storage**: httpOnly secure cookie
- **Properties**:
  - `httpOnly`: Prevents JavaScript access
  - `Secure`: Only sent over HTTPS
  - `SameSite: Strict`: CSRF protection

### Token Validation

```javascript
// Token claims checked on every request
{
  userId: "uuid",
  email: "user@example.com",
  role: "user|author|admin|super_admin",
  iat: 1705328400,        // Issued at
  exp: 1705329300         // Expires in 15 minutes
}
```

### Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **USER** | Read books, write reviews, manage wishlist, purchase books |
| **AUTHOR** | All USER permissions + publish books, track earnings |
| **ADMIN** | All USER permissions + manage books, manage users, view payments |
| **SUPER_ADMIN** | All permissions + manage admins, system configuration |

---

## Password Security

### Hashing

- **Algorithm**: BCrypt
- **Salt Rounds**: 12 (factors in time)
- **Never**: Store plaintext passwords
- **Hash Time**: ~100-200ms (intentional for security)

### Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (@$!%*?&)

### Account Lockout

After 5 failed login attempts:
- Account locked for 30 minutes
- User cannot login during lockout
- Logged as security event
- Admin notified (in high-security setups)

---

## Encryption

### AES-256-GCM

**Algorithm Specifications**
- **Type**: Authenticated encryption
- **Key Size**: 256 bits (32 bytes)
- **IV**: 16 bytes (128 bits) - randomly generated per operation
- **Auth Tag**: 16 bytes (128 bits) - ensures data integrity

**Encrypted Fields**
```
users.email (frontend encryption + backend re-encryption)
purchases.paymentDetails
users.bankDetails
payment_receipts.data
sensitive_documents
```

**Key Generation**

```bash
# Generate production key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Never in Code**
```javascript
// ❌ WRONG
const key = "hardcoded_key_123";

// ✅ CORRECT
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
```

---

## Network Security

### HTTPS/TLS

**Configuration**
- **Protocol**: TLS 1.3 minimum
- **Certificate**: Valid, not self-signed
- **Renewal**: Automated (Let's Encrypt via Certbot)
- **HSTS**: 1 year max-age with preload

**HTTP Redirect**
```javascript
// Auto redirect HTTP → HTTPS
if (req.header('x-forwarded-proto') !== 'https') {
  res.redirect(`https://${req.header('host')}${req.url}`);
}
```

### CORS Configuration

**Allowed Origins**
```javascript
// Only frontend URL (configurable per environment)
cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
});
```

**Prevented Attacks**
- Cross-site request forgery (CSRF)
- Unauthorized API access from other domains

### Security Headers (Helmet)

```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Input Validation

### Zod Schemas

Every endpoint has typed input validation:

```typescript
export const signupSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(2).max(255),
  })
});
```

### Sanitization

**XSS Prevention**
```typescript
// DOMPurify removes HTML/script tags
const safe = DOMPurify.sanitize(userInput, { ALLOWED_TAGS: [] });
```

**SQL Injection Prevention**
```typescript
// Prisma uses parameterized queries (no string interpolation)
const user = await prisma.user.findUnique({
  where: { id: userId }  // ✅ Safe
});

// ❌ Never do this:
// await query(`SELECT * FROM users WHERE id = '${userId}'`);
```

---

## Rate Limiting & DDoS Protection

### Strategies by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/login` | 5 req | 15 min |
| `/auth/signup` | 5 req | 15 min |
| `General API` | 100 req | 15 min |
| `File Upload` | 10 uploads | 1 hour |
| `Payment` | 5 attempts | 1 hour |
| `Email Verify` | 3 req | 24 hours |

### Implementation

```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    logSecurityEvent('rate_limit_exceeded', req.user?.id, req.ip);
    res.status(429).json({ error: 'Too many requests' });
  }
});
```

---

## File Upload Security

### Size Limits

- **Manuscripts**: 200MB max
- **Cover Images**: 5MB max

### Type Validation

**Whitelist Only**
```javascript
ALLOWED_TYPES = {
  manuscript: ['application/pdf'],
  cover: ['image/jpeg', 'image/png', 'image/webp']
};
```

**Magic Bytes verification**
```
PDF:  25 50 44 46 (JPDF header)
JPEG: FF D8 FF (SOI marker)
PNG:  89 50 4E 47 (PNG signature)
```

### Virus Scanning

```typescript
// Integration with ClamAV (optional)
const isClean = await scanForViruses(fileBuffer, filename);
if (!isClean) {
  throw new Error('File contains malicious content');
}
```

### S3 Storage

**Encryption**
```
ServerSideEncryption: 'AES256'
```

**Access Control**
```
Signed URLs expire in 1 hour
Only authenticated users can generate URLs
Public access: BLOCKED
```

---

## Database Security

### Encrypted Connections

```
DATABASE_URL="mysql://user:pass@host/db?sslaccept=strict"
                                           ^^^^^^^^^^^^^^^^
                                    Forces SSL/TLS connection
```

### Least Privilege

**Separate DB Users**
```sql
-- Read-only user (for queries)
CREATE USER 'read_user'@'%' IDENTIFIED BY 'secure_password';
GRANT SELECT ON wistaar_db.* TO 'read_user'@'%';

-- Write user (app connections)
CREATE USER 'app_user'@'%' IDENTIFIED BY 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON wistaar_db.* TO 'app_user'@'%';

-- Admin user (migrations)
CREATE USER 'admin_user'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL ON wistaar_db.* TO 'admin_user'@'%';
```

### Audit Logs Table

```sql
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36),
  action VARCHAR(100),
  target_type VARCHAR(50),
  target_id VARCHAR(36),
  details JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id),
  INDEX (action),
  INDEX (created_at)
);
```

**Logged Actions**
- User creation/deletion
- Book approval/rejection
- Payment processing
- Admin permission changes
- Sensitive data access

---

## Logging & Auditing

### Structured Logging

All logs in JSON format for parsing:

```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "warn",
  "message": "SECURITY_EVENT",
  "eventType": "unauthorized_access_attempt",
  "userId": "user-uuid",
  "ip": "192.168.1.1",
  "path": "/api/admin/users",
  "userRole": "user"
}
```

### Log Files

| File | Purpose | Retention |
|------|---------|-----------|
| `error.log` | Error events | 50MB (5 files) |
| `auth.log` | Login/auth events | 100MB (10 files) |
| `combined.log` | All events | 50MB (5 files) |
| `exceptions.log` | Unhandled exceptions | 50MB (5 files) |

### Never Logged

```javascript
// ❌ These are NEVER logged
- Passwords
- JWT tokens
- Refresh tokens
- Encryption keys
- Credit card numbers
- API secrets
- Bank account details
```

---

## Incident Response

### Security Event Detection

**Red Flags**
- 5+ failed logins from same IP
- Unauthorized access attempts
- Rate limit exceeded
- Suspicious file uploads
- Database errors
- HTTPS downgrade attempts

### Response Procedures

**Level 1: Warning**
- Auto-lock account for 30 minutes
- Log security event
- Monitor for escalation

**Level 2: Alert**
- Send admin notification
- Trigger additional logging
- Prepare for investigation

**Level 3: Critical**
- Revoke all tokens
- Force password reset
- Disable account temporarily
- Notify user
- Full investigation

### Breach Protocol

If data breach suspected:
1. Rotate all encryption keys
2. Invalidate all active tokens
3. Force password reset for all users
4. Audit all database access logs
5. Review audit_logs table
6. Notify affected users
7. Inform relevant authorities

---

## Compliance & Standards

### OWASP Top 10 Mitigations

| Risk | Mitigation |
|------|-----------|
| **A01:Injection** | Parameterized queries (Prisma), input validation |
| **A02:Authentication** | JWT with refresh rotation, account lockout |
| **A03:Sensitive Data** | AES-256-GCM encryption, HTTPS only |
| **A04:XML/XXE** | No XML parsing, strict input validation |
| **A05:Access Control** | RBAC middleware, resource ownership checks |
| **A06:Security Misconfiguration** | Helmet headers, environment validation |
| **A07:Injection (XSS)** | DOMPurify sanitization, Content-Security-Policy |
| **A08:Insecure Deserial** | JSON-only payloads, strict parsing |
| **A09:Logging** | Structured JSON logging, audit trails |
| **A10:Outdated Dependencies** | Regular npm updates, vulnerability scanning |

---

## Testing Security

### Manual Security Testing

```bash
# Test rate limiting
for i in {1..10}; do curl -X POST http://localhost:5000/api/auth/login; done

# Test authentication bypass
curl -X GET http://localhost:5000/api/admin/users
# Should return 401 Unauthorized

# Test SQL injection
curl -X GET "http://localhost:5000/api/books?genre=fiction'; DROP TABLE users;--"
# Should be safely escaped or fail validation

# Test CSRF
curl -X POST http://localhost:5000/api/books \
  -d '{"title": "test"}' \
  -H "Origin: https://malicious.com"
# Should be blocked by CORS

# Test XSS
curl -X POST http://localhost:5000/api/reviews \
  -d '{"content": "<script>alert(123)</script>"}'
# Script tags should be removed
```

### Automated Testing

```bash
# Dependency vulnerability scan
npm audit

# Static analysis
eslint src/

# Type checking
tsc --noEmit

# Unit tests
npm test

# Integration tests
npm run test:integration
```

---

## Security Checklist

- [ ] ENCRYPTION_KEY generated and stored in `.env`
- [ ] JWT_SECRET and JWT_REFRESH_SECRET configured (min 32 chars)
- [ ] Database SSL/TLS connections enabled
- [ ] HTTPS certificate installed (production)
- [ ] CORS configured for frontend URL only
- [ ] Rate limiting enabled on all endpoints
- [ ] Helmet middleware configured
- [ ] Audit logging enabled
- [ ] Error handlers catch all exceptions
- [ ] Sensitive data never logged
- [ ] Dependencies updated (`npm audit fix`)
- [ ] File uploads have size/type limits
- [ ] S3 bucket is private (no public access)
- [ ] Admin operations logged to audit_logs
- [ ] Account lockout after failed attempts
- [ ] Email verification required
- [ ] Password reset tokens time-limited
- [ ] Refresh tokens revokable
- [ ] Database backups encrypted
- [ ] Secrets rotated periodically

---

**Last Updated**: January 2025
**Version**: 1.0.0-secure
