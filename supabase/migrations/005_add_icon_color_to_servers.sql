-- Add icon_color to servers for simple color-based server icons
ALTER TABLE public.servers
  ADD COLUMN IF NOT EXISTS icon_color text;
