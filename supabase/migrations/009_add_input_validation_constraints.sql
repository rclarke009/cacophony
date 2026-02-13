-- Add CHECK constraints for input validation (defense in depth)
-- Aligns with app-level validation in lib/validation.ts and server actions
-- Note: Ensure existing data complies before running (e.g. usernames <= 32 chars)

-- Profiles: username length (3-32 chars)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_length CHECK (
    username IS NULL OR (char_length(username) >= 3 AND char_length(username) <= 32)
  );

-- Servers: name length
ALTER TABLE public.servers
  ADD CONSTRAINT servers_name_length CHECK (char_length(name) <= 100);

-- Servers: icon_color hex format
ALTER TABLE public.servers
  ADD CONSTRAINT servers_icon_color_format CHECK (
    icon_color IS NULL OR icon_color ~ '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$'
  );

-- Servers: icon_emoji length (single emoji)
ALTER TABLE public.servers
  ADD CONSTRAINT servers_icon_emoji_length CHECK (
    icon_emoji IS NULL OR char_length(icon_emoji) <= 8
  );

-- Channels: name length
ALTER TABLE public.channels
  ADD CONSTRAINT channels_name_length CHECK (char_length(name) <= 100);

-- Messages: content length
ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_length CHECK (char_length(content) <= 4000);
