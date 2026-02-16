/**
 * Shared limits for message and attachment validation.
 * Files upload directly to Supabase (bypass Vercel), so limits can be raised if needed.
 */

/** Max characters in message text (matches DB constraint). */
export const MAX_MESSAGE_CONTENT_LENGTH = 4000;

/** Max size per image file (bytes). Server upload: 3 MB to stay under Vercel 4.5 MB limit. */
export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

/** Max total attachment size per message (bytes). */
export const MAX_TOTAL_ATTACHMENTS = 4 * 1024 * 1024; // 4 MB

/** Max number of images per message. */
export const MAX_IMAGES_PER_MESSAGE = 5;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
