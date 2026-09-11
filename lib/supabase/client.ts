import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnySupabaseDatabase } from "@/types/supabase";
import { getSupabaseCookieOptions } from "./cookie-options";

type AppSupabaseClient = SupabaseClient<AnySupabaseDatabase>;

let browserClient: AppSupabaseClient | null = null;

export function createClient(): AppSupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL nao configurada.");
  }

  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY nao configurada.");
  }

  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient<AnySupabaseDatabase>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: getSupabaseCookieOptions(
        typeof window === "undefined" ? undefined : window.location.hostname
      ),
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
      },
    }
  );

  return browserClient;
}
