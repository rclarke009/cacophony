/**
 * Shared limits for message and attachment validation.
 * Kept under Vercel's 4.5 MB request body limit.
 */

/** Max characters in message text (matches DB constraint). */
export const MAX_MESSAGE_CONTENT_LENGTH = 4000;

/** Max size per image file (bytes). Stay under Vercel's 4.5 MB body limit. */
export const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB

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
