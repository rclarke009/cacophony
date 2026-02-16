-- Drop anon upload policy (no longer needed; server uploads with service role)
-- Safe to run even if policy was never added
DROP POLICY IF EXISTS "Anon can upload via signed URL to attachments" ON storage.objects;
