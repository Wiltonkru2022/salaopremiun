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

  const client = createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookieOptions: supabaseCookieOptions,
    cookies: {
      getAll() {
        return params.request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Propaga o token renovado para o request corrente e para o navegador.
        // Assim Server Components paralelos nao tentam renovar o mesmo refresh token.
        cookiesToSet.forEach(({ name, value }) => {
          params.request.cookies.set(name, value);
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          params.response.cookies.set(name, value, {
            ...options,
            ...supabaseCookieOptions,
          });
        });
      },
    },
  });

  // proxy.ts usa apenas user.id. Fazer getUser() aqui gerava uma chamada remota
  // ao Auth em praticamente toda navegacao. Validamos a identidade por getClaims(),
  // conforme o fluxo SSR atual do Supabase, preservando a interface esperada pelo proxy.
  const getClaims = client.auth.getClaims.bind(client.auth);
  client.auth.getUser = (async () => {
    const { data, error } = await getClaims();
    const sub = data?.claims?.sub;

    return {
      data: {
        user: sub ? ({ id: String(sub) } as any) : null,
      },
      error,
    } as any;
  }) as typeof client.auth.getUser;

  return client;
}
