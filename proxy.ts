import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getResumoAssinatura } from "@/lib/assinatura-utils";

const DOMINIO_RAIZ = "salaopremiun.com.br";
const DOMINIO_WWW = "www.salaopremiun.com.br";
const DOMINIO_PAINEL = "painel.salaopremiun.com.br";
const DOMINIO_APP = "app.salaopremiun.com.br";
const DOMINIO_LOGIN = "login.salaopremiun.com.br";
const DOMINIO_CADASTRO = "cadastro.salaopremiun.com.br";
const DOMINIO_ASSINATURA = "assinatura.salaopremiun.com.br";

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

const CADASTRO_PREFIXES = [
  "/cadastro",
  "/criar-conta",
  "/registro",
  "/signup",
];

function isPainelRoute(pathname: string) {
  return PAINEL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isRotaLiberada(pathname: string) {
  return ROTAS_LIBERADAS.some((rota) => pathname.startsWith(rota));
}

function isCadastroRoute(pathname: string) {
  return CADASTRO_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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

function buildAbsoluteUrl(
  request: NextRequest,
  host: string,
  pathname: string,
  search = ""
) {
  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.host = host;
  url.pathname = pathname;
  url.search = search;
  return url;
}

function redirectToHost(
  request: NextRequest,
  host: string,
  pathname: string
) {
  return NextResponse.redirect(
    buildAbsoluteUrl(request, host, pathname, request.nextUrl.search)
  );
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;
  const host = request.headers.get("host")?.toLowerCase() ?? "";

  const rotaPainel = isPainelRoute(pathname);
  const rotaLiberada = isRotaLiberada(pathname);
  const rotaLogin = pathname === "/login";
  const rotaAssinatura = pathname.startsWith("/assinatura");
  const rotaCadastro = isCadastroRoute(pathname);

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
  // LOGIN
  // =========================
  if (host === DOMINIO_LOGIN) {
    if (pathname === "/") {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }

    if (pathname !== "/login") {
      if (rotaPainel) {
        return redirectToHost(request, DOMINIO_PAINEL, pathname);
      }

      if (rotaAssinatura) {
        return redirectToHost(request, DOMINIO_ASSINATURA, pathname);
      }

      if (rotaCadastro) {
        return redirectToHost(request, DOMINIO_CADASTRO, pathname);
      }

      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }
  }

  // =========================
  // CADASTRO
  // =========================
  if (host === DOMINIO_CADASTRO) {
    if (pathname === "/") {
      return redirectToHost(request, DOMINIO_CADASTRO, "/cadastro");
    }

    if (!rotaCadastro) {
      if (rotaLogin) {
        return redirectToHost(request, DOMINIO_LOGIN, "/login");
      }

      if (rotaAssinatura) {
        return redirectToHost(request, DOMINIO_ASSINATURA, pathname);
      }

      if (rotaPainel) {
        return redirectToHost(request, DOMINIO_PAINEL, pathname);
      }

      return redirectToHost(request, DOMINIO_CADASTRO, "/cadastro");
    }
  }

  // =========================
  // ASSINATURA
  // =========================
  if (host === DOMINIO_ASSINATURA) {
    if (pathname === "/") {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }

    if (!rotaAssinatura) {
      if (rotaLogin) {
        return redirectToHost(request, DOMINIO_LOGIN, "/login");
      }

      if (rotaPainel) {
        return redirectToHost(request, DOMINIO_PAINEL, pathname);
      }

      if (rotaCadastro) {
        return redirectToHost(request, DOMINIO_CADASTRO, pathname);
      }

      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }
  }

  // =========================
  // SITE PRINCIPAL / WWW
  // =========================
  if (host === DOMINIO_RAIZ || host === DOMINIO_WWW) {
    if (rotaLogin) {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }

    if (rotaAssinatura) {
      return redirectToHost(request, DOMINIO_ASSINATURA, pathname);
    }

    if (rotaCadastro) {
      return redirectToHost(request, DOMINIO_CADASTRO, pathname);
    }

    if (rotaPainel) {
      return redirectToHost(request, DOMINIO_PAINEL, pathname);
    }

    return NextResponse.next();
  }

  // =========================
  // PAINEL
  // =========================
  if (host === DOMINIO_PAINEL) {
    if (pathname === "/") {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }

    if (rotaLogin) {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }

    if (rotaAssinatura) {
      return redirectToHost(request, DOMINIO_ASSINATURA, pathname);
    }

    if (rotaCadastro) {
      return redirectToHost(request, DOMINIO_CADASTRO, pathname);
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

  if (!rotaPainel && !rotaLiberada && !rotaLogin) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Não logado -> login sempre no subdomínio de login
  if ((rotaPainel || rotaAssinatura) && !user) {
    return redirectToHost(request, DOMINIO_LOGIN, "/login");
  }

  // Tela de login
  if (rotaLogin && !user) {
    // se estiver em outro host, força login.salaopremiun.com.br
    if (host !== DOMINIO_LOGIN) {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }
    return response;
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

  if (!idSalao) {
    if (rotaPainel) {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }

    if (rotaLogin) {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
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

  if (!assinatura) {
    if (rotaPainel || rotaLogin) {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }
    return response;
  }

  const resumo = getResumoAssinatura({
    status: assinatura.status,
    vencimentoEm: assinatura.vencimento_em,
    trialFimEm: assinatura.trial_fim_em,
  });

  // Usuário logado tentando abrir login
  if (rotaLogin) {
    return redirectToHost(
      request,
      resumo.bloqueioTotal ? DOMINIO_ASSINATURA : DOMINIO_PAINEL,
      resumo.bloqueioTotal ? "/assinatura" : "/dashboard"
    );
  }

  if (rotaPainel && resumo.bloqueioTotal) {
    return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};