"use server";

import { createClient } from "@/lib/supabase/server";

export type Theme = "dark" | "retro";

const MAX_USERNAME_LENGTH = 32;

export async function updateProfile(
  prevState: { error?: string; success?: string } | null,
  formData: FormData
) {
  const username = (formData.get("username") as string)?.trim();
  const themePreference = formData.get("theme_preference") as Theme | null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to update your profile" };
  }

  const updates: { username?: string | null; theme_preference?: Theme; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (username !== undefined && username !== null) {
    if (username.length > 0 && username.length < 3) {
      return { error: "Username must be at least 3 characters" };
    }
    if (username.length > MAX_USERNAME_LENGTH) {
      return { error: `Username must be ${MAX_USERNAME_LENGTH} characters or less` };
    }
    updates.username = username || null;
  }

  if (themePreference === "dark" || themePreference === "retro") {
    updates.theme_preference = themePreference;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That username is already taken" };
    }
    return { error: error.message };
  }

  return { success: "Profile updated" };
}

export type NotificationPreference = "popup" | "badge_only" | "none";

export async function updateNotificationPreference(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData
) {
  const preference = formData.get("notification_preference") as
    | NotificationPreference
    | null;

  if (
    !preference ||
    !["popup", "badge_only", "none"].includes(preference)
  ) {
    return { error: "Invalid preference" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to update notification preference" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      notification_preference: preference,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: "Notification preference updated" };
}

export async function getNotificationPreference(): Promise<NotificationPreference | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("notification_preference")
    .eq("id", user.id)
    .single();

  const p = data?.notification_preference;
  return p === "popup" || p === "badge_only" || p === "none" ? p : "popup";
}

export async function updateThemePreference(theme: Theme) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to save theme preference" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      theme_preference: theme,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
