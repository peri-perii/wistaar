# Google OAuth Implementation Checklist

## 🎯 Quick Start (15 minutes)

### Phase 1: Google Cloud Setup (5 min)
- [ ] Go to https://console.cloud.google.com/
- [ ] Create new project named "Wistaar"
- [ ] Enable "Google+ API"
- [ ] Go to Credentials → Create OAuth 2.0 Web Application
- [ ] Add JavaScript origins:
  - [ ] `https://wistaar-76ivdwxzy-priyamj1502-8614s-projects.vercel.app`
  - [ ] `http://localhost:5173`
  - [ ] `http://localhost:5000`
- [ ] Add redirect URIs:
  - [ ] `https://wistaar-76ivdwxzy-priyamj1502-8614s-projects.vercel.app/auth`
  - [ ] `http://localhost:5173/auth`
  - [ ] `http://localhost:5000/api/auth/google/callback`
- [ ] Copy **Client ID** and **Client Secret**

### Phase 2: Frontend Setup (5 min)
- [ ] Run: `npm install @react-oauth/google`
- [ ] Create `.env.local` in `wistaar-reading-studio`:
  ```
  VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
  VITE_API_URL=http://localhost:5000/api
  ```
- [ ] Update `src/main.tsx` with GoogleOAuthProvider wrapper
- [ ] Update `src/pages/Auth.tsx` to use GoogleLoginButton
- [ ] Files already created:
  - [ ] ✅ `src/integrations/api/oauth.ts`
  - [ ] ✅ `src/components/GoogleLoginButton.tsx`

### Phase 3: Backend Setup (5 min)
- [ ] Run: `npm install google-auth-library jsonwebtoken bcrypt`
- [ ] Create `.env` with:
  ```
  GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
  GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
  JWT_SECRET=your-super-secret-key
  JWT_REFRESH_SECRET=your-super-secret-refresh-key
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=your-password
  DB_NAME=wistaar
  ```
- [ ] Update User table in database:
  ```sql
  ALTER TABLE User ADD COLUMN googleId VARCHAR(255) UNIQUE NULL;
  ```
- [ ] Create `routes/auth.js` with code from `GOOGLE_OAUTH_BACKEND.md`
- [ ] Add to `server.js`:
  ```javascript
  import authRoutes from './routes/auth.js'
  app.use('/api/auth', authRoutes)
  ```

### Phase 4: Test Locally (2 min)
- [ ] Terminal 1: `cd wistaar-reading-studio && npm run dev`
- [ ] Terminal 2: `cd backend && npm start`
- [ ] Go to http://localhost:5173/auth
- [ ] Click "Sign in with Google"
- [ ] Verify successful login and redirect

### Phase 5: Deploy to Vercel (3 min)
- [ ] In Vercel Project Dashboard:
  - [ ] Settings → Environment Variables
  - [ ] Add: `VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID`
  - [ ] Add: `VITE_API_URL=https://your-backend-url.com/api`
- [ ] Git push to trigger redeploy:
  ```bash
  git add .
  git commit -m "feat: Add Google OAuth"
  git push origin main
  ```
- [ ] Test on production: https://wistaar-76ivdwxzy-priyamj1502-8614s-projects.vercel.app/auth

---

## 📋 Environment Variables Reference

### Frontend (.env.local in wistaar-reading-studio)
```env
# Google OAuth
VITE_GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com

# API
VITE_API_URL=http://localhost:5000/api   # Local
# VITE_API_URL=https://api.example.com/api  # Production
```

### Backend (.env)
```env
# Google OAuth
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# JWT Tokens
JWT_SECRET=change-this-to-a-random-string-at-least-32-chars
JWT_REFRESH_SECRET=change-this-to-a-different-random-string

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_NAME=wistaar

# Server
PORT=5000
NODE_ENV=development
```

---

## 📁 Files Created (Review These)

| File | Purpose |
|------|---------|
| `src/integrations/api/oauth.ts` | OAuth client functions |
| `src/components/GoogleLoginButton.tsx` | Google login button component |
| `GOOGLE_OAUTH_SETUP.md` | Complete setup guide |
| `GOOGLE_OAUTH_BACKEND.md` | Backend route handler template |
| `EXPRESS_SERVER_EXAMPLE.md` | Full Express server example |
| `AUTH_OAUTH_EXAMPLE.md` | Frontend integration examples |

---

## 🔗 Quick Links

| Resource | URL |
|----------|-----|
| Google Cloud Console | https://console.cloud.google.com/ |
| Your Vercel App | https://wistaar-76ivdwxzy-priyamj1502-8614s-projects.vercel.app |
| Vercel Settings | https://vercel.com/dashboard/YOUR_PROJECT_NAME/settings |
| @react-oauth/google | https://www.npmjs.com/package/@react-oauth/google |
| Google Auth Library | https://www.npmjs.com/package/google-auth-library |

---

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| "CORS error" | Add frontend URL to Google Cloud "Authorized JavaScript origins" |
| "Invalid credential" | Check GOOGLE_CLIENT_ID is correct |
| "User not created" | Verify User table has googleId column |
| "403 Forbidden" | Recreate OAuth credentials and check Client Secret |
| "Token expired" | Clear localStorage and try login again |
| "Connection refused" | Verify backend is running on port 5000 |

---

## 📞 Testing Commands

### Test Google credential (paste in browser console)
```javascript
// Get User ID token from Google OAuth
// Available in credentialResponse.credential
// Then test with:
fetch('http://localhost:5000/api/auth/google', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ credential: 'YOUR_JWT_TOKEN' })
}).then(r => r.json()).then(console.log)
```

### Test backend is running
```bash
curl http://localhost:5000/api/health
# Expected: { "success": true, "message": "Server is running" }
```

### Check database connection
```bash
# In backend directory
mysql -h localhost -u root -p wistaar
# Then: SELECT COUNT(*) FROM User;
```

---

## 🎉 Success Indicators

✅ Frontend has GoogleOAuthProvider wrapper in main.tsx  
✅ Auth.tsx displays Google login button  
✅ Google Cloud credentials created and configured  
✅ Backend route POST /api/auth/google exists  
✅ User table has googleId column  
✅ .env files have all required variables  
✅ Local test: Can login with Google on localhost  
✅ Production test: Can login on Vercel deployed app  
✅ New users created in database  
✅ Tokens stored in localStorage  

---

## 📱 Next Features (Optional)

- [ ] GitHub OAuth (similar setup)
- [ ] Email/Password with OAuth account linking
- [ ] Social profile enrichment
- [ ] Account linking dashboard
- [ ] Logout with token blacklist
- [ ] Account deletion with data export

---

## 📞 Support

If stuck:
1. Check browser console for JavaScript errors
2. Check backend logs: `npm install -g pm2 && pm2 logs`
3. Verify all .env variables are set
4. Verify database connection with mysql client
5. Test Google credential locally first
6. Check Google Cloud setup is complete

---

Last updated: March 2026
