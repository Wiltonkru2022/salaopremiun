const RESTORE_TOKEN_KEY = "salaopremiun:cliente:restore-token";
const LEGACY_RESTORE_TOKEN_KEY = "salaopremium:cliente:restore-token";

export function readClienteRestoreToken() {
  try {
    const current = window.localStorage.getItem(RESTORE_TOKEN_KEY);
    if (current) return current;

    const legacy = window.localStorage.getItem(LEGACY_RESTORE_TOKEN_KEY);
    if (!legacy) return "";

    window.localStorage.setItem(RESTORE_TOKEN_KEY, legacy);
    window.localStorage.removeItem(LEGACY_RESTORE_TOKEN_KEY);
    return legacy;
  } catch {
    return "";
  }
}

export function writeClienteRestoreToken(token: string) {
  try {
    if (!token) {
      clearClienteRestoreToken();
      return;
    }
    window.localStorage.setItem(RESTORE_TOKEN_KEY, token);
    window.localStorage.removeItem(LEGACY_RESTORE_TOKEN_KEY);
  } catch {
    // Persistencia opcional: a sessao httpOnly continua sendo a fonte principal.
  }
}

export function clearClienteRestoreToken() {
  try {
    window.localStorage.removeItem(RESTORE_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_RESTORE_TOKEN_KEY);
  } catch {
    // Limpeza nao pode bloquear o fluxo de logout/login.
  }
}
