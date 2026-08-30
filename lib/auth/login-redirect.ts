import { getLoginHost } from "@/lib/security/app-hosts";

export type LoginRedirectNotice = {
  tone: "info" | "warning" | "danger" | "success";
  title: string;
  description: string;
};

export function sanitizeLoginReturnTo(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export function buildLoginRedirectUrl(
  motivo: string,
  options?: { returnTo?: string | null; context?: string | null }
) {
  const url = new URL(`https://${getLoginHost()}/login`);
  url.searchParams.set("motivo", motivo);

  const returnTo = sanitizeLoginReturnTo(options?.returnTo);
  if (returnTo) url.searchParams.set("returnTo", returnTo);

  const context = String(options?.context || "").trim();
  if (context) url.searchParams.set("context", context);
  return url.toString();
}

function getParam(
  searchParams: URLSearchParams | { get(name: string): string | null } | null | undefined,
  key: string
) {
  if (!searchParams || typeof searchParams.get !== "function") return null;
  const value = searchParams.get(key);
  return value ? value.trim() : null;
}

export function getLoginRedirectNotice(
  searchParams: URLSearchParams | { get(name: string): string | null } | null | undefined
): LoginRedirectNotice | null {
  const reason = getParam(searchParams, "motivo");
  if (!reason) return null;

  if (reason === "sessao_expirada") return {
    tone: "warning",
    title: "Sua sessão expirou",
    description: "Entre novamente para continuar. Isso pode acontecer depois de muito tempo sem uso ou quando a sessão deste navegador ficou antiga.",
  };
  if (reason === "usuario_inativo") return {
    tone: "danger",
    title: "Acesso temporariamente indisponível",
    description: "Sua conta está inativa no momento. Fale com o administrador do salão para reativar o acesso.",
  };
  if (reason === "logout") return {
    tone: "info",
    title: "Sessão encerrada",
    description: "Seu acesso foi encerrado neste navegador. Quando quiser voltar, entre novamente.",
  };
  if (reason === "salao_excluido") return {
    tone: "warning",
    title: "Este salão foi excluído",
    description: "A conta não está mais vinculada a um salão ativo.",
  };
  if (reason === "senha_atualizada") return {
    tone: "success",
    title: "Senha atualizada",
    description: "Sua senha foi redefinida com sucesso. Agora entre com a nova senha para continuar.",
  };
  if (reason === "recuperacao_invalida") return {
    tone: "warning",
    title: "Link de recuperação inválido ou antigo",
    description: "Solicite um novo link de recuperação para continuar.",
  };
  if (reason === "recuperacao_expirada") return {
    tone: "warning",
    title: "Link de recuperação expirado",
    description: "Por segurança, o link expirou. Solicite um novo para continuar.",
  };
  if (reason === "sem_permissao") return {
    tone: "warning",
    title: "Área restrita",
    description: "Sua conta não tem permissão para abrir esta área.",
  };
  return null;
}
