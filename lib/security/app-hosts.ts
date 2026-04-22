export function getAppRootDomain() {
  return process.env.APP_ROOT_DOMAIN || "salaopremiun.com.br";
}

export function getLoginHost() {
  return process.env.APP_LOGIN_HOST || `login.${getAppRootDomain()}`;
}

export function getMainAppHost() {
  return process.env.APP_MAIN_HOST || getAppRootDomain();
}

export function isLoginHost(hostname: string) {
  return hostname === getLoginHost();
}

export function isMainAppHost(hostname: string) {
  return hostname === getMainAppHost();
}
