# Google OAuth Integration Guide

## Overview
This guide connects your Vercel-deployed Wistaar app to Google OAuth for seamless user authentication.

---

## Part 1: Google Cloud Setup

### 1.1 Create Google OAuth Credentials

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com/

2. **Create/Select Project:**
   - Click on project dropdown → Create new project
   - Name: "Wistaar" or similar
   - Click Create

3. **Enable Google+ API:**
   - Search "Google+ API"
   - Click → Enable

4. **Create OAuth 2.0 Credentials:**
   - Go to Credentials (left sidebar)
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Click Create

5. **Configure Authorized URLs:**

   **Authorized JavaScript origins (add all):**
   ```
   https://wistaar-76ivdwxzy-priyamj1502-8614s-projects.vercel.app
   http://localhost:3000
   http://localhost:5173
   http://localhost:5000
   ```

   **Authorized redirect URIs (add all):**
   ```
   https://wistaar-76ivdwxzy-priyamj1502-8614s-projects.vercel.app/auth
   http://localhost:5173/auth
   http://localhost:3000/auth
   http://localhost:5000/auth/google/callback
   ```

6. **Copy Credentials:**
   - Save your **Client ID** (e.g., `xxx.apps.googleusercontent.com`)
   - Save your **Client Secret** (keep this private!)

---

## Part 2: Frontend Setup

### 2.1 Install Dependencies

```bash
cd wistaar-reading-studio
npm install @react-oauth/google google-auth-library
```

### 2.2 Update main.tsx

Wrap your app with GoogleOAuthProvider:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.tsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
```

### 2.3 Update Auth.tsx

Replace the existing Google sign-in button with:

```tsx
import { GoogleLoginButton } from '@/components/GoogleLoginButton'

// In your Auth component JSX, add:
<div className="space-y-4">
  <Separator className="my-4" />
  <p className="text-sm text-muted-foreground text-center">Or continue with</p>
  <GoogleLoginButton 
    onSuccess={() => navigate('/')}
    onError={() => setIsLoading(false)}
  />
</div>
```

### 2.4 Environment Variables

Create/update `.env.local` in `wistaar-reading-studio`:

```env
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
VITE_API_URL=http://localhost:5000/api
```

For production (Vercel):
```env
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
VITE_API_URL=https://your-backend-url.com/api
```

---

## Part 3: Backend Setup

### 3.1 Install Backend Dependencies

```bash
npm install google-auth-library jsonwebtoken
```

### 3.2 Environment Variables

Add to your `.env` file in the backend:

```env
# Google OAuth
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# Database
DATABASE_URL=mysql://user:password@localhost:3306/wistaar

# API
API_URL=http://localhost:5000
```

### 3.3 Database Schema Update

Ensure your User table has the `googleId` field:

```sql
ALTER TABLE "User" ADD COLUMN "googleId" VARCHAR(255) UNIQUE NULL;
```

If using Prisma, update `schema.prisma`:

```prisma
model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  googleId  String? @unique  // Add this line
  passwordHash String?
  role      String  @default("USER")
  emailVerified Boolean @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  profile Profile?
  purchases BookPurchase[]
  
  @@index([googleId])
}
```

Then run:
```bash
npx prisma migrate dev --name add_google_id
```

### 3.4 Add Routes to Express

In your main Express app file (e.g., `server.js` or `index.js`):

```javascript
import authRoutes from './routes/auth.js'

// Add this route
app.use('/api/auth', authRoutes)
```

### 3.5 Copy Backend Handler

Copy the code from `GOOGLE_OAUTH_BACKEND.md` to create your route handler:

```
routes/auth.js  or  auth/google.js
```

---

## Part 4: Deploy to Vercel

### 4.1 Update Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add:

```
VITE_GOOGLE_CLIENT_ID = YOUR_CLIENT_ID
VITE_API_URL = https://your-backend-api.com/api
```

### 4.2 Redeploy

```bash
# Push changes to trigger redeployment
git add .
git commit -m "feat: Add Google OAuth integration"
git push origin main
```

Or manually trigger redeploy in Vercel dashboard.

---

## Part 5: Test the Integration

### 5.1 Local Testing

```bash
# Terminal 1: Frontend (wistaar-reading-studio)
npm run dev

# Terminal 2: Backend
npm run dev  # or node server.js
```

1. Go to http://localhost:5173/auth
2. Click "Sign in with Google"
3. Select your Google account
4. Should redirect to home page and show success toast

### 5.2 Production Testing

1. Go to https://wistaar-76ivdwxzy-priyamj1502-8614s-projects.vercel.app/auth
2. Click "Sign in with Google"
3. Complete the flow

---

## Part 6: Backend Integration Steps (Express Example)

Add to your Express `server.js`:

```javascript
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'

const app = express()

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://wistaar-76ivdwxzy-priyamj1502-8614s-projects.vercel.app'
  ]
}))

app.use(express.json())

// Mount auth routes
app.use('/api/auth', authRoutes)

app.listen(5000, () => {
  console.log('API running on http://localhost:5000')
})
```

---

## Troubleshooting

### "Credential is not valid or has expired"
- **Issue:** Token is old or credentials are invalid
- **Fix:** Clear browser localStorage → Try login again

### "CORS error"
- **Issue:** Frontend URL not added to Google Cloud credentials
- **Fix:** Add URL to "Authorized JavaScript origins" in Google Cloud Console

### "Invalid code"
- **Issue:** Backend not verifying credential correctly
- **Fix:** Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct

### "403 Forbidden"
- **Issue:** GitHub repo doesn't exist or token lacks permissions
- **Fix:** Create repo at https://github.com/new first

### "User not created"
- **Issue:** Database error when saving new user
- **Fix:** Check database connection and User table schema

---

## Next Steps

1. ✅ Set up Google OAuth credentials in Google Cloud Console
2. ✅ Install frontend dependencies (`@react-oauth/google`)
3. ✅ Add GoogleOAuthProvider wrapper in main.tsx
4. ✅ Update Auth.tsx to use GoogleLoginButton
5. ✅ Add backend route handler with token verification
6. ✅ Add environment variables to .env files
7. ✅ Deploy to Vercel
8. ✅ Test sign-in flow

---

## Files Created

- `src/integrations/api/oauth.ts` - OAuth client functions
- `src/components/GoogleLoginButton.tsx` - Google login UI component
- `GOOGLE_OAUTH_BACKEND.md` - Backend handler code template
- `AUTH_OAUTH_EXAMPLE.md` - Frontend integration examples

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Check backend logs for token verification failures
3. Verify all environment variables are set
4. Ensure database User table has `googleId` field
5. Verify CORS origins are correct in Google Cloud Console
