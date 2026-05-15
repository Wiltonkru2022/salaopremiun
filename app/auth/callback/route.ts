import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildSecurityBlockPath,
  buildSecurityVerificationPath,
  getSecurityAccessDecision,
} from "@/lib/security/user-security";
import { emitSecurityEvent } from "@/lib/security/security-events";

export const dynamic = "force-dynamic";

function sanitizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard?boot=1";
  }
  return value;
}

function getRedirectOrigin(nextPath: string, fallbackOrigin: string) {
  if (nextPath === "/assinatura" || nextPath.startsWith("/assinatura")) {
    return "https://assinatura.salaopremiun.com.br";
  }

  if (
    nextPath === "/dashboard" ||
    nextPath.startsWith("/dashboard") ||
    nextPath === "/agenda" ||
    nextPath.startsWith("/agenda") ||
    nextPath === "/perfil-salao" ||
    nextPath.startsWith("/perfil-salao") ||
    nextPath === "/meu-plano" ||
    nextPath.startsWith("/meu-plano")
  ) {
    return "https://painel.salaopremiun.com.br";
  }

  return fallbackOrigin;
}

function redirectToLogin(requestUrl: URL, erro: string) {
  return NextResponse.redirect(
    new URL(`/login?erro=${encodeURIComponent(erro)}`, requestUrl.origin)
  );
}

function buildRedirectBridge(targetUrl: URL) {
  const href = targetUrl.toString();
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="1;url=${href}" />
    <title>Entrando no painel | SalãoPremium</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#09090b;font-family:Inter,Arial,sans-serif}
      main{max-width:420px;padding:32px;text-align:center}
      .logo{width:56px;height:56px;margin:0 auto 18px;border-radius:18px;background:#09090b;color:#d8b76a;display:grid;place-items:center;font-size:26px;font-weight:900}
      h1{font-size:24px;margin:0 0 10px;font-weight:900}
      p{margin:0;color:#52525b;line-height:1.6}
      a{color:#09090b;font-weight:800}
    </style>
  </head>
  <body>
    <main>
      <div class="logo">✦</div>
      <h1>Login confirmado</h1>
      <p>Estamos abrindo seu painel automaticamente. Se não abrir, <a href="${href}">clique aqui</a>.</p>
      <script>setTimeout(function(){ window.location.replace(${JSON.stringify(href)}); }, 600);</script>
    </main>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function unlinkCurrentGoogleIdentity(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  user: { identities?: Array<{ provider?: string; identity_id?: string }> | null }
) {
  const googleIdentity = user.identities?.find(
    (identity) => String(identity.provider || "").toLowerCase() === "google"
  );

  if (!googleIdentity?.identity_id) return;

  await supabase.auth.unlinkIdentity(googleIdentity as any).catch(() => null);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return redirectToLogin(requestUrl, "google_codigo_ausente");
  }

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return redirectToLogin(requestUrl, "google_indisponivel");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: getSupabaseCookieOptions(requestUrl.host),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, {
            ...options,
            ...getSupabaseCookieOptions(requestUrl.host),
          });
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectToLogin(requestUrl, "google_sessao_invalida");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.trim().toLowerCase() || "";

  if (!user || !email) {
    await supabase.auth.signOut();
    return redirectToLogin(requestUrl, "google_sessao_invalida");
  }

  const admin = getSupabaseAdmin();
  const { data: usuarios } = await admin
    .from("usuarios")
    .select("id, id_salao, email, auth_user_id, status")
    .or(`auth_user_id.eq.${user.id},email.eq.${email}`)
    .limit(5);

  const usuario = (usuarios || []).find((item) => item.auth_user_id === user.id);

  if (!usuario?.id_salao || String(usuario.status || "").toLowerCase() !== "ativo") {
    await unlinkCurrentGoogleIdentity(supabase as any, user);
    await supabase.auth.signOut();
    return redirectToLogin(requestUrl, "google_nao_vinculado");
  }

  if (String(usuario.email || "").trim().toLowerCase() !== email) {
    await unlinkCurrentGoogleIdentity(supabase as any, user);
    await supabase.auth.signOut();
    return redirectToLogin(requestUrl, "google_nao_vinculado");
  }

  const securityDecision = await getSecurityAccessDecision({
    tipoUsuario: "salao",
    userId: usuario.id,
    idSalao: usuario.id_salao,
  });

  if (!securityDecision.allowed) {
    await supabase.auth.signOut();

    const blockedPath = securityDecision.verificacaoNecessaria
      ? buildSecurityVerificationPath({
          tipoUsuario: "salao",
          motivo: securityDecision.motivo || null,
          origem: "google_callback",
          returnTo: next,
        })
      : buildSecurityBlockPath({
          tipoUsuario: "salao",
          motivo: securityDecision.motivo || null,
          origem: "google_callback",
          returnTo: next,
        });

    return buildRedirectBridge(
      new URL(blockedPath, getRedirectOrigin(next, requestUrl.origin))
    );
  }

  void emitSecurityEvent({
    evento: "google_login_sucesso",
    tipoUsuario: "salao",
    userId: usuario.id,
    idSalao: usuario.id_salao,
    risco: "baixo",
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null,
    userAgent: request.headers.get("user-agent") || null,
    origem: "google-login",
    route: "/auth/callback",
    detalhes: { email, next },
  });

  return buildRedirectBridge(
    new URL(next, getRedirectOrigin(next, requestUrl.origin))
  );
}
