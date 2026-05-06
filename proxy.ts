import { NextResponse, type NextRequest } from "next/server";
import { hasAdminMasterAccess } from "@/lib/proxy/admin-master-rules";
import { getProxyResumoAssinatura } from "@/lib/proxy/assinatura-rules";
import { createProxySupabaseClient, getProxySupabaseConfig } from "@/lib/proxy/auth-rules";
import {
  hasAdminMasterSessionCookie,
  readAdminMasterSessionFromRequest,
} from "@/lib/admin-master/auth/session";
import { handleAppProfissionalHost } from "@/lib/proxy/app-profissional-rules";
import {
  ADMIN_MASTER_PREFIX,
  CADASTRO_PATH,
  DOMINIO_APP,
  DOMINIO_ASSINATURA,
  DOMINIO_BLOG,
  DOMINIO_CADASTRO,
  DOMINIO_LOGIN,
  DOMINIO_PAINEL,
  buildProxyRouteContext,
  getBlogRewritePath,
  getCadastroPath,
  getAdminMasterLoginNextPath,
  isApiRoute,
  isArquivoPublico,
  isBlogRoute,
  redirectToAdminMasterLogin,
  redirectToHost,
  removeBlogPrefix,
  removeAppProfissionalPrefix,
} from "@/lib/proxy/host-rules";

function hasSupabaseAuthCookies(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.includes("auth-token") ||
        cookie.name.includes("access-token") ||
        cookie.name.includes("refresh-token")
    );
}

function handleUnauthenticatedRoute(
  request: NextRequest,
  ctx: ReturnType<typeof buildProxyRouteContext>
) {
  if (ctx.rotaPainel) {
    if (!ctx.isLoginHost) {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }

    return NextResponse.next();
  }

  if (ctx.rotaAdminMasterProtegida) {
    return redirectToAdminMasterLogin(
      request,
      `${ctx.pathnameNormalizado}${request.nextUrl.search}`
    );
  }

  if (ctx.rotaAdminMasterLogin) {
    return NextResponse.next();
  }

  if (ctx.rotaAssinatura) {
    if (!ctx.isAssinaturaHost) {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }

    return NextResponse.next();
  }

  if (ctx.rotaAutenticacao) {
    if (!ctx.isLoginHost) {
      return redirectToHost(request, DOMINIO_LOGIN, ctx.pathnameNormalizado);
    }

    return NextResponse.next();
  }

  return null;
}

