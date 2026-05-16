# 🔐 Forgot Password Flow - Complete Implementation

## ✅ What's Been Completed

### **Backend Implementation** (`wistaar-backend`)
- ✅ POST `/api/auth/forgot-password` - Request password reset
- ✅ POST `/api/auth/reset-password` - Reset password with token
- ✅ Email service with password reset links
- ✅ Secure token generation with 1-hour expiry
- ✅ Password hashing with bcryptjs

### **Frontend Implementation** (`wistaar-reading-studio`)
- ✅ `src/pages/ForgotPassword.tsx` - Request password reset form
- ✅ `src/pages/ResetPassword.tsx` - Password reset form
- ✅ `src/integrations/password-reset.ts` - API client functions
- ✅ URL-based token passing (?token=xxxxx)
- ✅ Form validation & error handling
- ✅ Success confirmations with redirects

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: USER FORGOT PASSWORD                                   │
└─────────────────────────────────────────────────────────────────┘

User clicks "Forgot Password" button
           ↓
Navigate to /forgot-password
           ↓
┌──────────────────────────────────────────────┐
│ ForgotPassword.tsx                           │
│ - User enters email                          │
│ - Form validates email format                │
│ - Submits to backend                         │
└──────────────────────────────────────────────┘
           ↓
POST /api/auth/forgot-password
{ email: "user@example.com" }
           ↓
┌──────────────────────────────────────────────┐
│ Backend (auth.ts)                            │
│ ✓ Find user by email                         │
│ ✓ Generate random token (32 chars)           │
│ ✓ Store in password_reset_tokens table       │
│ ✓ Set expiry to 1 hour from now              │
│ ✓ Send email with reset link                 │
└──────────────────────────────────────────────┘
           ↓
Email sent to: user@example.com
Subject: "Reset your password"
Link: https://wistaar.com/reset-password?token=abc123xyz...
           ↓
┌──────────────────────────────────────────────┐
│ User receives email                          │
│ - Checks inbox                               │
│ - Clicks "Reset Password" link               │
└──────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: USER RESETS PASSWORD                                   │
└─────────────────────────────────────────────────────────────────┘

User clicks reset link
           ↓
Navigate to /reset-password?token=abc123xyz...
           ↓
┌──────────────────────────────────────────────┐
│ ResetPassword.tsx                            │
│ - Extract token from URL params              │
│ - Show password reset form                   │
│ - Validate: password ≥ 8 chars               │
│ - Validate: passwords match                  │
│ - Submit to backend                          │
└──────────────────────────────────────────────┘
           ↓
POST /api/auth/reset-password
{ 
  token: "abc123xyz...",
  newPassword: "NewSecure123!"
}
           ↓
┌──────────────────────────────────────────────┐
│ Backend (auth.ts)                            │
│ ✓ Find token in database                     │
│ ✓ Verify token hasn't expired                │
│ ✓ Hash new password with bcryptjs            │
│ ✓ Update user's password_hash                │
│ ✓ Delete used token                          │
│ ✓ Return success                             │
└──────────────────────────────────────────────┘
           ↓
Success! Password updated!
           ↓
Redirect to /auth after 3 seconds
           ↓
User can now login with new password
```

---

## 📋 API Endpoints

### **1. Request Password Reset**

**Endpoint:** `POST /api/auth/forgot-password`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If email exists, reset link sent"
}
```

