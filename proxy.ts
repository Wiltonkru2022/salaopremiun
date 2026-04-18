import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getResumoAssinatura } from "@/lib/assinatura-utils";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

const DOMINIO_RAIZ = "salaopremiun.com.br";
const DOMINIO_WWW = "www.salaopremiun.com.br";
const DOMINIO_PAINEL = "painel.salaopremiun.com.br";
const DOMINIO_APP = "app.salaopremiun.com.br";
const DOMINIO_LOGIN = "login.salaopremiun.com.br";
const DOMINIO_CADASTRO = "cadastro.salaopremiun.com.br";
const DOMINIO_ASSINATURA = "assinatura.salaopremiun.com.br";

const CADASTRO_PATH = "/cadastro-salao";
const APP_PROFISSIONAL_PREFIX = "/app-profissional";
const ADMIN_MASTER_PREFIX = "/admin-master";

const DOMINIOS_SITE = [
  DOMINIO_RAIZ,
  DOMINIO_WWW,
];

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
  "/recuperar-senha",
  "/atualizar-senha",
  "/assinatura",
  "/api/assinatura/iniciar-trial",
  "/api/assinatura/criar-cobranca",
  "/api/assinatura/toggle-renovacao",
  "/api/webhooks/asaas",
  "/api/assinatura/historico",
];

const CADASTRO_PREFIXES = [
  CADASTRO_PATH,
  "/cadastro",
  "/criar-conta",
  "/registro",
  "/signup",
];

const LOGIN_PREFIXES = ["/login", "/recuperar-senha", "/atualizar-senha"];
const ADMIN_MASTER_PREFIXES = [ADMIN_MASTER_PREFIX];

function startsWithPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isPainelRoute(pathname: string) {
  return PAINEL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isRotaLiberada(pathname: string) {
  return startsWithPrefix(pathname, ROTAS_LIBERADAS);
}

function isCadastroRoute(pathname: string) {
  return startsWithPrefix(pathname, CADASTRO_PREFIXES);
}

function isLoginRoute(pathname: string) {
  return startsWithPrefix(pathname, LOGIN_PREFIXES);
}

function isApiRoute(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function isAdminMasterRoute(pathname: string) {
  return startsWithPrefix(pathname, ADMIN_MASTER_PREFIXES);
}

function isAppProfissionalRoute(pathname: string) {
  return (
    pathname === APP_PROFISSIONAL_PREFIX ||
    pathname.startsWith(`${APP_PROFISSIONAL_PREFIX}/`)
  );
}

function removeAppProfissionalPrefix(pathname: string) {
  if (pathname === APP_PROFISSIONAL_PREFIX) {
    return "/";
  }

  return pathname.replace(APP_PROFISSIONAL_PREFIX, "") || "/";
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

function normalizePathname(pathname: string) {
  const semLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  return semLocale;
}

function normalizeHost(host: string) {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

function getRequestHost(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0];
  return normalizeHost(forwardedHost ?? request.headers.get("host") ?? "");
}

function isSiteHost(host: string) {
  return DOMINIOS_SITE.includes(host);
}

function getCadastroPath(pathname: string) {
  return pathname === "/" || pathname === "/cadastro" ? CADASTRO_PATH : pathname;
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
  const currentHost = getRequestHost(request);
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
  const pathnameNormalizado = normalizePathname(pathname);
  const host = getRequestHost(request);
  const supabaseCookieOptions = getSupabaseCookieOptions(host);

  // APIs validate access in their own handlers. Redirecting them here turns
  // JSON/POST calls into HTML page redirects and breaks subdomain flows.
  if (isApiRoute(pathnameNormalizado)) {
    return NextResponse.next();
  }

  const rotaPainel = isPainelRoute(pathnameNormalizado);
  const rotaLiberada = isRotaLiberada(pathnameNormalizado);
  const rotaLogin = pathnameNormalizado === "/login";
  const rotaAutenticacao = isLoginRoute(pathnameNormalizado);
  const rotaAssinatura = pathnameNormalizado.startsWith("/assinatura");
  const rotaCadastro = isCadastroRoute(pathnameNormalizado);
  const rotaAppProfissional = isAppProfissionalRoute(pathnameNormalizado);
  const rotaAdminMaster = isAdminMasterRoute(pathnameNormalizado);

  const isRootHost = isSiteHost(host);
  const isPainelHost = host === DOMINIO_PAINEL;
  const isAppHost = host === DOMINIO_APP;
  const isLoginHost = host === DOMINIO_LOGIN;
  const isCadastroHost = host === DOMINIO_CADASTRO;
  const isAssinaturaHost = host === DOMINIO_ASSINATURA;

  // =========================
  // APP DO PROFISSIONAL
  // =========================
  if (isAppHost) {
    if (rotaAdminMaster) {
      return redirectToHost(request, DOMINIO_PAINEL, pathnameNormalizado);
    }

    if (rotaPainel) {
      return redirectToHost(request, DOMINIO_PAINEL, pathnameNormalizado);
    }

    if (rotaAssinatura) {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }

    if (rotaCadastro) {
      return redirectToHost(
        request,
        DOMINIO_CADASTRO,
        getCadastroPath(pathnameNormalizado)
      );
    }

    if (isAppProfissionalRoute(pathnameNormalizado)) {
      return redirectToHost(
        request,
        DOMINIO_APP,
        removeAppProfissionalPrefix(pathnameNormalizado)
      );
    }

    if (
      !isArquivoPublico(pathname) &&
      !pathname.startsWith(APP_PROFISSIONAL_PREFIX)
    ) {
      url.pathname =
        pathname === "/"
          ? APP_PROFISSIONAL_PREFIX
          : `${APP_PROFISSIONAL_PREFIX}${pathname}`;
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // =========================
  // SITE PRINCIPAL / WWW
  // =========================
  if (isRootHost) {
    if (rotaAutenticacao) {
      return redirectToHost(request, DOMINIO_LOGIN, pathnameNormalizado);
    }

    if (rotaAdminMaster) {
      return redirectToHost(request, DOMINIO_PAINEL, pathnameNormalizado);
    }

    if (rotaAssinatura) {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }

    if (rotaCadastro) {
      return redirectToHost(
        request,
        DOMINIO_CADASTRO,
        getCadastroPath(pathnameNormalizado)
      );
    }

    if (rotaAppProfissional) {
      return redirectToHost(
        request,
        DOMINIO_APP,
        removeAppProfissionalPrefix(pathnameNormalizado)
      );
    }

    if (rotaPainel) {
      return redirectToHost(request, DOMINIO_PAINEL, pathnameNormalizado);
    }

    return NextResponse.next();
  }

  // =========================
  // LOGIN
  // =========================
  if (isLoginHost) {
    if (pathnameNormalizado === "/") {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }

    if (!rotaAutenticacao) {
      if (rotaAdminMaster) {
        return redirectToHost(request, DOMINIO_PAINEL, pathnameNormalizado);
      }

      if (rotaPainel) {
        return redirectToHost(request, DOMINIO_PAINEL, pathnameNormalizado);
      }

      if (rotaAssinatura) {
        return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
      }

      if (rotaCadastro) {
        return redirectToHost(
          request,
          DOMINIO_CADASTRO,
          getCadastroPath(pathnameNormalizado)
        );
      }

      if (rotaAppProfissional) {
        return redirectToHost(
          request,
          DOMINIO_APP,
          removeAppProfissionalPrefix(pathnameNormalizado)
        );
      }

      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }
  }

  // =========================
  // CADASTRO
  // =========================
  if (isCadastroHost) {
    if (pathnameNormalizado === "/") {
      return redirectToHost(request, DOMINIO_CADASTRO, CADASTRO_PATH);
    }

    if (!rotaCadastro) {
      if (rotaAdminMaster) {
        return redirectToHost(request, DOMINIO_PAINEL, pathnameNormalizado);
      }

      if (rotaAutenticacao) {
        return redirectToHost(request, DOMINIO_LOGIN, pathnameNormalizado);
      }

      if (rotaAssinatura) {
        return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
      }

      if (rotaPainel) {
        return redirectToHost(request, DOMINIO_PAINEL, pathnameNormalizado);
      }

      if (rotaAppProfissional) {
        return redirectToHost(
          request,
          DOMINIO_APP,
          removeAppProfissionalPrefix(pathnameNormalizado)
        );
      }

      return redirectToHost(request, DOMINIO_CADASTRO, CADASTRO_PATH);
    }

    if (pathnameNormalizado === "/cadastro") {
      return redirectToHost(request, DOMINIO_CADASTRO, CADASTRO_PATH);
    }
  }

  // =========================
  // ASSINATURA
  // =========================
  if (isAssinaturaHost) {
    if (pathnameNormalizado === "/") {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }

    if (!rotaAssinatura) {
      if (rotaAdminMaster) {
        return redirectToHost(request, DOMINIO_PAINEL, pathnameNormalizado);
      }

      if (rotaAutenticacao) {
        return redirectToHost(request, DOMINIO_LOGIN, pathnameNormalizado);
      }

      if (rotaCadastro) {
        return redirectToHost(
          request,
          DOMINIO_CADASTRO,
          getCadastroPath(pathnameNormalizado)
        );
      }

      if (rotaPainel) {
        return redirectToHost(request, DOMINIO_PAINEL, pathnameNormalizado);
      }

      if (rotaAppProfissional) {
        return redirectToHost(
          request,
          DOMINIO_APP,
          removeAppProfissionalPrefix(pathnameNormalizado)
        );
      }

      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }
  }

  // =========================
  // PAINEL
  // =========================
  if (isPainelHost) {
    if (pathnameNormalizado === "/") {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }

    if (rotaAutenticacao) {
      return redirectToHost(request, DOMINIO_LOGIN, pathnameNormalizado);
    }

    if (rotaAssinatura) {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }

    if (rotaCadastro) {
      return redirectToHost(
        request,
        DOMINIO_CADASTRO,
        getCadastroPath(pathnameNormalizado)
      );
    }

    if (rotaAppProfissional) {
      return redirectToHost(
        request,
        DOMINIO_APP,
        removeAppProfissionalPrefix(pathnameNormalizado)
      );
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: supabaseCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...options,
            ...supabaseCookieOptions,
          });
        });
      },
    },
  });

  if (!rotaPainel && !rotaLiberada && !rotaAutenticacao && !rotaAdminMaster) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // não logado tentando entrar em rota do painel
  if (rotaPainel && !user) {
    if (!isLoginHost) {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }
    return response;
  }

  if (rotaAdminMaster && !user) {
    if (!isLoginHost) {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }
    return response;
  }

  // não logado tentando abrir assinatura
  if (rotaAssinatura && !user) {
    if (!isAssinaturaHost) {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }
    return response;
  }

  // nao logado tentando abrir login/recuperacao de senha
  if (rotaAutenticacao && !user) {
    if (!isLoginHost) {
      return redirectToHost(request, DOMINIO_LOGIN, pathnameNormalizado);
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

  // Usuario autenticado no proprio host de login pode ter cookies antigos
  // presos ao subdominio. Evita loop login -> painel -> login.
  if (rotaLogin) {
    if (isLoginHost) {
      return response;
    }

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
