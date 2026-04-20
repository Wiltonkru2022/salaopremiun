import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_MASTER_HOME_PATH,
  ADMIN_MASTER_LOGIN_PATH,
  buildAdminMasterLoginPath,
  isAdminMasterLoginPath,
  sanitizeAdminMasterNextPath,
} from "@/lib/admin-master/auth/login-path";

export const DOMINIO_RAIZ = "salaopremiun.com.br";
export const DOMINIO_WWW = "www.salaopremiun.com.br";
export const DOMINIO_PAINEL = "painel.salaopremiun.com.br";
export const DOMINIO_APP = "app.salaopremiun.com.br";
export const DOMINIO_LOGIN = "login.salaopremiun.com.br";
export const DOMINIO_CADASTRO = "cadastro.salaopremiun.com.br";
export const DOMINIO_ASSINATURA = "assinatura.salaopremiun.com.br";

export const CADASTRO_PATH = "/cadastro-salao";
export const APP_PROFISSIONAL_PREFIX = "/app-profissional";
export const ADMIN_MASTER_PREFIX = ADMIN_MASTER_HOME_PATH;

const DOMINIOS_SITE = [DOMINIO_RAIZ, DOMINIO_WWW];

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

export type ProxyRouteContext = {
  request: NextRequest;
  pathname: string;
  pathnameNormalizado: string;
  host: string;
  rotaPainel: boolean;
  rotaLiberada: boolean;
  rotaLogin: boolean;
  rotaAutenticacao: boolean;
  rotaAssinatura: boolean;
  rotaCadastro: boolean;
  rotaAppProfissional: boolean;
  rotaAdminMaster: boolean;
  rotaAdminMasterLogin: boolean;
  rotaAdminMasterProtegida: boolean;
  isRootHost: boolean;
  isPainelHost: boolean;
  isAppHost: boolean;
  isLoginHost: boolean;
  isCadastroHost: boolean;
  isAssinaturaHost: boolean;
};

function startsWithPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isPainelRoute(pathname: string) {
  return PAINEL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isRotaLiberada(pathname: string) {
  return startsWithPrefix(pathname, ROTAS_LIBERADAS);
}

export function isCadastroRoute(pathname: string) {
  return startsWithPrefix(pathname, CADASTRO_PREFIXES);
}

export function isLoginRoute(pathname: string) {
  return startsWithPrefix(pathname, LOGIN_PREFIXES);
}

export function isApiRoute(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function isAdminMasterRoute(pathname: string) {
  return startsWithPrefix(pathname, ADMIN_MASTER_PREFIXES);
}

export function getAdminMasterLoginNextPath(value?: string | null) {
  return sanitizeAdminMasterNextPath(value);
}

export function isAppProfissionalRoute(pathname: string) {
  return (
    pathname === APP_PROFISSIONAL_PREFIX ||
    pathname.startsWith(`${APP_PROFISSIONAL_PREFIX}/`)
  );
}

export function removeAppProfissionalPrefix(pathname: string) {
  if (pathname === APP_PROFISSIONAL_PREFIX) {
    return "/";
  }

  return pathname.replace(APP_PROFISSIONAL_PREFIX, "") || "/";
}

export function isArquivoPublico(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/fonts") ||
    /\.(.*)$/.test(pathname)
  );
}

export function normalizePathname(pathname: string) {
  return pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
}

export function normalizeHost(host: string) {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

export function getRequestHost(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0];
  return normalizeHost(forwardedHost ?? request.headers.get("host") ?? "");
}

export function isSiteHost(host: string) {
  return DOMINIOS_SITE.includes(host);
}

export function getCadastroPath(pathname: string) {
  return pathname === "/" || pathname === "/cadastro" ? CADASTRO_PATH : pathname;
}

export function buildAbsoluteUrl(
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

export function redirectToHost(
  request: NextRequest,
  host: string,
  pathname: string,
  search = request.nextUrl.search
) {
  const currentHost = getRequestHost(request);
  const currentPath = request.nextUrl.pathname;
  const currentSearch = request.nextUrl.search;

  if (
    currentHost === host &&
    currentPath === pathname &&
    currentSearch === search
  ) {
    return NextResponse.next();
  }

  return NextResponse.redirect(buildAbsoluteUrl(request, host, pathname, search));
}

export function redirectToAdminMasterLogin(
  request: NextRequest,
  nextPath?: string | null
) {
  const targetPath = buildAdminMasterLoginPath(nextPath);
  const targetSearch =
    targetPath === ADMIN_MASTER_LOGIN_PATH
      ? ""
      : targetPath.slice(ADMIN_MASTER_LOGIN_PATH.length);
  const currentHost = getRequestHost(request);
  const currentPath = request.nextUrl.pathname;
  const currentSearch = request.nextUrl.search;

  if (
    (currentHost === DOMINIO_RAIZ || currentHost === DOMINIO_WWW) &&
    currentPath === ADMIN_MASTER_LOGIN_PATH &&
    currentSearch === targetSearch
  ) {
    return NextResponse.next();
  }

  return NextResponse.redirect(
    buildAbsoluteUrl(
      request,
      DOMINIO_RAIZ,
      ADMIN_MASTER_LOGIN_PATH,
      targetSearch
    )
  );
}

export function buildProxyRouteContext(
  request: NextRequest
): ProxyRouteContext {
  const pathname = request.nextUrl.pathname;
  const pathnameNormalizado = normalizePathname(pathname);
  const host = getRequestHost(request);
  const rotaAdminMaster = isAdminMasterRoute(pathnameNormalizado);
  const rotaAdminMasterLogin = isAdminMasterLoginPath(pathnameNormalizado);

  return {
    request,
    pathname,
    pathnameNormalizado,
    host,
    rotaPainel: isPainelRoute(pathnameNormalizado),
    rotaLiberada: isRotaLiberada(pathnameNormalizado),
    rotaLogin: pathnameNormalizado === "/login",
    rotaAutenticacao: isLoginRoute(pathnameNormalizado),
    rotaAssinatura: pathnameNormalizado.startsWith("/assinatura"),
    rotaCadastro: isCadastroRoute(pathnameNormalizado),
    rotaAppProfissional: isAppProfissionalRoute(pathnameNormalizado),
    rotaAdminMaster,
    rotaAdminMasterLogin,
    rotaAdminMasterProtegida: rotaAdminMaster && !rotaAdminMasterLogin,
    isRootHost: isSiteHost(host),
    isPainelHost: host === DOMINIO_PAINEL,
    isAppHost: host === DOMINIO_APP,
    isLoginHost: host === DOMINIO_LOGIN,
    isCadastroHost: host === DOMINIO_CADASTRO,
    isAssinaturaHost: host === DOMINIO_ASSINATURA,
  };
}
