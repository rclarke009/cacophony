-- Add notification preference to profiles
-- popup: show toast/modal + badge | badge_only: badge only | none: check notifications center manually
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preference text
  DEFAULT 'popup'
  CHECK (notification_preference IN ('popup', 'badge_only', 'none'));
