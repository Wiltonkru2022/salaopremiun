import { Capacitor } from "@capacitor/core";

const NATIVE_SESSION_KEY = "salaopremiun.profissional.session.v1";
const API_ORIGIN = "https://app.salaopremiun.com.br";
const NATIVE_APP_ID = "br.com.salaopremiun.profissional";

let nativeSessionToken = "";
let transportInstalled = false;

export function isNativeProfessionalRuntime() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export async function initializeNativeApiTransport() {
  if (!isNativeProfessionalRuntime()) return;

  // O armazenamento pertence ao sandbox do APK (não ao navegador externo).
  // O token é cifrado e expira no servidor; nunca é colocado na URL.
  nativeSessionToken = window.localStorage.getItem(NATIVE_SESSION_KEY) || "";
  if (transportInstalled) return;
  transportInstalled = true;

  const browserFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const source = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const isApiRequest = source.startsWith("/api/");
    if (!isApiRequest) return browserFetch(input, init);

    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    headers.set("X-SP-Native-App", NATIVE_APP_ID);
    if (nativeSessionToken) headers.set("Authorization", `Bearer ${nativeSessionToken}`);

    const url = `${API_ORIGIN}${source}`;
    return browserFetch(url, { ...init, headers, credentials: "omit" });
  };
}

export async function saveNativeProfessionalSession(token: string | null | undefined) {
  if (!isNativeProfessionalRuntime()) return;
  nativeSessionToken = String(token || "").trim();
  if (nativeSessionToken) {
    window.localStorage.setItem(NATIVE_SESSION_KEY, nativeSessionToken);
  } else {
    window.localStorage.removeItem(NATIVE_SESSION_KEY);
  }
}
