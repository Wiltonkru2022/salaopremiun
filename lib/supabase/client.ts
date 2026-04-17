import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseCookieOptions } from "./cookie-options";

let browserClient: SupabaseClient | null = null;

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  }

  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada.");
  }

  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: getSupabaseCookieOptions(
      typeof window === "undefined" ? undefined : window.location.hostname
    ),
    auth: {
      flowType: "pkce",
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
