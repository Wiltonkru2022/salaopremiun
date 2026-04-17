import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getResumoAssinatura } from "@/lib/assinatura-utils";

const DOMINIO_RAIZ = "salaopremiun.com.br";
const DOMINIO_PAINEL = "painel.salaopremiun.com.br";
const DOMINIO_APP = "app.salaopremiun.com.br";

const PAINEL_PREFIXES = [
  "/dashboard",
  "/agenda",
  "/clientes",
  "/profissionais",
  "/servicos",
  "/produtos",
  "/estoque",
  "/comandas",
  "/vendas",
  "/caixa",
  "/comissoes",
  "/financeiro",
  "/relatorio_financeiro",
  "/relatorios",
  "/marketing",
  "/meu-plano",
  "/perfil-salao",
  "/configuracoes",
];

const ROTAS_LIBERADAS = [
  "/login",
  "/assinatura",
  "/api/assinatura/iniciar-trial",
  "/api/assinatura/criar-cobranca",
  "/api/webhooks/asaas",
  "/api/assinatura/historico",
];

function isPainelRoute(pathname: string) {
  return PAINEL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isRotaLiberada(pathname: string) {
  return ROTAS_LIBERADAS.some((rota) => pathname.startsWith(rota));
}

function isArquivoPublico(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/fonts") ||
    /\.(.*)$/.test(pathname)
  );
}

function buildAbsoluteUrl(request: NextRequest, host: string, pathname: string) {
  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.host = host;
  url.pathname = pathname;
  url.search = "";
  return url;
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;
  const host = request.headers.get("host")?.toLowerCase() ?? "";

  const rotaPainel = isPainelRoute(pathname);
  const rotaLiberada = isRotaLiberada(pathname);
  const rotaLogin = pathname === "/login";
  const rotaAssinatura = pathname.startsWith("/assinatura");

  // =========================
  // APP DO PROFISSIONAL
  // =========================
  if (host === DOMINIO_APP) {
    if (!isArquivoPublico(pathname) && !pathname.startsWith("/app-profissional")) {
      url.pathname =
        pathname === "/"
          ? "/app-profissional"
          : `/app-profissional${pathname}`;
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // =========================
  // SITE PRINCIPAL
  // =========================
  if (host === DOMINIO_RAIZ) {
    // Se tentarem acessar rotas do painel pelo domínio principal,
    // manda para o subdomínio do painel.
    if (rotaPainel || rotaLogin || rotaAssinatura) {
      const redirectUrl = buildAbsoluteUrl(request, DOMINIO_PAINEL, pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  }

  // =========================
  // PAINEL
  // =========================
  if (host === DOMINIO_PAINEL) {
    // raiz do painel -> login
    if (pathname === "/") {
      const redirectUrl = buildAbsoluteUrl(request, DOMINIO_PAINEL, "/login");
      return NextResponse.redirect(redirectUrl);
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Se não for rota protegida/liberada do painel, libera.
  if (!rotaPainel && !rotaLiberada) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Não logado -> login
  if ((rotaPainel || rotaAssinatura) && !user) {
    const redirectUrl = buildAbsoluteUrl(request, DOMINIO_PAINEL, "/login");
    return NextResponse.redirect(redirectUrl);
  }

  if (!user) return response;

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id_salao")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError) {
    console.error("Erro proxy usuário:", usuarioError);
    return response;
  }

  const idSalao = usuario?.id_salao;

  // Sem salão -> assinatura
  if (!idSalao) {
    if (rotaPainel) {
      const redirectUrl = buildAbsoluteUrl(request, DOMINIO_PAINEL, "/assinatura");
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  const { data: assinatura, error: assinaturaError } = await supabase
    .from("assinaturas")
    .select(`
      status,
      vencimento_em,
      trial_fim_em
    `)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (assinaturaError) {
    console.error("Erro proxy assinatura:", assinaturaError);
    return response;
  }

  // Nunca teve assinatura
  if (!assinatura) {
    if (rotaPainel) {
      const redirectUrl = buildAbsoluteUrl(request, DOMINIO_PAINEL, "/assinatura");
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  const resumo = getResumoAssinatura({
    status: assinatura.status,
    vencimentoEm: assinatura.vencimento_em,
    trialFimEm: assinatura.trial_fim_em,
  });

  // Login -> dashboard ou assinatura
  if (rotaLogin) {
    const redirectUrl = buildAbsoluteUrl(
      request,
      DOMINIO_PAINEL,
      resumo.bloqueioTotal ? "/assinatura" : "/dashboard"
    );
    return NextResponse.redirect(redirectUrl);
  }

  // Bloqueio forte do sistema
  if (rotaPainel && resumo.bloqueioTotal) {
    const redirectUrl = buildAbsoluteUrl(request, DOMINIO_PAINEL, "/assinatura");
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};