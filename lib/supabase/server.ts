import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { AnySupabaseDatabase } from "@/types/supabase";
import { getSupabaseCookieOptions } from "./cookie-options";

export async function createClient() {
  const cookieStore = await cookies();
  const headersList = await headers();
  const cookieOptions = getSupabaseCookieOptions(headersList.get("host"));

  return createServerClient<AnySupabaseDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, ...cookieOptions })
            );
          } catch (error) {
            console.warn(
              "Supabase cookie set ignorado (ambiente server):",
              error
            );
          }
        },
      },
    }
  );
}
