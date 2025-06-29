-- Make drawings bucket public for direct URL access
-- This allows the voting screen to display images directly without authentication

-- Update the drawings bucket to be public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'drawings';
