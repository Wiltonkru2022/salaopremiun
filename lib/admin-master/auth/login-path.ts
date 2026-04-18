export const ADMIN_MASTER_LOGIN_PATH = "/admin-master/login";
export const ADMIN_MASTER_HOME_PATH = "/admin-master";

export function isAdminMasterLoginPath(pathname?: string | null) {
  return String(pathname || "").trim() === ADMIN_MASTER_LOGIN_PATH;
}

export function sanitizeAdminMasterNextPath(value?: string | null) {
  const normalized = String(value || "").trim();

  if (!normalized.startsWith("/")) {
    return null;
  }

  if (!normalized.startsWith(ADMIN_MASTER_HOME_PATH)) {
    return null;
  }

  if (
    normalized === ADMIN_MASTER_LOGIN_PATH ||
    normalized.startsWith(`${ADMIN_MASTER_LOGIN_PATH}/`) ||
    normalized.startsWith(`${ADMIN_MASTER_LOGIN_PATH}?`)
  ) {
    return null;
  }

  return normalized;
}

export function buildAdminMasterLoginPath(nextPath?: string | null) {
  const safeNext = sanitizeAdminMasterNextPath(nextPath);

  if (!safeNext) {
    return ADMIN_MASTER_LOGIN_PATH;
  }

  const params = new URLSearchParams({
    next: safeNext,
  });

  return `${ADMIN_MASTER_LOGIN_PATH}?${params.toString()}`;
}