function handlePublicHostRouting(ctx: ReturnType<typeof buildProxyRouteContext>) {
  const { request, pathnameNormalizado } = ctx;

  if (ctx.isRootHost) {
    if (ctx.rotaAdminMasterLogin) return NextResponse.next();
    if (ctx.rotaAutenticacao) {
      return redirectToHost(request, DOMINIO_LOGIN, pathnameNormalizado);
    }
    if (ctx.rotaAdminMasterProtegida || ctx.rotaPainel) {
      return redirectToHost(request, DOMINIO_PAINEL, pathnameNormalizado);
    }
    if (ctx.rotaAssinatura) {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }
    if (ctx.rotaCadastro) {
      return redirectToHost(
        request,
        DOMINIO_CADASTRO,
        getCadastroPath(pathnameNormalizado)
      );
    }
    if (ctx.rotaAppProfissional) {
      return redirectToHost(
        request,
        DOMINIO_APP,
        removeAppProfissionalPrefix(pathnameNormalizado)
      );
    }
    return NextResponse.next();
  }

  if (ctx.isLoginHost) {
    if (ctx.rotaAdminMasterLogin) {
      return redirectToAdminMasterLogin(
        request,
        getAdminMasterLoginNextPath(request.nextUrl.searchParams.get("next"))
      );
    }
    if (pathnameNormalizado === "/") {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }
    if (!ctx.rotaAutenticacao) {
      if (ctx.rotaAdminMaster || ctx.rotaPainel) {
        return redirectToHost(request, DOMINIO_PAINEL, pathnameNormalizado);
      }
      if (ctx.rotaAssinatura) {
        return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
      }
      if (ctx.rotaCadastro) {
        return redirectToHost(
          request,
          DOMINIO_CADASTRO,
          getCadastroPath(pathnameNormalizado)
        );
      }
      if (ctx.rotaAppProfissional) {
        return redirectToHost(
          request,
          DOMINIO_APP,
          removeAppProfissionalPrefix(pathnameNormalizado)
        );
      }
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }
  }

  if (ctx.isCadastroHost) {
    if (ctx.rotaAdminMasterLogin) {
      return redirectToAdminMasterLogin(
        request,
        getAdminMasterLoginNextPath(request.nextUrl.searchParams.get("next"))
      );
    }
    if (pathnameNormalizado === "/") {
      return redirectToHost(request, DOMINIO_CADASTRO, CADASTRO_PATH);
    }
    if (!ctx.rotaCadastro) {
      if (ctx.rotaAdminMasterProtegida || ctx.rotaPainel) {
        return redirectToHost(request, DOMINIO_PAINEL, pathnameNormalizado);
      }
      if (ctx.rotaAutenticacao) {
        return redirectToHost(request, DOMINIO_LOGIN, pathnameNormalizado);
      }
      if (ctx.rotaAssinatura) {
        return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
      }
      if (ctx.rotaAppProfissional) {
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

  if (ctx.isAssinaturaHost) {
    if (ctx.rotaAdminMasterLogin) {
      return redirectToAdminMasterLogin(
        request,
        getAdminMasterLoginNextPath(request.nextUrl.searchParams.get("next"))
      );
    }
    if (pathnameNormalizado === "/") {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }
    if (!ctx.rotaAssinatura) {
      if (ctx.rotaAdminMasterProtegida || ctx.rotaPainel) {
        return redirectToHost(request, DOMINIO_PAINEL, pathnameNormalizado);
      }
      if (ctx.rotaAutenticacao) {
        return redirectToHost(request, DOMINIO_LOGIN, pathnameNormalizado);
      }
      if (ctx.rotaCadastro) {
        return redirectToHost(
          request,
          DOMINIO_CADASTRO,
          getCadastroPath(pathnameNormalizado)
        );
      }
      if (ctx.rotaAppProfissional) {
        return redirectToHost(
          request,
          DOMINIO_APP,
          removeAppProfissionalPrefix(pathnameNormalizado)
        );
      }
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }
  }

  if (ctx.isPainelHost) {
    if (ctx.rotaAdminMasterLogin) {
      return redirectToAdminMasterLogin(
        request,
        getAdminMasterLoginNextPath(request.nextUrl.searchParams.get("next"))
      );
    }
    if (pathnameNormalizado === "/") {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }
    if (ctx.rotaAutenticacao) {
      return redirectToHost(request, DOMINIO_LOGIN, pathnameNormalizado);
    }
    if (ctx.rotaAssinatura) {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }
    if (ctx.rotaCadastro) {
      return redirectToHost(
        request,
        DOMINIO_CADASTRO,
        getCadastroPath(pathnameNormalizado)
      );
    }
    if (ctx.rotaAppProfissional) {
      return redirectToHost(
        request,
        DOMINIO_APP,
        removeAppProfissionalPrefix(pathnameNormalizado)
      );
    }
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const ctx = buildProxyRouteContext(request);

  // APIs validate access in their own handlers. Redirecting them here turns
  // JSON/POST calls into HTML page redirects and breaks subdomain flows.
  if (isApiRoute(ctx.pathnameNormalizado)) {
    return NextResponse.next();
  }

  if (isArquivoPublico(ctx.pathnameNormalizado)) {
    return NextResponse.next();
  }

  if (!ctx.isBlogHost && isBlogRoute(ctx.pathnameNormalizado)) {
    return redirectToHost(
      request,
      DOMINIO_BLOG,
      removeBlogPrefix(ctx.pathnameNormalizado)
    );
  }

  if (ctx.isAppHost) {
    return handleAppProfissionalHost(ctx);
  }

  if (ctx.isBlogHost) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = getBlogRewritePath(ctx.pathnameNormalizado);
    return NextResponse.rewrite(rewriteUrl);
  }

  const hostRoutingResponse = handlePublicHostRouting(ctx);
  if (hostRoutingResponse) return hostRoutingResponse;

  if (ctx.rotaAdminMaster || ctx.rotaAdminMasterLogin) {
    const adminSession = hasAdminMasterSessionCookie(request)
      ? await readAdminMasterSessionFromRequest(request)
      : null;
    const adminMasterUser = adminSession
      ? await hasAdminMasterAccess({
          authUserId: adminSession.authUserId,
          email: adminSession.email,
        })
      : false;

    if (ctx.rotaAdminMasterLogin) {
      if (adminMasterUser) {
        const nextAdminPath =
          getAdminMasterLoginNextPath(request.nextUrl.searchParams.get("next")) ||
          ADMIN_MASTER_PREFIX;
        return redirectToHost(request, DOMINIO_PAINEL, nextAdminPath, "");
      }

      return NextResponse.next();
    }

    if (ctx.rotaAdminMasterProtegida) {
      if (adminMasterUser) {
        return NextResponse.next();
      }

      return redirectToAdminMasterLogin(
        request,
        `${ctx.pathnameNormalizado}${request.nextUrl.search}`
      );
    }
  }

  if (!getProxySupabaseConfig()) {
    return NextResponse.next();
  }

  const unauthenticatedResponse = !hasSupabaseAuthCookies(request)
    ? handleUnauthenticatedRoute(request, ctx)
    : null;

  if (unauthenticatedResponse) {
    return unauthenticatedResponse;
  }

  const response = NextResponse.next({ request });
  const supabase = createProxySupabaseClient({
    request,
    response,
    host: ctx.host,
  });

  if (!supabase) return response;

  if (
    !ctx.rotaPainel &&
    !ctx.rotaLiberada &&
    !ctx.rotaAutenticacao &&
    !ctx.rotaAdminMaster
  ) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (ctx.rotaPainel && !user) {
    if (!ctx.isLoginHost) {
      return redirectToHost(request, DOMINIO_LOGIN, "/login");
    }
    return response;
  }

  if (ctx.rotaAdminMasterProtegida && !user) {
    return redirectToAdminMasterLogin(
      request,
      `${ctx.pathnameNormalizado}${request.nextUrl.search}`
    );
  }

  if (ctx.rotaAdminMasterLogin && !user) return response;

  if (ctx.rotaAssinatura && !user) {
    if (!ctx.isAssinaturaHost) {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }
    return response;
  }

  if (ctx.rotaAutenticacao && !user) {
    if (!ctx.isLoginHost) {
      return redirectToHost(request, DOMINIO_LOGIN, ctx.pathnameNormalizado);
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
    console.error("Erro proxy usuario:", usuarioError);
    return response;
  }

  const idSalao = usuario?.id_salao;

  if (!idSalao) {
    if (ctx.rotaPainel || ctx.rotaLogin) {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }
    return response;
  }

  const { data: assinatura, error: assinaturaError } = await supabase
    .from("assinaturas")
    .select("status, vencimento_em, trial_fim_em")
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (assinaturaError) {
    console.error("Erro proxy assinatura:", assinaturaError);
    return response;
  }

  if (!assinatura) {
    if (ctx.rotaPainel || ctx.rotaLogin) {
      return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
    }
    return response;
  }

  const resumo = getProxyResumoAssinatura(assinatura);

  // Usuario autenticado no proprio host de login pode ter cookies antigos
  // presos ao subdominio. Evita loop login -> painel -> login.
  if (ctx.rotaLogin) {
    if (ctx.isLoginHost) return response;

    return redirectToHost(
      request,
      resumo.bloqueioTotal ? DOMINIO_ASSINATURA : DOMINIO_PAINEL,
      resumo.bloqueioTotal ? "/assinatura" : "/dashboard"
    );
  }

  if (ctx.rotaPainel && resumo.bloqueioTotal) {
    return redirectToHost(request, DOMINIO_ASSINATURA, "/assinatura");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
