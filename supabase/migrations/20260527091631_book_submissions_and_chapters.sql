-- ============================================
-- MIGRATION 2: Book Submissions & Chapters
-- ============================================

-- Book submissions table (central books table)
CREATE TABLE public.book_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  genre TEXT NOT NULL,
  cover_image_url TEXT,
  manuscript_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  free_chapters INTEGER NOT NULL DEFAULT 3,
  rating NUMERIC NOT NULL DEFAULT 0,
  read_count INTEGER NOT NULL DEFAULT 0,
  total_chapters INTEGER NOT NULL DEFAULT 1,
  cover_color TEXT NOT NULL DEFAULT 'bg-gradient-to-br from-amber-200 to-orange-300'
);

ALTER TABLE public.book_submissions ENABLE ROW LEVEL SECURITY;

-- Authors can view their own submissions
CREATE POLICY "Authors can view their own submissions"
  ON public.book_submissions FOR SELECT
  USING (auth.uid() = author_id);

-- Authors can insert their own submissions
CREATE POLICY "Authors can create submissions"
  ON public.book_submissions FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
  ON public.book_submissions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update submissions (approve/reject)
CREATE POLICY "Admins can update submissions"
  ON public.book_submissions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can view approved books (public catalog)
CREATE POLICY "Anyone can view approved books"
  ON public.book_submissions FOR SELECT
  USING (status = 'approved');

-- Authors can delete their own submissions
CREATE POLICY "Authors can delete their own submissions"
  ON public.book_submissions FOR DELETE
  USING (auth.uid() = author_id);

-- Admins can delete any submission
CREATE POLICY "Admins can delete submissions"
  ON public.book_submissions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Book chapters table
CREATE TABLE public.book_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.book_submissions(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(book_id, chapter_number)
);

ALTER TABLE public.book_chapters ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if book is approved
CREATE OR REPLACE FUNCTION public.is_book_approved(book_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.book_submissions
    WHERE id = book_uuid AND status = 'approved'
  )
$$;

-- Anyone can read chapters of approved books
CREATE POLICY "Anyone can read chapters of approved books"
  ON public.book_chapters FOR SELECT
  USING (public.is_book_approved(book_id));

-- Admins can manage all chapters
CREATE POLICY "Admins can manage all chapters"
  ON public.book_chapters FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Authors can manage chapters of their own books
CREATE POLICY "Authors can manage own book chapters"
  ON public.book_chapters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.book_submissions
      WHERE id = book_id AND author_id = auth.uid()
    )
  );
