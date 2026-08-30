import { NextResponse, type NextRequest } from "next/server";
import { hasAdminMasterSessionCookie } from "@/lib/admin-master/auth/session";
import { handleAppProfissionalHost } from "@/lib/proxy/app-profissional-rules";
import {
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
} from "@/lib/proxy/host-rules";

function hasPainelAuthCookie(request: NextRequest) {
  return Boolean(request.cookies.get("sp-painel-auth-token")?.value);
}

function isLocalDevHost(host: string) {
  return (
    process.env.NODE_ENV !== "production" &&
    (host === "localhost" || host === "127.0.0.1" || host === "[::1]")
  );
}

function handleUnauthenticatedRoute(
  request: NextRequest,
  ctx: ReturnType<typeof buildProxyRouteContext>
) {
  if (isLocalDevHost(ctx.host) && ctx.rotaAutenticacao) {
    return NextResponse.next();
  }

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

  if (ctx.rotaAdminMasterLogin) return NextResponse.next();

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
        getCadastroPath(pathnameNormalizado),
        request.nextUrl.search,
        301
      );
    }
    if (ctx.rotaAppProfissional) {
      return redirectToHost(request, DOMINIO_APP, pathnameNormalizado);
    }
    if (ctx.rotaAppCliente) {
      return redirectToHost(
        request,
        DOMINIO_APP,
        pathnameNormalizado,
        request.nextUrl.search,
        301
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
        return redirectToHost(request, DOMINIO_CADASTRO, getCadastroPath(pathnameNormalizado));
      }
      if (ctx.rotaAppProfissional || ctx.rotaAppCliente) {
        return redirectToHost(request, DOMINIO_APP, pathnameNormalizado);
      }
      return NextResponse.next();
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
      if (ctx.rotaAppProfissional || ctx.rotaAppCliente) {
        return redirectToHost(request, DOMINIO_APP, pathnameNormalizado);
      }
      return NextResponse.next();
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
        return redirectToHost(request, DOMINIO_CADASTRO, getCadastroPath(pathnameNormalizado));
      }
      if (ctx.rotaAppProfissional || ctx.rotaAppCliente) {
        return redirectToHost(request, DOMINIO_APP, pathnameNormalizado);
      }
      return NextResponse.next();
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
      return redirectToHost(request, DOMINIO_CADASTRO, getCadastroPath(pathnameNormalizado));
    }
    if (ctx.rotaAppProfissional || ctx.rotaAppCliente) {
      return redirectToHost(request, DOMINIO_APP, pathnameNormalizado);
    }
  }

  return null;
}

function rewriteToNovoAppProfissional(request: NextRequest) {
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = "/app-profissional/index.html";
  return NextResponse.rewrite(rewriteUrl);
}

export async function proxy(request: NextRequest) {
  const ctx = buildProxyRouteContext(request);

  // Regra de disponibilidade: middleware nunca consulta banco ou outros
  // serviços remotos. APIs e layouts protegidos validam a sessão de verdade.
  if (isApiRoute(ctx.pathnameNormalizado) || isArquivoPublico(ctx.pathnameNormalizado)) {
    return NextResponse.next();
  }

  // Em desenvolvimento todas as superficies compartilham localhost. A
  // separacao por subdominios continua sendo aplicada normalmente em producao.
  if (isLocalDevHost(ctx.host)) {
    if (ctx.rotaAppProfissional) return rewriteToNovoAppProfissional(request);

    if (ctx.rotaAdminMasterProtegida && !hasAdminMasterSessionCookie(request)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin-master/login";
      loginUrl.searchParams.set(
        "next",
        `${ctx.pathnameNormalizado}${request.nextUrl.search}`
      );
      return NextResponse.redirect(loginUrl);
    }

    if (ctx.rotaPainel && !hasPainelAuthCookie(request)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set(
        "returnTo",
        `${ctx.pathnameNormalizado}${request.nextUrl.search}`
      );
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next({ request });
  }

  if (!ctx.isBlogHost && isBlogRoute(ctx.pathnameNormalizado)) {
    return redirectToHost(request, DOMINIO_BLOG, removeBlogPrefix(ctx.pathnameNormalizado));
  }

  if (ctx.isAppHost) {
    if (ctx.rotaAppProfissional) return rewriteToNovoAppProfissional(request);
    return handleAppProfissionalHost(ctx);
  }

  if (ctx.isBlogHost) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = getBlogRewritePath(ctx.pathnameNormalizado);
    return NextResponse.rewrite(rewriteUrl);
  }

  const hostRoutingResponse = handlePublicHostRouting(ctx);
  if (hostRoutingResponse) return hostRoutingResponse;

  if (ctx.rotaAdminMasterProtegida && !hasAdminMasterSessionCookie(request)) {
    return redirectToAdminMasterLogin(
      request,
      `${ctx.pathnameNormalizado}${request.nextUrl.search}`
    );
  }

  const hasAuthCookies = hasPainelAuthCookie(request);
  if (!hasAuthCookies) {
    const unauthenticatedResponse = handleUnauthenticatedRoute(request, ctx);
    if (unauthenticatedResponse) return unauthenticatedResponse;
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|app-cliente|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
        { type: "header", key: "sec-purpose", value: "prefetch" },
      ],
    },
  ],
};
