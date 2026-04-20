import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

export function getProxySupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function createProxySupabaseClient(params: {
  request: NextRequest;
  response: NextResponse;
  host: string;
}) {
  const config = getProxySupabaseConfig();
  if (!config) return null;

  const supabaseCookieOptions = getSupabaseCookieOptions(params.host);

  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookieOptions: supabaseCookieOptions,
    cookies: {
      getAll() {
        return params.request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          params.response.cookies.set(name, value, {
            ...options,
            ...supabaseCookieOptions,
          });
        });
      },
    },
  });
}
