-- Add unique constraint for upsert on reading_progress
ALTER TABLE public.reading_progress
ADD CONSTRAINT reading_progress_user_book_unique UNIQUE (user_id, book_id);