
-- Table to store extracted chapter content from PDFs
CREATE TABLE public.book_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.book_submissions(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(book_id, chapter_number)
);

ALTER TABLE public.book_chapters ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if book is approved (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_book_approved(book_uuid uuid)
RETURNS boolean
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
