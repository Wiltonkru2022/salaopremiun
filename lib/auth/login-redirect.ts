export type LoginRedirectNotice = {
  tone: "info" | "warning" | "danger" | "success";
  title: string;
  description: string;
};

function getParam(
  searchParams:
    | URLSearchParams
    | { get(name: string): string | null }
    | null
    | undefined,
  key: string
) {
  if (!searchParams || typeof searchParams.get !== "function") {
    return null;
  }

  const value = searchParams.get(key);
  return value ? value.trim() : null;
}

export function getLoginRedirectNotice(
  searchParams:
    | URLSearchParams
    | { get(name: string): string | null }
    | null
    | undefined
): LoginRedirectNotice | null {
  const reason = getParam(searchParams, "motivo");

  if (!reason) {
    return null;
  }

  if (reason === "sessao_expirada") {
    return {
      tone: "warning",
      title: "Sua sessao expirou",
      description:
        "Entre novamente para continuar. Isso costuma acontecer depois de muito tempo sem uso ou quando a sessao ficou velha neste navegador.",
    };
  }

  if (reason === "usuario_inativo") {
    return {
      tone: "danger",
      title: "Acesso temporariamente indisponivel",
      description:
        "Sua conta do sistema esta inativa no momento. Fale com o administrador do salao para reativar o acesso.",
    };
  }

  if (reason === "logout") {
    return {
      tone: "info",
      title: "Sessao encerrada",
      description:
        "Seu acesso foi encerrado neste navegador. Quando quiser voltar, e so entrar novamente.",
    };
  }

  if (reason === "senha_atualizada") {
    return {
      tone: "success",
      title: "Senha atualizada",
      description:
        "Sua senha foi redefinida com sucesso. Agora entre com a nova senha para continuar.",
    };
  }

  if (reason === "sem_permissao") {
    return {
      tone: "warning",
      title: "Area restrita",
      description:
        "Sua conta nao tem permissao para abrir essa area. Entre com um usuario autorizado ou ajuste as permissoes do perfil.",
    };
  }

  return null;
}
