-- Add theme_preference to profiles for cross-device sync
-- Existing rows default to 'dark'

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'dark'
  CHECK (theme_preference IN ('dark', 'retro'));
