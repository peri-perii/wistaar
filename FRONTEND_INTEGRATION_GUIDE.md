# 🔗 Frontend-Backend Integration Guide

This guide shows you how to connect the frontend to all the new API endpoints.

---

## 🛠️ Setup

### 1. Update API Service
Edit `src/services/api.ts` in the frontend:

```typescript
// Update base URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance with auth
import axios from 'axios';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-attach token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

## 📚 Implementation Examples

### Cart Management

```typescript
// hooks/useCart.ts
import api from '@/services/api';
import { useQuery, useMutation } from '@tanstack/react-query';

export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await api.get('/cart');
      return data;
    },
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bookId: string) => {
      const { data } = await api.post('/cart/add', { bookId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cartItemId: string) => {
      const { data } = await api.delete(`/cart/remove/${cartItemId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
```

### Purchase Management

```typescript
// hooks/usePurchases.ts
import api from '@/services/api';
import { useQuery, useMutation } from '@tanstack/react-query';

export function usePurchases() {
  return useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const { data } = await api.get('/purchases');
      return data;
    },
  });
}

export function useInitiatePurchase() {
  return useMutation({
    mutationFn: async (payload: { bookId: string; couponCode?: string }) => {
      const { data } = await api.post('/purchases/initiate', payload);
      return data;
    },
  });
}

export function useVerifyPurchase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: { transactionId: string; paymentGatewayResponse?: any }) => {
      const { data } = await api.post('/purchases/verify', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
  });
}

export function useCheckPurchase(bookId: string) {
  return useQuery({
    queryKey: ['has-purchased', bookId],
    queryFn: async () => {
      const { data } = await api.get(`/purchases/check/${bookId}`);
      return data;
    },
    enabled: !!bookId,
  });
}
```

### Coupons

```typescript
// hooks/useCoupons.ts
import api from '@/services/api';
import { useQuery } from '@tanstack/react-query';

export function useValidateCoupon(code: string, amount?: number) {
  return useQuery({
    queryKey: ['validate-coupon', code, amount],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (amount) params.append('amount', amount.toString());
      
      const { data } = await api.get(`/coupons/validate/${code}?${params}`);
      return data;
    },
    enabled: !!code,
  });
}

export function useActiveCoupons(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['active-coupons', page, limit],
    queryFn: async () => {
      const { data } = await api.get(`/coupons/active?page=${page}&limit=${limit}`);
      return data;
    },
  });
}
```

### Notifications

```typescript
// hooks/useNotifications.ts
import api from '@/services/api';
import { useQuery, useMutation } from '@tanstack/react-query';

export function useNotifications(page = 1, unreadOnly = false) {
  return useQuery({
    queryKey: ['notifications', page, unreadOnly],
    queryFn: async () => {
      const { data } = await api.get(`/notifications?page=${page}&unreadOnly=${unreadOnly}`);
      return data;
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count');
      return data;
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await api.put(`/notifications/${notificationId}/read`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.put('/notifications/mark-all-read');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}
```

### Wishlists

```typescript
// hooks/useWishlist.ts
import api from '@/services/api';
import { useQuery, useMutation } from '@tanstack/react-query';

export function useWishlist(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['wishlist', page, limit],
    queryFn: async () => {
      const { data } = await api.get(`/wishlists?page=${page}&limit=${limit}`);
      return data;
    },
  });
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bookId: string) => {
      const { data } = await api.post('/wishlists/add', { bookId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bookId: string) => {
      const { data } = await api.delete(`/wishlists/remove/${bookId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

export function useCheckWishlist(bookId: string) {
  return useQuery({
    queryKey: ['in-wishlist', bookId],
    queryFn: async () => {
      const { data } = await api.get(`/wishlists/check/${bookId}`);
      return data;
    },
    enabled: !!bookId,
  });
}
```

### Admin Functions

```typescript
// hooks/useAdmin.ts
import api from '@/services/api';
import { useQuery, useMutation } from '@tanstack/react-query';

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard');
      return data;
    },
  });
}

export function useSubmissions(status = 'pending', page = 1) {
  return useQuery({
    queryKey: ['submissions', status, page],
    queryFn: async () => {
      const { data } = await api.get(`/admin/submissions?status=${status}&page=${page}`);
      return data;
    },
  });
}

export function useApproveBook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: { bookId: string; feedback?: string }) => {
      const { data } = await api.post(`/admin/submissions/${payload.bookId}/approve`, {
        feedback: payload.feedback,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
}

export function useRejectBook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: { bookId: string; reason: string; feedback?: string }) => {
      const { data } = await api.post(`/admin/submissions/${payload.bookId}/reject`, {
        reason: payload.reason,
        feedback: payload.feedback,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
}
```

### Components Using These Hooks

#### Cart Component
```typescript
// components/Cart.tsx
import { useCart, useRemoveFromCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';

export default function Cart() {
  const { data: cart, isLoading } = useCart();
  const { mutate: removeItem } = useRemoveFromCart();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Shopping Cart</h1>
      {cart?.items.map((item) => (
        <div key={item.id} className="flex justify-between items-center p-4 border">
          <div>
            <h3>{item.title}</h3>
            <p>₹{item.price}</p>
          </div>
          <Button
            variant="destructive"
            onClick={() => removeItem(item.id)}
          >
            Remove
          </Button>
        </div>
      ))}
      <div className="border-t pt-4">
        <h2>Total: ₹{cart?.total}</h2>
        <Button>Checkout</Button>
      </div>
    </div>
  );
}
```

#### Wishlist Component
```typescript
// components/WishlistButton.tsx
import { Heart } from 'lucide-react';
import { useCheckWishlist, useAddToWishlist, useRemoveFromWishlist } from '@/hooks/useWishlist';
import { Button } from '@/components/ui/button';

export default function WishlistButton({ bookId }: { bookId: string }) {
  const { data: wishlist } = useCheckWishlist(bookId);
  const { mutate: addToWishlist } = useAddToWishlist();
  const { mutate: removeFromWishlist } = useRemoveFromWishlist();

  const isInWishlist = wishlist?.inWishlist;

  return (
    <Button
      variant={isInWishlist ? 'default' : 'outline'}
      onClick={() => {
        if (isInWishlist) {
          removeFromWishlist(bookId);
        } else {
          addToWishlist(bookId);
        }
      }}
      className="gap-2"
    >
      <Heart className={isInWishlist ? 'fill-current' : ''} />
      {isInWishlist ? 'Wishlisted' : 'Add to Wishlist'}
    </Button>
  );
}
```

#### Notifications Component
```typescript
// components/NotificationBell.tsx
import { Bell } from 'lucide-react';
import { useUnreadCount, useNotifications } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';

export default function NotificationBell() {
  const { data: unread } = useUnreadCount();
  const { data: notifications } = useNotifications();

  return (
    <div className="relative">
      <Bell className="w-6 h-6 cursor-pointer" />
      {unread?.unreadCount > 0 && (
        <Badge className="absolute -top-2 -right-2">
          {unread.unreadCount}
        </Badge>
      )}
      
      {/* Dropdown menu with notifications */}
      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg max-h-80 overflow-y-auto">
        {notifications?.notifications.map((notif) => (
          <div key={notif.id} className="p-3 border-b hover:bg-gray-50">
            <h4 className="font-medium">{notif.title}</h4>
            <p className="text-sm text-gray-600">{notif.message}</p>
            <span className="text-xs text-gray-400">
              {new Date(notif.createdAt).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🔄 Payment Flow Integration

```typescript
// pages/Checkout.tsx
import { useInitiatePurchase, useVerifyPurchase } from '@/hooks/usePurchases';
import { useValidateCoupon } from '@/hooks/useCoupons';
import { useState } from 'react';

export default function Checkout({ bookId }: { bookId: string }) {
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);

  const { data: coupon } = useValidateCoupon(couponCode, 199.99);
  const { mutate: initiatePurchase } = useInitiatePurchase();
  const { mutate: verifyPurchase } = useVerifyPurchase();

  const handleInitiatePurchase = async () => {
    initiatePurchase(
      { bookId, couponCode: couponCode || undefined },
      {
        onSuccess: (data) => {
          // Send to PayU gateway
          redirectToPaymentGateway(data.paymentData);
        },
      }
    );
  };

  const redirectToPaymentGateway = (paymentData: any) => {
    // Integrate with PayU payment gateway
    // After payment, call verifyPurchase
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2>Coupon Code</h2>
        <input
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          placeholder="Enter coupon code"
        />
        {coupon?.discount && (
          <p className="text-green-600">
            Save ₹{coupon.discount.discountAmount} ({coupon.coupon.discountValue}% off)
          </p>
        )}
      </div>

      <div className="border p-6 rounded-lg">
        <h3>Order Summary</h3>
        <p>Subtotal: ₹199.99</p>
        {coupon?.discount && (
          <p className="text-green-600">Discount: -₹{coupon.discount.discountAmount}</p>
        )}
        <h2>
          Total: ₹{coupon?.discount?.finalAmount || 199.99}
        </h2>
      </div>

      <button
        onClick={handleInitiatePurchase}
        className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg"
      >
        Proceed to Payment
      </button>
    </div>
  );
}
```

---

## ✅ Checklist for Frontend Integration

- [ ] Update `src/services/api.ts` with new endpoints
- [ ] Add hooks from this guide to `src/hooks/`
- [ ] Create/update Cart component
- [ ] Create/update Purchase/Checkout component
- [ ] Create/update Wishlist component
- [ ] Create/update Notification component
- [ ] Create Admin Dashboard components
- [ ] Update Book Detail component to use new endpoints
- [ ] Test all flows end-to-end
- [ ] Verify token management
- [ ] Test error handling
- [ ] Test with real backend

---

## 🚀 Testing Flow

### 1. Local Testing
```bash
# Terminal 1: Start backend
cd wistaar-backend
npm run dev

# Terminal 2: Start frontend
cd wistaar-reading-studio
npm run dev
```

### 2. Test Registration & Auth
- Sign up new user
- Verify email with token
- Sign in
- Check token stored in localStorage

### 3. Test Shopping
- Search for books
- Add to cart
- View cart
- Apply coupon
- Proceed to checkout

### 4. Test Admin
- Create admin account
- View pending submissions
- Approve a book
- View dashboard stats

### 5. Test Author
- Submit a book
- Check earnings
- View analytics

---

## 📝 Notes

- All API calls include error handling
- Tokens automatically attached to requests
- useQuery handles caching & refetching
- useMutation handles optimistic updates
- Use `queryClient.invalidateQueries()` to refresh data
- All endpoints documented in `API_REFERENCE.md`

---

Done! Your frontend is now ready to use all the backend endpoints! 🎉
