-- Create drawings storage bucket and policies
-- This migration creates the drawings bucket and necessary RLS policies

-- Create the drawings bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'drawings',
  'drawings',
  true, -- Set to public for direct URL access
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the drawings bucket
-- Policy: Allow authenticated users to upload drawings to their own folder
-- File path structure: gameId/userId/timestamp.png
CREATE POLICY "Users can upload drawings to own folder" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'drawings'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy: Allow authenticated users to view their own drawings
CREATE POLICY "Users can view own drawings" ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'drawings'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy: Allow authenticated users to update their own drawings
CREATE POLICY "Users can update own drawings" ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'drawings'
  AND auth.uid()::text = (storage.foldername(name))[2]
)
WITH CHECK (
  bucket_id = 'drawings'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy: Allow authenticated users to delete their own drawings
CREATE POLICY "Users can delete own drawings" ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'drawings'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy: Allow game participants to view drawings in their games
-- This allows users to see drawings from other players in the same game during voting
-- File path structure: gameId/userId/timestamp.png
CREATE POLICY "Game participants can view game drawings" ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'drawings'
  AND EXISTS (
    SELECT 1 FROM game_participants gp1
    JOIN game_participants gp2 ON gp1.game_id = gp2.game_id
    WHERE gp1.user_id = auth.uid()
    AND gp2.user_id::text = (storage.foldername(name))[2]
    AND (storage.foldername(name))[1] = gp1.game_id::text
  )
);

-- Policy: Allow authenticated users to view the drawings bucket
CREATE POLICY "Allow access to drawings bucket" ON storage.buckets
FOR SELECT 
TO authenticated
USING (id = 'drawings');
