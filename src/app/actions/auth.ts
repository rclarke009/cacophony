"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function signIn(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.log("MYDEBUG →", { code: error.code, message: error.message });
    }
    return { error: error.message };
  }

  redirect("/");
}

export async function signUp(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = (formData.get("username") as string) || undefined;
  const inviteCode = (formData.get("invite_code") as string)?.trim();

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  if (!inviteCode) {
    return { error: "You need an invite code to sign up." };
  }

  const admin = createAdminClient();
  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .select("id, code, max_uses, uses, expires_at, server_id")
    .eq("code", inviteCode)
    .single();

  if (inviteError || !invite) {
    return { error: "Invalid or expired invite code. You need a valid invite to sign up." };
  }

  if (invite.uses >= invite.max_uses) {
    return { error: "This invite code has already been used." };
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { error: "This invite code has expired." };
  }

  const supabase = await createClient();
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: username ? { data: { username } } : undefined,
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  if (authData.user) {
    await admin.from("invites").update({
      used_by_user_id: authData.user.id,
      used_at: new Date().toISOString(),
      uses: invite.uses + 1,
    }).eq("id", invite.id);

    if (invite.server_id) {
      await admin.from("server_members").insert({
        server_id: invite.server_id,
        user_id: authData.user.id,
        role: "member",
      });
    }
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(
  prevState: { error?: string; success?: string } | null,
  formData: FormData
) {
  const email = (formData.get("email") as string)?.trim();
  if (!email) {
    return { error: "Email is required" };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const redirectTo = `${baseUrl}/reset-password`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return { error: error.message };
  }
  return { success: "If an account exists for that email, we sent a reset link." };
}

export async function updatePassword(
  prevState: { error?: string; success?: string } | null,
  formData: FormData
) {
  const password = formData.get("password") as string;
  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }
  redirect("/login?reset=success");
}
