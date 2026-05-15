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
  removeAppProfissionalPrefix,
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

export function handleAppProfissionalHost(ctx: ProxyRouteContext) {
  const { request, pathname, pathnameNormalizado } = ctx;

  if (
    pathnameNormalizado === "/dashboard" ||
    pathnameNormalizado === "/app-profissional/dashboard"
  ) {
    return redirectToHost(request, DOMINIO_APP, "/inicio", "");
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
    return redirectToHost(
      request,
      DOMINIO_APP,
      removeAppProfissionalPrefix(pathnameNormalizado)
    );
  }

  if (isAppClienteRoute(pathnameNormalizado)) {
    return NextResponse.next();
  }

  if (isCampaignPublicRoute(pathnameNormalizado)) {
    return NextResponse.next();
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
