-- ============================================================
-- MIGRATION: Community Posts — Author Posts, Polls, Notifications
-- ============================================================

-- 1. author_posts table
CREATE TABLE IF NOT EXISTS public.author_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type   text NOT NULL CHECK (post_type IN ('text', 'image', 'poll')),
  content     text,
  image_url   text,
  poll_duration_days integer DEFAULT 7,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.author_posts ENABLE ROW LEVEL SECURITY;

-- 2. poll_options table
CREATE TABLE IF NOT EXISTS public.poll_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.author_posts(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  vote_count  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

-- 3. poll_votes table
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.author_posts(id) ON DELETE CASCADE,
  option_id   uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- 4. Extend notifications table with community post fields (non-breaking, nullable)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS actor_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entity_id uuid;

-- 5. Allow service_role (Edge Function) to insert notifications for followers
--    We use a SECURITY DEFINER function so the Edge Function can call it via RPC
CREATE OR REPLACE FUNCTION public.insert_community_notification(
  p_user_id   uuid,
  p_actor_id  uuid,
  p_type      text,
  p_entity_id uuid,
  p_title     text,
  p_message   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, entity_id, title, message)
  VALUES (p_user_id, p_actor_id, p_type, p_entity_id, p_title, p_message);
END;
$$;

-- ============================================================
-- RLS POLICIES — author_posts
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view author posts" ON public.author_posts;
CREATE POLICY "Anyone can view author posts"
  ON public.author_posts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authors can create own posts" ON public.author_posts;
CREATE POLICY "Authors can create own posts"
  ON public.author_posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update own posts" ON public.author_posts;
CREATE POLICY "Authors can update own posts"
  ON public.author_posts FOR UPDATE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete own posts" ON public.author_posts;
CREATE POLICY "Authors can delete own posts"
  ON public.author_posts FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================================
-- RLS POLICIES — poll_options
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view poll options" ON public.poll_options;
CREATE POLICY "Anyone can view poll options"
  ON public.poll_options FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authors can insert poll options" ON public.poll_options;
CREATE POLICY "Authors can insert poll options"
  ON public.poll_options FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.author_posts
      WHERE id = post_id AND author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authors can update own poll options" ON public.poll_options;
CREATE POLICY "Authors can update own poll options"
  ON public.poll_options FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.author_posts
      WHERE id = post_id AND author_id = auth.uid()
    )
  );

-- System can increment vote_count (called via RPC)
DROP POLICY IF EXISTS "System can update vote counts" ON public.poll_options;
CREATE POLICY "System can update vote counts"
  ON public.poll_options FOR UPDATE
  USING (true);

-- ============================================================
-- RLS POLICIES — poll_votes
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view poll votes" ON public.poll_votes;
CREATE POLICY "Anyone can view poll votes"
  ON public.poll_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Logged in users can vote once" ON public.poll_votes;
CREATE POLICY "Logged in users can vote once"
  ON public.poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- FUNCTION: cast_poll_vote — atomic vote + increment
-- ============================================================

CREATE OR REPLACE FUNCTION public.cast_poll_vote(
  p_post_id   uuid,
  p_option_id uuid,
  p_user_id   uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert vote (will raise unique constraint if already voted)
  INSERT INTO public.poll_votes (post_id, option_id, user_id)
  VALUES (p_post_id, p_option_id, p_user_id);

  -- Atomically increment vote_count on the chosen option
  UPDATE public.poll_options
  SET vote_count = vote_count + 1
  WHERE id = p_option_id AND post_id = p_post_id;
END;
$$;

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_author_posts_author_id    ON public.author_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_author_posts_created_at   ON public.author_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poll_options_post_id      ON public.poll_options(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_post_id        ON public.poll_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id        ON public.poll_votes(user_id);

-- ============================================================
-- Enable realtime for live vote updates
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.author_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;

-- ============================================================
-- Storage: post-images bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-images',
  'post-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Public read post images" ON storage.objects;
CREATE POLICY "Public read post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

-- Authenticated upload
DROP POLICY IF EXISTS "Authors upload post images" ON storage.objects;
CREATE POLICY "Authors upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);

-- Author delete own uploads
DROP POLICY IF EXISTS "Authors delete own post images" ON storage.objects;
CREATE POLICY "Authors delete own post images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
