-- Add icon_emoji to servers for emoji-based server icons (no storage required)
ALTER TABLE public.servers
  ADD COLUMN IF NOT EXISTS icon_emoji text;
