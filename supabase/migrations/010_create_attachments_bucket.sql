-- Create attachments storage bucket for message image uploads
-- Private bucket; use signed URLs for reading (see message-list and channel page)
-- Run via Dashboard if this fails: Storage → New bucket → attachments, private

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to attachments (app enforces channel membership)
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to read from attachments (for signed URLs in channels they belong to)
CREATE POLICY "Authenticated users can read attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'attachments');
