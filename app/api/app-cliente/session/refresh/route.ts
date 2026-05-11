import { NextResponse } from "next/server";
import {
  createClienteSession,
  createClienteSessionRestoreToken,
  getClienteSessionFromCookie,
  hasClienteLogoutMarker,
  parseClienteSessionRestoreToken,
} from "@/lib/cliente-auth.server";

async function readRestoreToken(request: Request) {
  try {
    const body = (await request.json()) as { restoreToken?: unknown };
    return typeof body.restoreToken === "string" ? body.restoreToken : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  if (await hasClienteLogoutMarker()) {
    return NextResponse.json(
      { ok: false, message: "Sessão encerrada neste aparelho." },
      { status: 401 }
    );
  }

  const cookieSession = await getClienteSessionFromCookie();
  const restoreToken = cookieSession ? "" : await readRestoreToken(request);
  const restoredSession = restoreToken
    ? parseClienteSessionRestoreToken(restoreToken)
    : null;
  const session = cookieSession || restoredSession;

  if (!session?.idConta) {
    return NextResponse.json(
      { ok: false, message: "Sessão do cliente indisponível." },
      { status: 401 }
    );
  }

  await createClienteSession(session);

  return NextResponse.json(
    { ok: true, restoreToken: createClienteSessionRestoreToken(session) },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
