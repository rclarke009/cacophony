-- Create server-icons storage bucket for custom server icon uploads
-- Public bucket so icon URLs work in img tags
-- Run via Dashboard if this fails: Storage → New bucket → server-icons, public
INSERT INTO storage.buckets (id, name, public)
VALUES ('server-icons', 'server-icons', true)
ON CONFLICT (id) DO NOTHING;
