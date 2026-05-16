-- Allow authenticated users to insert their own 'author' role
CREATE POLICY "Users can self-assign author role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'author'
);