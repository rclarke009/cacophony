/**
 * Validation helpers for input security.
 */

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates hex color (#rgb or #rrggbb). Prevents CSS injection. */
export function isValidHexColor(value: string | null | undefined): boolean {
  if (value == null || value === "") return false;
  return HEX_COLOR_REGEX.test(value.trim());
}

/** Validates that value is a single emoji (one grapheme cluster). */
export function isSingleEmoji(value: string | null | undefined): boolean {
  if (value == null || value === "") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  const segments = [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(trimmed)];
  return segments.length === 1;
}

/** Validates UUID v4 format. */
export function isValidUUID(value: string | null | undefined): boolean {
  if (value == null || typeof value !== "string") return false;
  return UUID_REGEX.test(value.trim());
}
