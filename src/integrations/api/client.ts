// Frontend API client to replace Supabase
// This replaces @supabase/supabase-js with standard HTTP calls
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem("authToken");
  }

  private setToken(token: string) {
    this.token = token;
    localStorage.setItem("authToken", token);
  }

  private getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem("authToken");
    }
    return this.token;
  }

  private clearToken() {
    this.token = null;
    localStorage.removeItem("authToken");
  }

  private getHeaders(includeContentType = true): Record<string, string> {
    const headers: Record<string, string> = {};

    if (includeContentType) {
      headers["Content-Type"] = "application/json";
    }

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      this.clearToken();
      window.location.href = "/auth";
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || error.error || "API request failed");
    }

    return response.json();
  }

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================

  async signUp(email: string, password: string, displayName?: string) {
    const response = await fetch(`${this.baseUrl}/auth/signup`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password, displayName }),
    });
    return this.handleResponse(response);
  }

  async signIn(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/auth/signin`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    const data = await this.handleResponse<{
      token: string;
      user: { id: string; email: string };
    }>(response);
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async verify Email(token: string) {
    const response = await fetch(`${this.baseUrl}/auth/verify-email`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ token }),
    });
    return this.handleResponse(response);
  }

  async requestPasswordReset(email: string) {
    const response = await fetch(`${this.baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ email }),
    });
    return this.handleResponse(response);
  }

  async resetPassword(token: string, newPassword: string) {
    const response = await fetch(`${this.baseUrl}/auth/reset-password`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ token, newPassword }),
    });
    return this.handleResponse(response);
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await fetch(`${this.baseUrl}/auth/change-password`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return this.handleResponse(response);
  }

  async signOut() {
    this.clearToken();
    const response = await fetch(`${this.baseUrl}/auth/signout`, {
      method: "POST",
      headers: this.getHeaders(),
    }).catch(() => null);
    return true;
  }

  async getCurrentUser() {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      headers: this.getHeaders(),
    });
    if (response.status === 401) {
      return null;
    }
    return this.handleResponse(response);
  }

  // ============================================================================
  // PROFILE ENDPOINTS
  // ============================================================================

  async getProfile(userId: string) {
    const response = await fetch(`${this.baseUrl}/profiles/${userId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateProfile(userId: string, data: Record<string, any>) {
    const response = await fetch(`${this.baseUrl}/profiles/${userId}`, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async uploadAvatar(userId: string, file: File) {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await fetch(`${this.baseUrl}/profiles/${userId}/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.getToken()}` },
      body: formData,
    });
    return this.handleResponse(response);
  }

  // ============================================================================
  // BOOKS ENDPOINTS
  // ============================================================================

  async getApprovedBooks(options?: { genre?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (options?.genre) query.append("genre", options.genre);
    if (options?.limit) query.append("limit", String(options.limit));

    const response = await fetch(
      `${this.baseUrl}/books${query.toString() ? "?" + query : ""}`,
      {
        headers: this.getHeaders(false),
      }
    );
    return this.handleResponse(response);
  }

  async getBookById(bookId: string) {
    const response = await fetch(`${this.baseUrl}/books/${bookId}`, {
      headers: this.getHeaders(false),
    });
    return this.handleResponse(response);
  }

  async getBookChapters(bookId: string) {
    const response = await fetch(`${this.baseUrl}/books/${bookId}/chapters`, {
      headers: this.getHeaders(false),
    });
    return this.handleResponse(response);
  }

  async submitBookForReview(data: {
    title: string;
    description: string;
    genre: string;
    coverImage?: File;
    manuscript?: File;
  }) {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("genre", data.genre);
    if (data.coverImage) formData.append("coverImage", data.coverImage);
    if (data.manuscript) formData.append("manuscript", data.manuscript);

    const response = await fetch(`${this.baseUrl}/books/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.getToken()}` },
      body: formData,
    });
    return this.handleResponse(response);
  }

  // ============================================================================
  // REVIEWS ENDPOINTS
  // ============================================================================

  async getBookReviews(bookId: string) {
    const response = await fetch(`${this.baseUrl}/books/${bookId}/reviews`, {
      headers: this.getHeaders(false),
    });
    return this.handleResponse(response);
  }

  async submitReview(bookId: string, rating: number, reviewText?: string) {
    const response = await fetch(`${this.baseUrl}/books/${bookId}/reviews`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ rating, reviewText }),
    });
    return this.handleResponse(response);
  }

  // ============================================================================
  // PURCHASE ENDPOINTS
  // ============================================================================

  async getPurchases() {
    const response = await fetch(`${this.baseUrl}/purchases`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getPurchaseReceipt(purchaseId: string) {
    const response = await fetch(`${this.baseUrl}/purchases/${purchaseId}/receipt`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async initiatePayment(bookId: string, amount: number, couponCode?: string) {
    const response = await fetch(`${this.baseUrl}/purchases/initiate`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ bookId, amount, couponCode }),
    });
    return this.handleResponse(response);
  }

  async verifyPayment(transactionId: string, paymentId: string) {
    const response = await fetch(`${this.baseUrl}/purchases/verify`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ transactionId, paymentId }),
    });
    return this.handleResponse(response);
  }

  async deletePurchase(purchaseId: string) {
    const response = await fetch(`${this.baseUrl}/purchases/${purchaseId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // ============================================================================
  // WISHLIST ENDPOINTS
  // ============================================================================

  async getWishlist() {
    const response = await fetch(`${this.baseUrl}/wishlist`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async addToWishlist(bookId: string) {
    const response = await fetch(`${this.baseUrl}/wishlist`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ bookId }),
    });
    return this.handleResponse(response);
  }

  async removeFromWishlist(bookId: string) {
    const response = await fetch(`${this.baseUrl}/wishlist/${bookId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // ============================================================================
  // CART ENDPOINTS
  // ============================================================================

  async getCart() {
    const response = await fetch(`${this.baseUrl}/cart`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async addToCart(bookId: string) {
    const response = await fetch(`${this.baseUrl}/cart`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ bookId }),
    });
    return this.handleResponse(response);
  }

  async removeFromCart(bookId: string) {
    const response = await fetch(`${this.baseUrl}/cart/${bookId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // ============================================================================
  // COUPON ENDPOINTS
  // ============================================================================

  async validateCoupon(code: string) {
    const response = await fetch(`${this.baseUrl}/coupons/validate`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ code }),
    });
    return this.handleResponse(response);
  }

  // ============================================================================
  // READING PROGRESS ENDPOINTS
  // ============================================================================

  async getReadingProgress(bookId: string) {
    const response = await fetch(`${this.baseUrl}/reading-progress/${bookId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateReadingProgress(bookId: string, data: {
    currentChapter?: number;
    currentPage?: number;
    percentageRead?: number;
  }) {
    const response = await fetch(`${this.baseUrl}/reading-progress/${bookId}`, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  // ============================================================================
  // BOOKMARKS ENDPOINTS
  // ============================================================================

  async addBookmark(bookId: string, chapterNumber: number, pageNumber?: number) {
    const response = await fetch(`${this.baseUrl}/bookmarks`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ bookId, chapterNumber, pageNumber }),
    });
    return this.handleResponse(response);
  }

  async removeBookmark(bookmarkId: string) {
    const response = await fetch(`${this.baseUrl}/bookmarks/${bookmarkId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  async getAdminDashboard() {
    const response = await fetch(`${this.baseUrl}/admin/dashboard`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getSubmissions(filters?: { status?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (filters?.status) query.append("status", filters.status);
    if (filters?.limit) query.append("limit", String(filters.limit));

    const response = await fetch(
      `${this.baseUrl}/admin/submissions${query.toString() ? "?" + query : ""}`,
      {
        headers: this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async approveSubmission(submissionId: string, feedback?: string) {
    const response = await fetch(
      `${this.baseUrl}/admin/submissions/${submissionId}/approve`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ feedback }),
      }
    );
    return this.handleResponse(response);
  }

  async rejectSubmission(submissionId: string, feedback: string) {
    const response = await fetch(
      `${this.baseUrl}/admin/submissions/${submissionId}/reject`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ feedback }),
      }
    );
    return this.handleResponse(response);
  }

  async getAllUsers(options?: { limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (options?.limit) query.append("limit", String(options.limit));
    if (options?.offset) query.append("offset", String(options.offset));

    const response = await fetch(
      `${this.baseUrl}/admin/users${query.toString() ? "?" + query : ""}`,
      {
        headers: this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async lockUser(userId: string) {
    const response = await fetch(`${this.baseUrl}/admin/users/${userId}/lock`, {
      method: "POST",
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async unlockUser(userId: string) {
    const response = await fetch(`${this.baseUrl}/admin/users/${userId}/unlock`, {
      method: "POST",
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // ADMIN MANAGEMENT ENDPOINTS
  // ============================================================================

  async getAdmins() {
    const response = await fetch(`${this.baseUrl}/admin/admins`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async addAdmin(email: string, permissions: {
    can_approve_reject: boolean;
    can_manage_coupons: boolean;
    can_manage_admins: boolean;
  }) {
    const response = await fetch(`${this.baseUrl}/admin/admins`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ email, permissions }),
    });
    return this.handleResponse(response);
  }

  async updateAdminPermissions(
    userId: string,
    permissions: {
      can_approve_reject?: boolean;
      can_manage_coupons?: boolean;
      can_manage_admins?: boolean;
    }
  ) {
    const response = await fetch(`${this.baseUrl}/admin/admins/${userId}`, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: JSON.stringify({ permissions }),
    });
    return this.handleResponse(response);
  }

  async removeAdmin(userId: string) {
    const response = await fetch(`${this.baseUrl}/admin/admins/${userId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// Hook for using API client with auth
export function useApi() {
  const navigate = useNavigate();

  const handleError = (error: Error) => {
    if (error.message.includes("401")) {
      navigate("/auth");
    }
    throw error;
  };

  return { apiClient, handleError };
}
