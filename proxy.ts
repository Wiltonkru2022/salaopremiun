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
  const currentHost = request.headers.get("host")?.toLowerCase() ?? "";
  const currentPath = request.nextUrl.pathname;
  const currentSearch = request.nextUrl.search;

  if (currentHost === host && currentPath === pathname) {
    return NextResponse.next();
  }

  return NextResponse.redirect(
    buildAbsoluteUrl(request, host, pathname, currentSearch)
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

  const isRootHost = host === DOMINIO_RAIZ || host === DOMINIO_WWW;
  const isPainelHost = host === DOMINIO_PAINEL;
  const isAppHost = host === DOMINIO_APP;
  const isLoginHost = host === DOMINIO_LOGIN;
  const isCadastroHost = host === DOMINIO_CADASTRO;
  const isAssinaturaHost = host === DOMINIO_ASSINATURA;

  // =========================
  // APP DO PROFISSIONAL
  // =========================
  if (isAppHost) {
    if (
      !isArquivoPublico(pathname) &&
      !pathname.startsWith("/app-profissional")
    ) {
      url.pathname =
        pathname === "/"
          ? "/app-profissional"
          : `/app-profissional${pathname}`;
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // =========================
  // SITE PRINCIPAL / WWW
  // =========================
  if (isRootHost) {
    if (rotaLogin) {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }

    if (rotaAssinatura) {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
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
  // LOGIN
  // =========================
  if (isLoginHost) {
    if (pathname === "/") {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }

    if (!rotaLogin) {
      if (rotaPainel) {
        return redirectToHost(request, DOMINIO_PAINEL, pathname);
      }

      if (rotaAssinatura) {
        return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
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
  if (isCadastroHost) {
    if (pathname === "/") {
      return redirectToHost(request, DOMINIO_CADASTRO, "/cadastro");
    }

    if (!rotaCadastro) {
      if (rotaLogin) {
        return redirectToHost(request, DOMINIO_LOGIN, "/login");
      }

      if (rotaAssinatura) {
        return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
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
  if (isAssinaturaHost) {
    if (pathname === "/") {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }

    if (!rotaAssinatura) {
      if (rotaLogin) {
        return redirectToHost(request, DOMINIO_LOGIN, "/login");
      }

      if (rotaCadastro) {
        return redirectToHost(request, DOMINIO_CADASTRO, pathname);
      }

      if (rotaPainel) {
        return redirectToHost(request, DOMINIO_PAINEL, pathname);
      }

      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }
  }

  // =========================
  // PAINEL
  // =========================
  if (isPainelHost) {
    if (pathname === "/") {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }

    if (rotaLogin) {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }

    if (rotaAssinatura) {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
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

  // Não logado tentando entrar no painel -> login
  if (rotaPainel && !user) {
    if (!isLoginHost) {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }
    return response;
  }

  // Não logado tentando assinatura -> assinatura
  if (rotaAssinatura && !user) {
    if (!isAssinaturaHost) {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }
    return response;
  }

  // Não logado na tela de login
  if (rotaLogin && !user) {
    if (!isLoginHost) {
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
    if (rotaPainel || rotaLogin) {
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

  // Logado tentando abrir login
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};