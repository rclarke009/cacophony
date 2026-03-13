-- Index for fast joins from messages to attachments at scale
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON public.attachments(message_id);
