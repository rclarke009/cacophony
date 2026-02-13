-- Add server_id to invites for server-specific invite links
-- Existing invites keep server_id NULL (platform signup only)
-- New server invites will have server_id set

ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS server_id uuid REFERENCES public.servers(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_invites_server_id ON public.invites(server_id);
