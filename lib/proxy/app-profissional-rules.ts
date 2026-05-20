import { NextResponse } from "next/server";
import {
  APP_PROFISSIONAL_PREFIX,
  DOMINIO_APP,
  DOMINIO_ASSINATURA,
  DOMINIO_CADASTRO,
  getCadastroPath,
  isAppClienteRoute,
  isAppProfissionalRoute,
  isArquivoPublico,
  redirectToHost,
  type ProxyRouteContext,
} from "@/lib/proxy/host-rules";
import { redirectAdminMasterLoginFromForeignHost } from "@/lib/proxy/admin-master-rules";

function isCampaignPublicRoute(pathname: string) {
  return (
    pathname === "/campanha" ||
    pathname.startsWith("/campanha/") ||
    pathname === "/resgatar-cupom" ||
    pathname.startsWith("/resgatar-cupom/")
  );
}

function rewriteToPath(ctx: ProxyRouteContext, pathname: string) {
  const url = ctx.request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.rewrite(url);
}

function getAppProfissionalCanonicalPath(pathname: string) {
  const routes = [
    "/inicio",
    "/clientes",
    "/agenda",
    "/comandas",
    "/perfil",
    "/comissao",
    "/suporte",
    "/duvidas",
    "/termos",
    "/privacidade",
    "/notificacoes",
    "/avaliacoes",
    "/instalar",
    "/recuperar-senha",
    "/onboarding",
  ];

  const match = routes.find(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  return match ? `${APP_PROFISSIONAL_PREFIX}${pathname}` : null;
}

export function handleAppProfissionalHost(ctx: ProxyRouteContext) {
  const { request, pathname, pathnameNormalizado } = ctx;

  if (pathnameNormalizado === "/") {
    return NextResponse.next();
  }

  if (pathnameNormalizado === "/login") {
    return redirectToHost(request, DOMINIO_APP, "/app-profissional/login");
  }

  if (
    pathnameNormalizado === "/dashboard" ||
    pathnameNormalizado === "/app-profissional/dashboard"
  ) {
    return redirectToHost(request, DOMINIO_APP, "/app-profissional/inicio", "");
  }

  if (ctx.rotaAdminMasterLogin) {
    return redirectAdminMasterLoginFromForeignHost(ctx);
  }

  if (ctx.rotaAdminMasterProtegida) {
    return redirectAdminMasterLoginFromForeignHost(ctx);
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

  if (isAppProfissionalRoute(pathnameNormalizado)) {
    return NextResponse.next();
  }

  if (pathnameNormalizado === "/app-cliente/meuapp") {
    return rewriteToPath(ctx, "/app-cliente");
  }

  if (pathnameNormalizado === "/app-cliente") {
    return redirectToHost(
      request,
      DOMINIO_APP,
      "/app-cliente/meuapp",
      request.nextUrl.search
    );
  }

  if (pathnameNormalizado === "/app-cliente/explorar") {
    return rewriteToPath(ctx, "/app-cliente/inicio");
  }

  if (pathnameNormalizado === "/app-cliente/inicio") {
    return redirectToHost(
      request,
      DOMINIO_APP,
      "/app-cliente/explorar",
      request.nextUrl.search
    );
  }

  if (pathnameNormalizado === "/app-cliente/agenda") {
    return rewriteToPath(ctx, "/app-cliente/agendamentos");
  }

  if (pathnameNormalizado === "/app-cliente/agendamentos") {
    return redirectToHost(
      request,
      DOMINIO_APP,
      "/app-cliente/agenda",
      request.nextUrl.search
    );
  }

  if (isAppClienteRoute(pathnameNormalizado)) {
    return NextResponse.next();
  }

  if (isCampaignPublicRoute(pathnameNormalizado)) {
    return NextResponse.next();
  }

  const canonicalProfissionalPath =
    getAppProfissionalCanonicalPath(pathnameNormalizado);
  if (canonicalProfissionalPath) {
    return redirectToHost(
      request,
      DOMINIO_APP,
      canonicalProfissionalPath,
      request.nextUrl.search
    );
  }

  if (
    !isArquivoPublico(pathname) &&
    !pathname.startsWith(APP_PROFISSIONAL_PREFIX)
  ) {
    const url = request.nextUrl.clone();
    url.pathname =
      pathname === "/"
        ? APP_PROFISSIONAL_PREFIX
        : `${APP_PROFISSIONAL_PREFIX}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