**Notes:**
- Always returns success message for security (doesn't confirm if email exists)
- Email contains reset link with token: `/reset-password?token=xxxxx`
- Token expires in 1 hour
- Rate limited to prevent abuse

---

### **2. Reset Password**

**Endpoint:** `POST /api/auth/reset-password`

**Request:**
```json
{
  "token": "secure_random_token_32_chars",
  "newPassword": "SecurePassword123!"
}
```

**Response (Success):**
```json
{
  "message": "Password reset successfully"
}
```

**Response (Error - Invalid Token):**
```json
{
  "error": "Invalid or expired token"
}
```

**Response (Error - Weak Password):**
```json
{
  "error": "Password must be at least 8 characters"
}
```

---

## 🎨 Frontend Components

### **ForgotPassword.tsx**

**Location:** `src/pages/ForgotPassword.tsx`

**Features:**
- Email input with validation
- Loading state during submission
- Success state with email confirmation
- Resend option
- Responsive design with quote on desktop

**Key Code:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validate email format
  const result = emailSchema.safeParse(email);
  if (!result.success) {
    setEmailError(result.error.errors[0].message);
    return;
  }
  
  // Request password reset
  try {
    await requestPasswordReset(email);
    setSent(true);  // Show success state
  } catch (error) {
    // Show error toast
  }
};
```

---

### **ResetPassword.tsx**

**Location:** `src/pages/ResetPassword.tsx`

**Features:**
- Extract token from URL: `?token=xxxxx`
- Password input with show/hide toggle
- Confirm password field
- Form validation
- Success confirmation with auto-redirect
- Error handling for invalid/expired tokens

**Key Code:**
```typescript
const token = searchParams.get('token');

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validate() || !token) return;
  
  try {
    await resetPassword(token, password);
    setDone(true);  // Show success
    setTimeout(() => navigate('/auth'), 3000);  // Redirect after 3s
  } catch (error) {
    // Show error
  }
};
```

---

### **API Client** (`password-reset.ts`)

**Location:** `src/integrations/password-reset.ts`

**Functions:**

```typescript
// Request password reset
export async function requestPasswordReset(email: string) {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// Reset password with token
export async function resetPassword(token: string, newPassword: string) {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
```

---

## 🔍 Database Schema

### **Password Reset Tokens Table**

```sql
CREATE TABLE password_reset_tokens (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(32) UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user_expires (user_id, expires_at)
);
```

---

## 📧 Email Template

The backend sends an email with the password reset link:

```
Subject: Reset your password - Wistaar

Hi [User Name],

Click the link below to reset your password. This link expires in 1 hour.

Reset Password: https://wistaar.com/reset-password?token=abc123...

If you didn't request this, ignore this email.

Best regards,
Wistaar Team
```

---

## 🔒 Security Features

✅ **Token Security**
- 32-character random tokens (cryptographically secure)
- Tokens stored in database, never in URLs
- 1-hour expiration for time-limited access
- Tokens deleted after successful reset

✅ **Password Security**
- Minimum 8 characters
- Hashed with bcryptjs (10 rounds)
- Never stored in plain text

✅ **Email Security**
- Email doesn't confirm if account exists (prevents account enumeration)
- Tokens expire quickly (1 hour)
- One-time use (deleted after reset)

✅ **Rate Limiting**
- Backend implements rate limiting
- Prevents brute force attacks
- Prevents email spam abuse

---

## 🧪 Testing the Flow

### **Test Scenario 1: Happy Path**

1. Go to http://localhost:5173/forgot-password
2. Enter your email: `test@example.com`
3. Click "Send reset link"
4. Check your email (check spam folder)
5. Click the reset link in email
6. You'll be redirected to: `/reset-password?token=xxxxx`
7. Enter new password (min 8 chars)
8. Confirm password
9. Click "Update password"
10. Success! Redirected to /auth
11. Login with new password

### **Test Scenario 2: Invalid Email**

1. Go to /forgot-password
2. Enter invalid email: `notanemail`
3. See validation error: "Please enter a valid email address"

### **Test Scenario 3: Expired Token**

1. Go to /reset-password with old token
2. See error: "Invalid or expired token"
3. Click link to request new reset

### **Test Scenario 4: Password Mismatch**

1. Go to /reset-password?token=xxxx
2. Enter password: `Password123`
3. Confirm password: `Password456` (different)
4. See error: "Passwords do not match"

---

## 🚀 Going Live Checklist

- [ ] Update email domain in backend `.env` (SMTP credentials)
- [ ] Set production email sender address
- [ ] Update reset link URL in email template to production domain
- [ ] Add Google redirect URIs to Google Cloud Console
- [ ] Set JWT secrets and secrets to strong values
- [ ] Configure rate limiting for production load
- [ ] Set up database backups
- [ ] Test entire flow end-to-end in staging
- [ ] Monitor email delivery in production
- [ ] Set up alerts for reset link failures

---

## 🐛 Troubleshooting

**Problem:** "Email not received"
- Solution: Check spam folder, verify SMTP credentials in .env

**Problem:** "Invalid token error"
- Solution: Token may have expired (1 hour limit), request new reset

**Problem:** "Passwords do not match"
- Solution: Ensure both password fields contain identical text

**Problem:** "Backend connection error"
- Solution: Ensure backend is running (`npm run dev`), check DB connection

---

## 📞 Support

For issues or questions about the password reset flow, check:
1. Backend logs: `npm run dev` output
2. Browser console: DevTools Network tab
3. Email delivery: Check spam/promotions folders
4. Database: Verify password_reset_tokens table exists

