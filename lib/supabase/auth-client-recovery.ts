"use client";

type SupabaseAuthLikeError = {
  message?: string;
  status?: number;
  code?: string;
};

function getErrorText(error: unknown) {
  if (!error || typeof error !== "object") return "";
  const authError = error as SupabaseAuthLikeError;
  return `${authError.message || ""} ${authError.code || ""}`.toLowerCase();
}

export function isSupabaseAuthRateLimit(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const authError = error as SupabaseAuthLikeError;
  const text = getErrorText(error);

  return (
    authError.status === 429 ||
    text.includes("rate limit") ||
    text.includes("too many requests")
  );
}

export function getLoginErrorMessage(error: unknown) {
  const text = getErrorText(error);

  if (isSupabaseAuthRateLimit(error)) {
    return "Muitas tentativas de login ou renovacao de sessao. Aguarde alguns minutos ou limpe a sessao local neste navegador.";
  }

  if (
    text.includes("invalid login credentials") ||
    text.includes("invalid_credentials")
  ) {
    return "E-mail ou senha invalidos.";
  }

  if (text.includes("email not confirmed")) {
    return "Seu e-mail ainda nao foi confirmado. Abra a mensagem de confirmacao antes de entrar.";
  }

  if (text.includes("session") && text.includes("expired")) {
    return "Sua sessao anterior expirou neste navegador. Entre novamente para continuar.";
  }

  return "Nao foi possivel concluir o login agora. Revise seus dados e tente novamente.";
}

export function clearSupabaseBrowserAuthState() {
  if (typeof window === "undefined") return;

  const shouldClearKey = (key: string) =>
    key.startsWith("sb-") ||
    key.includes("supabase") ||
    key.includes("auth-token");

  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key && shouldClearKey(key)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Best effort only. Some browsers can block storage access.
  }

  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key && shouldClearKey(key)) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Best effort only. Some browsers can block storage access.
  }

  const hostParts = window.location.hostname.split(".");
  const domains = new Set<string>([window.location.hostname]);

  if (hostParts.length > 2) {
    domains.add(`.${hostParts.slice(-2).join(".")}`);
  }

  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (!name || !shouldClearKey(name)) return;

    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    domains.forEach((domain) => {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}; SameSite=Lax`;
    });
  });
}
