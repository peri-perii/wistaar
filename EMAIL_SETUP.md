# 📧 Email Configuration Guide

## Setup Email Service for Password Reset

The forgot password flow requires an email service to send reset links to users. Here are the easiest options:

---

## Option 1: Gmail (Easiest for Development)

### Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Scroll to "2-Step Verification"
3. Click it and follow the setup

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select: **Mail** → **Windows Computer** (or your device)
3. Google generates a 16-character password
4. Copy it

### Step 3: Update Backend .env

```env
# Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  (the 16-char app password)
EMAIL_FROM=noreply@wistaar.com
EMAIL_FROM_NAME=Wistaar
```

✅ Done! Restart backend with `npm run dev`

---

## Option 2: SendGrid (Recommended for Production)

### Step 1: Create SendGrid Account
1. Sign up at https://sendgrid.com
2. Verify your email
3. Go to **Settings** → **API Keys**
4. Create new API key
5. Copy the key

### Step 2: Add Sender
1. Go to **Settings** → **Sender Authentication**
2. Click "Create New Sender"
3. Add your email: `noreply@wistaar.com`
4. Verify it

### Step 3: Update Backend .env

```env
# Email Configuration (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@wistaar.com
EMAIL_FROM_NAME=Wistaar
```

✅ Done! Restart backend with `npm run dev`

---

## Option 3: Mailgun (Alternative)

### Step 1: Create Mailgun Account
1. Sign up at https://www.mailgun.com
2. Get your API key from dashboard

### Step 2: Update Backend .env

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mail.yourdomain.com
SMTP_PASSWORD=your_mailgun_password
EMAIL_FROM=noreply@wistaar.com
EMAIL_FROM_NAME=Wistaar
```

---

## Testing Email Sending

### Method 1: Manual Test

```bash
# In VS Code terminal, run this:
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your_email@gmail.com"}'
```

Check your email inbox for the reset link.

### Method 2: Check Backend Logs

When you start the backend with `npm run dev`:
```
✓ Email sent to: user@example.com
✓ Reset token: abc123xyz...
```

Look for these success messages.

### Method 3: Frontend Test

1. Go to http://localhost:5173/forgot-password
2. Enter your email
3. Click "Send reset link"
4. Check your inbox
5. Click the link in the email
6. You should be redirected to reset password form

---

## Common Issues & Solutions

### Problem: "SMTP Error: 535 Authentication failed"

**Cause:** Wrong email or app password
**Solution:**
- ✓ Double-check email is correct
- ✓ Gmail: Use the 16-character app password (without spaces)
- ✓ SendGrid: Verify API key format starts with "SG."
- ✓ Gmail: If you copy-pasted, spaces might be included

### Problem: "Email timeout after 30s"

**Cause:** SMTP host is unreachable
**Solution:**
- ✓ Check SMTP_HOST is correct: `smtp.gmail.com` vs `mail.yourdomain.com`
- ✓ Check SMTP_PORT is 587 or 25 (not 465)
- ✓ Verify firewall allows outgoing SMTP
- ✓ Try updating SMTP_HOST to IP address

### Problem: "550 5.1.1 The email account doesn't exist"

**Cause:** EMAIL_FROM address is invalid
**Solution:**
- ✓ Use a verified email: `noreply@yourdomain.com`
- ✓ For Gmail: Must be the same as SMTP_USER
- ✓ For SendGrid: Must be verified in Sender Authentication

### Problem: "Emails going to spam"

**Cause:** Missing email headers/configuration
**Solution:**
- ✓ Add SPF record to your domain DNS
- ✓ Add DKIM key to domain DNS
- ✓ Use SendGrid instead (better deliverability)

---

## Production Email Configuration

For production, use a dedicated email service:

```env
# Production - SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Wistaar
```

**Recommended Providers:**
1. **SendGrid** - Best for startups ($25-100/month)
2. **Mailgun** - Great API ($0.50/1000 emails)
3. **AWS SES** - Cheapest for high volume ($0.10/1000 emails)
4. **Brevo** (formerly Sendinblue) - Free tier with 300 emails/day

---

## Email Template Customization

To customize the password reset email, edit: `src/utils/email.ts`

Current template:
```
Subject: Reset your password - Wistaar
From: Wistaar <noreply@wistaar.com>

Hi [User],
Click the link to reset your password:
[Reset Link]
This link expires in 1 hour.
```

Example customization:
```typescript
// In src/utils/email.ts, sendPasswordResetEmail()
const mailOptions = {
  from: process.env.EMAIL_FROM,
  to: to,
  subject: '🔐 Reset your Wistaar password',
  html: `
    <h1>Password Reset</h1>
    <p>Click the link below to create a new password:</p>
    <a href="${resetUrl}">Reset Password</a>
    <p>This link expires in 1 hour.</p>
    <hr>
    <p>If you didn't request this, ignore this email.</p>
  `
};
```

---

## Verify Setup

Run this command to test the configuration:

```bash
cd c:\Users\ASUS\Downloads\wistaar\wistaar-backend
npm run dev
```

Then check the logs for:
- ✅ "Server running on http://localhost:5000"
- ✅ "Connected to MySQL database"
- ✅ No SMTP errors in console

Now test the flow:
1. Go to http://localhost:5173/forgot-password
2. Enter email
3. Check inbox for reset email
4. Verify you can reset password

✅ All set!

