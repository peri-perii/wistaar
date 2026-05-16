
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'author', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Book submissions table
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
  reviewed_by UUID
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

-- Storage bucket for book manuscripts
INSERT INTO storage.buckets (id, name, public) VALUES ('book-manuscripts', 'book-manuscripts', false);

-- Storage bucket for book covers
INSERT INTO storage.buckets (id, name, public) VALUES ('book-covers', 'book-covers', true);

-- Storage policies for manuscripts
CREATE POLICY "Authors can upload manuscripts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'book-manuscripts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authors can view their own manuscripts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-manuscripts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all manuscripts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-manuscripts' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for book covers
CREATE POLICY "Anyone can view book covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

CREATE POLICY "Authors can upload book covers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'book-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
