import { createClient } from "@supabase/supabase-js";

/**
 * Server-side only. Uses service role to bypass RLS.
 * Use for: invite validation, admin operations.
 * NEVER expose this client to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local for server-side operations."
    );
  }

  return createClient(url, key);
}
