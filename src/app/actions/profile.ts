"use server";

import { createClient } from "@/lib/supabase/server";

export type Theme = "dark" | "retro";

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
