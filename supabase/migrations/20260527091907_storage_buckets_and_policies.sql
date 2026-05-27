-- ============================================
-- MIGRATION 7: Storage Buckets & Policies
-- ============================================

-- Avatars bucket (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Book manuscripts bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('book-manuscripts', 'book-manuscripts', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authors can upload manuscripts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'book-manuscripts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authors can view their own manuscripts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-manuscripts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all manuscripts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-manuscripts' AND public.has_role(auth.uid(), 'admin'));

-- Book covers bucket (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('book-covers', 'book-covers', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view book covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

CREATE POLICY "Authors can upload book covers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'book-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
