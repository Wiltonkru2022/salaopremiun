import { NextResponse } from "next/server";
import {
  APP_PROFISSIONAL_PREFIX,
  DOMINIO_APP,
  DOMINIO_ASSINATURA,
  DOMINIO_CADASTRO,
  DOMINIO_PAINEL,
  getCadastroPath,
  isAppProfissionalRoute,
  isArquivoPublico,
  redirectToHost,
  removeAppProfissionalPrefix,
  type ProxyRouteContext,
} from "@/lib/proxy/host-rules";
import { redirectAdminMasterLoginFromForeignHost } from "@/lib/proxy/admin-master-rules";

export function handleAppProfissionalHost(ctx: ProxyRouteContext) {
  const { request, pathname, pathnameNormalizado } = ctx;

  if (ctx.rotaAdminMasterLogin) {
    return redirectAdminMasterLoginFromForeignHost(ctx);
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
    const url = request.nextUrl.clone();
    url.pathname =
      pathname === "/"
        ? APP_PROFISSIONAL_PREFIX
        : `${APP_PROFISSIONAL_PREFIX}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
