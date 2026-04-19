export function normalizeBaseUrl(value, fallback = "https://salaopremiun.com.br") {
  return String(value || fallback).replace(/\/+$/, "");
}

export function createCookieJar() {
  const cookies = new Map();

  function storeFromSetCookie(headers) {
    const raw =
      typeof headers.getSetCookie === "function"
        ? headers.getSetCookie()
        : headers.get("set-cookie")
          ? [headers.get("set-cookie")]
          : [];

    for (const entry of raw) {
      const firstPart = String(entry || "").split(";")[0];
      const separator = firstPart.indexOf("=");
      if (separator === -1) continue;
      const name = firstPart.slice(0, separator).trim();
      const value = firstPart.slice(separator + 1);
      if (!name) continue;
      if (value) cookies.set(name, value);
      else cookies.delete(name);
    }
  }

  return {
    getAll() {
      return Array.from(cookies.entries()).map(([name, value]) => ({
        name,
        value,
      }));
    },
    setAll(items) {
      for (const item of items) {
        if (!item?.name) continue;
        if (item.value) cookies.set(item.name, item.value);
        else cookies.delete(item.name);
      }
    },
    header() {
      return Array.from(cookies.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
    },
    storeFromSetCookie,
  };
}

export async function requestWithJar(baseUrl, jar, path, options = {}) {
  const headers = new Headers(options.headers || {});
  const cookieHeader = jar?.header();
  if (cookieHeader && !headers.has("cookie")) {
    headers.set("cookie", cookieHeader);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  jar?.storeFromSetCookie(response.headers);
  return response;
}

export async function readPayload(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
