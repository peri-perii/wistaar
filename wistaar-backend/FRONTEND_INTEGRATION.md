# Frontend Integration Guide

This guide explains how to migrate the frontend from Supabase to the new MySQL backend API.

## 🔄 Migration Steps

### 1. Update Environment Variables

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 2. Replace Auth Hook

**Remove:** `src/hooks/useAuth.tsx` (Supabase version)

**New:** Update to use API endpoints:

```typescript
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isEmailVerified: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  googleSignIn: (token: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  useEffect(() => {
    // Check if user is logged in (token in localStorage)
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          setIsEmailVerified(true); // Backend doesn't create unverified users
        } else {
          localStorage.removeItem('accessToken');
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      }
    }
    setLoading(false);
  };

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const error = await res.json();
        return { error: new Error(error.error) };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const error = await res.json();
        return { error: new Error(error.error) };
      }

      const data = await res.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      setIsEmailVerified(true);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const googleSignIn = async (token: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/google-signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleToken: token }),
      });

      if (!res.ok) {
        const error = await res.json();
        return { error: new Error(error.error) };
      }

      const data = await res.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      setIsEmailVerified(true);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isEmailVerified, signUp, signIn, googleSignIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 3. Create API Service

**New:** `src/services/api.ts`

```typescript
const API_URL = import.meta.env.VITE_API_URL;

export const apiClient = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('accessToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired, try refresh
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem('accessToken', data.accessToken);
          // Retry original request
          return this.request(endpoint, options);
        }
      }
      localStorage.removeItem('accessToken');
    }

    return response;
  },

  // Books
  getBooks: (query?: string) => this.request(`/books${query ? `?${query}` : ''}`),
  getBook: (id: string) => this.request(`/books/${id}`),
  getChapters: (bookId: string) => this.request(`/books/${bookId}/chapters`),
  getChapter: (bookId: string, chapterNumber: number) => this.request(`/books/${bookId}/chapters/${chapterNumber}`),
  submitBook: (data: any) => this.request('/books', { method: 'POST', body: JSON.stringify(data) }),

  // Reviews
  getReviews: (bookId: string, query?: string) => this.request(`/reviews/book/${bookId}${query ? `?${query}` : ''}`),
  addReview: (bookId: string, data: any) => this.request(`/reviews/book/${bookId}`, { method: 'POST', body: JSON.stringify(data) }),
  deleteReview: (reviewId: string) => this.request(`/reviews/${reviewId}`, { method: 'DELETE' }),

  // Analytics
  updateProgress: (data: any) => this.request('/analytics/reading-progress', { method: 'POST', body: JSON.stringify(data) }),
  getProgress: (bookId: string) => this.request(`/analytics/reading-progress/${bookId}`),
  getAnalytics: (bookId: string) => this.request(`/analytics/book/${bookId}`),

  // Search
  search: (query: string, type?: string) => this.request(`/search?q=${query}${type ? `&type=${type}` : ''}`),
  searchAdvanced: (query?: string) => this.request(`/search/advanced${query ? `?${query}` : ''}`),

  // Authors
  getAuthorProfile: (userId: string) => this.request(`/authors/profile/${userId}`),
  getMyBooks: (query?: string) => this.request(`/authors/my-books${query ? `?${query}` : ''}`),
  updateAuthorProfile: (data: any) => this.request('/authors/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Payouts
  getEarnings: (query?: string) => this.request(`/payouts/earnings${query ? `?${query}` : ''}`),
  getEarningsSummary: () => this.request('/payouts/earnings-summary'),
  requestPayout: (data: any) => this.request('/payouts/request-payout', { method: 'POST', body: JSON.stringify(data) }),

  // Users
  getUserProfile: () => this.request('/users/profile'),
  updateProfile: (data: any) => this.request('/users/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getWishlist: () => this.request('/users/wishlist'),
  addToWishlist: (bookId: string) => this.request(`/users/wishlist/${bookId}`, { method: 'POST' }),
  removeFromWishlist: (bookId: string) => this.request(`/users/wishlist/${bookId}`, { method: 'DELETE' }),
};
```

### 4. Update Book Components

**Example: `BookSearch.tsx`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';

export function BookSearch() {
  const [search, setSearch] = useState('');
  
  const { data: results, isLoading } = useQuery({
    queryKey: ['search', search],
    queryFn: () => apiClient.search(search).then(r => r.json()),
    enabled: search.length > 0,
  });

  return (
    // Your UI here
  );
}
```

### 5. Update Auth Pages

**Update:** `src/pages/Auth.tsx`

```typescript
import { useAuth } from '@/hooks/useAuth';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

export default function Auth() {
  const { signUp, signIn, googleSignIn } = useAuth();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    const { error } = await googleSignIn(credentialResponse.credential);
    if (!error) {
      navigate('/');
    }
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      {/* ... */}
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => console.error('Google login failed')}
      />
    </GoogleOAuthProvider>
  );
}
```

### 6. Remove Supabase Dependencies

```bash
npm uninstall @supabase/supabase-js
```

### 7. Update package.json

Add Google OAuth:

```bash
npm install @react-oauth/google
```

## 📝 Key API Changes

| Feature | Before (Supabase) | After (MySQL Backend) |
|---------|------|-------|
| **Auth** | `supabase.auth.*` | `POST /api/auth/*` |
| **Database** | Real-time queries | HTTP REST API |
| **Email** | Supabase Auth | SendGrid/SMTP |
| **Token** | Supabase session | JWT in localStorage |
| **Books** | Direct DB query | `/api/books` endpoints |
| **Analytics** | Real-time queries | `/api/analytics` endpoints |

## ✅ Testing

After migration, test:

1. ✅ Sign up with email
2. ✅ Verify email
3. ✅ Sign in
4. ✅ Google OAuth login
5. ✅ Book search
6. ✅ Reading progress
7. ✅ Add reviews
8. ✅ Author earnings view
9. ✅ Wishlist

## 🤝 Support

For any issues, check:
- Backend API logs
- Browser console for CORS errors
- Network tab for API calls status

---

**Frontend is now connected to the new MySQL backend! 🎉**
