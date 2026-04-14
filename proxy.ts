import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getResumoAssinatura } from "@/lib/assinatura-utils";

const PAINEL_PREFIXES = [
  "/dashboard",
  "/agenda",
  "/clientes",
  "/profissionais",
  "/servicos",
  "/produtos",
  "/estoque",
  "/vendas",
  "/caixa",
  "/comissoes",
  "/financeiro",
  "/relatorios",
  "/marketing",
  "/configuracoes",
];

const ROTAS_LIBERADAS = [
  "/login",
  "/assinatura",
  "/api/assinatura/iniciar-trial",
  "/api/assinatura/criar-cobranca",
  "/api/assinatura/historico",
  "/api/assinatura/toggle-renovacao",
  "/api/webhooks/asaas",
];

function isPainelRoute(pathname: string) {
  return PAINEL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isRotaLiberada(pathname: string) {
  return ROTAS_LIBERADAS.some((rota) => pathname.startsWith(rota));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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

  const rotaPainel = isPainelRoute(pathname);
  const rotaLiberada = isRotaLiberada(pathname);
  const rotaLogin = pathname === "/login";
  const rotaAssinatura = pathname.startsWith("/assinatura");
  const rotaConfiguracoes = pathname.startsWith("/configuracoes");

  if (!rotaPainel && !rotaLiberada) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if ((rotaPainel || rotaAssinatura) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!user) {
    return response;
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id_salao")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError) {
    console.error("Erro ao buscar usuário no proxy:", usuarioError);
    return response;
  }

  const idSalao = usuario?.id_salao;

  if (!idSalao) {
    if (rotaPainel) {
      const url = request.nextUrl.clone();
      url.pathname = "/assinatura";
      return NextResponse.redirect(url);
    }

    return response;
  }

  const { data: assinatura, error: assinaturaError } = await supabase
    .from("assinaturas")
    .select("status, vencimento_em, trial_fim_em")
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (assinaturaError) {
    console.error("Erro ao buscar assinatura no proxy:", assinaturaError);
    return response;
  }

  if (!assinatura) {
    if (rotaLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/assinatura";
      return NextResponse.redirect(url);
    }

    if (rotaPainel && !rotaConfiguracoes) {
      const url = request.nextUrl.clone();
      url.pathname = "/assinatura";
      return NextResponse.redirect(url);
    }

    return response;
  }

  const resumo = getResumoAssinatura({
    status: assinatura.status,
    vencimentoEm: assinatura.vencimento_em,
    trialFimEm: assinatura.trial_fim_em,
  });

  if (rotaLogin) {
    const url = request.nextUrl.clone();
    url.pathname = resumo.bloqueioTotal ? "/assinatura" : "/dashboard";
    return NextResponse.redirect(url);
  }

  if (rotaPainel && resumo.bloqueioTotal && !rotaConfiguracoes) {
    const url = request.nextUrl.clone();
    url.pathname = "/assinatura";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/login",
    "/assinatura/:path*",
    "/dashboard/:path*",
    "/agenda/:path*",
    "/clientes/:path*",
    "/profissionais/:path*",
    "/servicos/:path*",
    "/produtos/:path*",
    "/estoque/:path*",
    "/vendas/:path*",
    "/caixa/:path*",
    "/comissoes/:path*",
    "/financeiro/:path*",
    "/relatorios/:path*",
    "/marketing/:path*",
    "/configuracoes/:path*",
    "/api/assinatura/iniciar-trial",
    "/api/assinatura/criar-cobranca",
    "/api/assinatura/historico",
    "/api/assinatura/toggle-renovacao",
    "/api/webhooks/asaas",
  ],
};