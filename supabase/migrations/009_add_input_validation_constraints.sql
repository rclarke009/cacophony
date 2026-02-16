-- Add CHECK constraints for input validation (defense in depth)
-- Aligns with app-level validation in lib/validation.ts and server actions

-- Fix existing profiles data before adding username constraint
UPDATE public.profiles
SET username = CASE
  WHEN username IS NULL OR trim(username) = '' THEN NULL
  WHEN char_length(username) < 3 THEN NULL
  WHEN char_length(username) > 32 THEN left(username, 32)
  ELSE username
END
WHERE username IS NOT NULL AND (
  trim(username) = '' OR
  char_length(username) < 3 OR
  char_length(username) > 32
);

-- Profiles: username length (3-32 chars)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_username_length' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_length CHECK (
        username IS NULL OR (char_length(username) >= 3 AND char_length(username) <= 32)
      );
  END IF;
END $$;

-- Servers: name length
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'servers_name_length' AND conrelid = 'public.servers'::regclass
  ) THEN
    ALTER TABLE public.servers ADD CONSTRAINT servers_name_length CHECK (char_length(name) <= 100);
  END IF;
END $$;

-- Servers: icon_color hex format
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'servers_icon_color_format' AND conrelid = 'public.servers'::regclass
  ) THEN
    ALTER TABLE public.servers
      ADD CONSTRAINT servers_icon_color_format CHECK (
        icon_color IS NULL OR icon_color ~ '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$'
      );
  END IF;
END $$;

-- Servers: icon_emoji length (single emoji)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'servers_icon_emoji_length' AND conrelid = 'public.servers'::regclass
  ) THEN
    ALTER TABLE public.servers
      ADD CONSTRAINT servers_icon_emoji_length CHECK (
        icon_emoji IS NULL OR char_length(icon_emoji) <= 8
      );
  END IF;
END $$;

-- Channels: name length
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'channels_name_length' AND conrelid = 'public.channels'::regclass
  ) THEN
    ALTER TABLE public.channels ADD CONSTRAINT channels_name_length CHECK (char_length(name) <= 100);
  END IF;
END $$;

-- Messages: content length
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_content_length' AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_content_length CHECK (char_length(content) <= 4000);
  END IF;
END $$;
