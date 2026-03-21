// ============================================
// DATABASE SCHEMA GUIDE
// ============================================
// Use this as a reference for your database structure
// Compatible with PostgreSQL, MySQL, MongoDB, etc.

/*
┌─────────────────────────────────────────────────────────────────────────┐
│ TABLE: users                                                             │
├─────────────────────────────────────────────────────────────────────────┤
│ id            UUID PRIMARY KEY DEFAULT gen_random_uuid()                 │
│ email         VARCHAR(255) UNIQUE NOT NULL                               │
│ password_hash VARCHAR(255) NOT NULL                                      │
│ name          VARCHAR(255)                                               │
│ avatar        VARCHAR(500)                                               │
│ created_at    TIMESTAMP DEFAULT NOW()                                    │
│ updated_at    TIMESTAMP DEFAULT NOW()                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ TABLE: books                                                             │
├─────────────────────────────────────────────────────────────────────────┤
│ id               UUID PRIMARY KEY DEFAULT gen_random_uuid()              │
│ title            VARCHAR(255) NOT NULL                                   │
│ author           VARCHAR(255) NOT NULL                                   │
│ author_bio       TEXT                                                    │
│ genre            VARCHAR(100) NOT NULL                                   │
│ price            ENUM('free', 'premium') DEFAULT 'free'                  │
│ rating           DECIMAL(2,1) DEFAULT 0                                  │
│ cover_color      VARCHAR(50)                                             │
│ description      VARCHAR(500)                                            │
│ full_description TEXT                                                    │
│ published_date   DATE                                                    │
│ page_count       INTEGER                                                 │
│ language         VARCHAR(50) DEFAULT 'English'                           │
│ created_at       TIMESTAMP DEFAULT NOW()                                 │
│ updated_at       TIMESTAMP DEFAULT NOW()                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ TABLE: chapters                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ id            UUID PRIMARY KEY DEFAULT gen_random_uuid()                 │
│ book_id       UUID REFERENCES books(id) ON DELETE CASCADE                │
│ number        INTEGER NOT NULL                                           │
│ title         VARCHAR(255) NOT NULL                                      │
│ content       TEXT                                                       │
│ reading_time  VARCHAR(50)                                                │
│ created_at    TIMESTAMP DEFAULT NOW()                                    │
│                                                                          │
│ UNIQUE(book_id, number)                                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ TABLE: reading_progress                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY DEFAULT gen_random_uuid()               │
│ user_id         UUID REFERENCES users(id) ON DELETE CASCADE              │
│ book_id         UUID REFERENCES books(id) ON DELETE CASCADE              │
│ current_chapter INTEGER DEFAULT 1                                        │
│ scroll_position DECIMAL DEFAULT 0                                        │
│ last_read_at    TIMESTAMP DEFAULT NOW()                                  │
│ created_at      TIMESTAMP DEFAULT NOW()                                  │
│                                                                          │
│ UNIQUE(user_id, book_id)                                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ TABLE: bookmarks                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ id               UUID PRIMARY KEY DEFAULT gen_random_uuid()              │
│ user_id          UUID REFERENCES users(id) ON DELETE CASCADE             │
│ book_id          UUID REFERENCES books(id) ON DELETE CASCADE             │
│ chapter_number   INTEGER NOT NULL                                        │
│ scroll_position  DECIMAL DEFAULT 0                                       │
│ note             TEXT                                                    │
│ highlighted_text TEXT                                                    │
│ created_at       TIMESTAMP DEFAULT NOW()                                 │
└─────────────────────────────────────────────────────────────────────────┘

-- INDEXES
CREATE INDEX idx_books_genre ON books(genre);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_price ON books(price);
CREATE INDEX idx_chapters_book_id ON chapters(book_id);
CREATE INDEX idx_reading_progress_user_id ON reading_progress(user_id);
CREATE INDEX idx_reading_progress_book_id ON reading_progress(book_id);
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_book_id ON bookmarks(book_id);
*/

// TypeScript interfaces matching the database schema
export interface DBUser {
  id: string;
  email: string;
  password_hash: string;
  name?: string;
  avatar?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DBBook {
  id: string;
  title: string;
  author: string;
  author_bio?: string;
  genre: string;
  price: 'free' | 'premium';
  rating: number;
  cover_color?: string;
  description?: string;
  full_description?: string;
  published_date?: Date;
  page_count?: number;
  language: string;
  created_at: Date;
  updated_at: Date;
}

export interface DBChapter {
  id: string;
  book_id: string;
  number: number;
  title: string;
  content?: string;
  reading_time?: string;
  created_at: Date;
}

export interface DBReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  current_chapter: number;
  scroll_position: number;
  last_read_at: Date;
  created_at: Date;
}

export interface DBBookmark {
  id: string;
  user_id: string;
  book_id: string;
  chapter_number: number;
  scroll_position: number;
  note?: string;
  highlighted_text?: string;
  created_at: Date;
}
