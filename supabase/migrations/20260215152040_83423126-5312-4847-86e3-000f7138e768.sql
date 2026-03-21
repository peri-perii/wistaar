
-- Add display fields for approved books
ALTER TABLE public.book_submissions 
ADD COLUMN IF NOT EXISTS rating NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS read_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_chapters INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS cover_color TEXT NOT NULL DEFAULT 'bg-gradient-to-br from-amber-200 to-orange-300';

-- Allow everyone to view approved books (public catalog)
CREATE POLICY "Anyone can view approved books"
ON public.book_submissions
FOR SELECT
USING (status = 'approved');
