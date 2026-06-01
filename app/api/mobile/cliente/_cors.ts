import { NextResponse } from "next/server";

export const MOBILE_CLIENT_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function mobileOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: MOBILE_CLIENT_CORS_HEADERS,
  });
}

export function requireMobileClientAccess(request: Request) {
  const expectedKey = String(process.env.MOBILE_CLIENT_TEST_KEY || "").trim();
  if (!expectedKey) return null;

  const receivedKey = String(
    request.headers.get("x-mobile-client-key") || ""
  ).trim();

  if (receivedKey === expectedKey) return null;

  return mobileJson(
    {
      ok: false,
      message: "App de teste nao autorizado.",
    },
    { status: 403 }
  );
}

export function mobileJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...MOBILE_CLIENT_CORS_HEADERS,
      ...(init?.headers || {}),
    },
  });
}
