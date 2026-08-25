import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

const PROXY_FETCH_TIMEOUT_MS = 2500;

function proxyFetch(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_FETCH_TIMEOUT_MS);
  const upstreamSignal = init?.signal;

  if (upstreamSignal) {
    if (upstreamSignal.aborted) controller.abort();
    else upstreamSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

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
    global: {
      fetch: proxyFetch,
    },
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
    try {
      const { data, error } = await getClaims();
      const sub = data?.claims?.sub;

      return {
        data: {
          user: sub ? ({ id: String(sub) } as any) : null,
        },
        error,
      } as any;
    } catch (error) {
      console.error("Proxy Supabase auth timeout/failure:", error);
      return {
        data: { user: null },
        error: error instanceof Error ? error : new Error("Falha ao validar sessão no proxy."),
      } as any;
    }
  }) as typeof client.auth.getUser;

  return client;
}
