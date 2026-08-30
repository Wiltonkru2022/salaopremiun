import { NextRequest, NextResponse } from "next/server";
import { clearClienteSessionOnResponse } from "@/lib/cliente-auth.server";

function safeDestination(value: string | null) {
  const fallback =
    "/app-cliente/login?logout=1";

  if (!value || !value.startsWith("/")) {
    return fallback;
  }

  try {
    const parsed = new URL(
      value,
      "https://salaopremiun.local"
    );

    if (!parsed.pathname.startsWith("/")) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}

export async function GET(
  request: NextRequest
) {
  const destino = safeDestination(
    request.nextUrl.searchParams.get(
      "destino"
    )
  );

  const marker =
    request.nextUrl.searchParams.get(
      "marker"
    );

  /*
   * marker=0 = sessão inválida/expirada.
   * Não cria marcador de logout explícito.
   */
  const explicitLogout = marker !== "0";

  const finalDestination =
    explicitLogout &&
    destino.startsWith(
      "/app-cliente/login"
    )
      ? (() => {
          const url = new URL(
            destino,
            request.url
          );
          url.searchParams.set(
            "logout",
            "1"
          );
          return `${url.pathname}${url.search}`;
        })()
      : destino;

  const response =
    NextResponse.redirect(
      new URL(
        finalDestination,
        request.url
      )
    );

  clearClienteSessionOnResponse(
    request,
    response,
    explicitLogout
  );

  return response;
}
