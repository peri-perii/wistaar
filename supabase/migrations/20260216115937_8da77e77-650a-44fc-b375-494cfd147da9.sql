
-- Allow authors to delete their own submissions
CREATE POLICY "Authors can delete their own submissions"
ON public.book_submissions
FOR DELETE
USING (auth.uid() = author_id);

-- Allow admins to delete any submission
CREATE POLICY "Admins can delete submissions"
ON public.book_submissions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
