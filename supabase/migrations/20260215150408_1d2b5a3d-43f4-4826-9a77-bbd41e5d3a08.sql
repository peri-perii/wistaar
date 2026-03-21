-- Add pricing columns to book_submissions
ALTER TABLE public.book_submissions
ADD COLUMN price NUMERIC(10,2) NOT NULL DEFAULT 0,
ADD COLUMN free_chapters INTEGER NOT NULL DEFAULT 3;
