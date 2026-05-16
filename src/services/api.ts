// ============================================
// API SERVICE - BACKEND INTEGRATION GUIDE
// ============================================
// This file documents all the API endpoints you need to implement
// in your backend. Replace the mock implementations with real API calls.

// Base URL for your API
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// ============================================
// TYPES - Use these in your backend
// ============================================

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  authorBio: string;
  genre: string;
  price: 'free' | 'premium';
  rating: number;
  coverColor: string;
  description: string;
  fullDescription: string;
  publishedDate: string;
  pageCount: number;
  language: string;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  readingTime: string;
  content?: string; // Chapter content/text
}

export interface ReadingProgress {
  id?: string;
  user_id: string;
  book_id: string;
  current_chapter: number;
  scroll_position: number;
  last_read_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  book_id: string;
  chapter_number: number;
  scroll_position: number;
  note: string | null;
  highlighted_text: string | null;
  created_at: string;
}

// ============================================
// API ENDPOINTS TO IMPLEMENT
// ============================================

/*
┌─────────────────────────────────────────────────────────────────────────┐
│ AUTHENTICATION ENDPOINTS                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│ POST /api/auth/signup                                                    │
│   Body: { email: string, password: string }                              │
│   Response: { user: User, token: string }                                │
│                                                                          │
│ POST /api/auth/signin                                                    │
│   Body: { email: string, password: string }                              │
│   Response: { user: User, token: string }                                │
│                                                                          │
│ POST /api/auth/signout                                                   │
│   Headers: { Authorization: Bearer <token> }                             │
│   Response: { success: boolean }                                         │
│                                                                          │
│ GET /api/auth/me                                                         │
│   Headers: { Authorization: Bearer <token> }                             │
│   Response: { user: User }                                               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ BOOKS ENDPOINTS                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ GET /api/books                                                           │
│   Query: { genre?, author?, price?, sort?, page?, limit? }               │
│   Response: { books: Book[], total: number, page: number }               │
│                                                                          │
│ GET /api/books/:id                                                       │
│   Response: { book: Book }                                               │
│                                                                          │
│ GET /api/books/:id/chapters/:chapterNumber                               │
│   Response: { chapter: Chapter }                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ READING PROGRESS ENDPOINTS                                               │
├─────────────────────────────────────────────────────────────────────────┤
│ GET /api/reading-progress                                                │
│   Headers: { Authorization: Bearer <token> }                             │
│   Query: { bookId? }                                                     │
│   Response: { progress: ReadingProgress[] }                              │
│                                                                          │
│ POST /api/reading-progress                                               │
│   Headers: { Authorization: Bearer <token> }                             │
│   Body: { book_id, current_chapter, scroll_position }                    │
│   Response: { progress: ReadingProgress }                                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ BOOKMARKS ENDPOINTS                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ GET /api/bookmarks                                                       │
│   Headers: { Authorization: Bearer <token> }                             │
│   Query: { bookId? }                                                     │
│   Response: { bookmarks: Bookmark[] }                                    │
│                                                                          │
│ POST /api/bookmarks                                                      │
│   Headers: { Authorization: Bearer <token> }                             │
│   Body: { book_id, chapter_number, scroll_position, note?, highlighted_text? }│
│   Response: { bookmark: Bookmark }                                       │
│                                                                          │
│ PATCH /api/bookmarks/:id                                                 │
│   Headers: { Authorization: Bearer <token> }                             │
│   Body: { note? }                                                        │
│   Response: { bookmark: Bookmark }                                       │
│                                                                          │
│ DELETE /api/bookmarks/:id                                                │
│   Headers: { Authorization: Bearer <token> }                             │
│   Response: { success: boolean }                                         │
└─────────────────────────────────────────────────────────────────────────┘
*/

// ============================================
// EXAMPLE API HELPER FUNCTIONS
// ============================================

// Get auth token from localStorage
export const getAuthToken = (): string | null => {
  return localStorage.getItem('wistaar_auth_token');
};

// Set auth token in localStorage
export const setAuthToken = (token: string): void => {
  localStorage.setItem('wistaar_auth_token', token);
};

// Remove auth token from localStorage
export const removeAuthToken = (): void => {
  localStorage.removeItem('wistaar_auth_token');
};

// Create headers with auth token
export const createAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Generic fetch wrapper with error handling
export const apiFetch = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...createAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// ============================================
// EXAMPLE API CALLS (Uncomment when implementing)
// ============================================

/*
// Auth
export const signUp = (email: string, password: string) =>
  apiFetch<{ user: User; token: string }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const signIn = (email: string, password: string) =>
  apiFetch<{ user: User; token: string }>('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

// Books
export const getBooks = (params?: { genre?: string; author?: string; price?: string }) =>
  apiFetch<{ books: Book[]; total: number }>(`/books?${new URLSearchParams(params)}`);

export const getBook = (id: string) =>
  apiFetch<{ book: Book }>(`/books/${id}`);

// Reading Progress
export const getReadingProgress = (bookId?: string) =>
  apiFetch<{ progress: ReadingProgress[] }>(`/reading-progress${bookId ? `?bookId=${bookId}` : ''}`);

export const saveReadingProgress = (data: Omit<ReadingProgress, 'id' | 'user_id' | 'last_read_at'>) =>
  apiFetch<{ progress: ReadingProgress }>('/reading-progress', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Bookmarks
export const getBookmarks = (bookId?: string) =>
  apiFetch<{ bookmarks: Bookmark[] }>(`/bookmarks${bookId ? `?bookId=${bookId}` : ''}`);

export const createBookmark = (data: Omit<Bookmark, 'id' | 'user_id' | 'created_at'>) =>
  apiFetch<{ bookmark: Bookmark }>('/bookmarks', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateBookmark = (id: string, note: string) =>
  apiFetch<{ bookmark: Bookmark }>(`/bookmarks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });

export const deleteBookmark = (id: string) =>
  apiFetch<{ success: boolean }>(`/bookmarks/${id}`, {
    method: 'DELETE',
  });
*/
