import { NextResponse } from "next/server";
import {
  createClienteSession,
  createClienteSessionRestoreToken,
  getClienteSessionFromCookie,
  hasClienteLogoutMarker,
  parseClienteSessionRestoreToken,
  type ClienteAppSession,
} from "@/lib/cliente-auth.server";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { asLooseDbClient } from "@/lib/db/loose-client";

async function readRestoreToken(request: Request) {
  try {
    const body = (await request.json()) as { restoreToken?: unknown };
    return typeof body.restoreToken === "string" ? body.restoreToken : "";
  } catch {
    return "";
  }
}

async function validateSessionAgainstAccount(session: ClienteAppSession) {
  const database = asLooseDbClient(getDatabaseAdmin());
  const { data: account, error } = await database
    .from("clientes_app_auth")
    .select("id, nome, email, telefone, whatsapp, ativo, auth_version")
    .eq("id", session.idConta)
    .limit(1)
    .maybeSingle<{
      id?: string | null;
      nome?: string | null;
      email?: string | null;
      telefone?: string | null;
      whatsapp?: string | null;
      ativo?: boolean | null;
      auth_version?: number | null;
    }>();

  if (error || !account?.id || account.ativo === false) return null;
  const authVersion = Number(account.auth_version || 1);
  if (Number(session.authVersion || 1) !== authVersion) return null;

  return {
    idConta: String(account.id),
    nome: String(account.nome || session.nome || "Cliente").trim() || "Cliente",
    email: String(account.email || session.email || "").trim(),
    telefone: String(account.telefone || session.telefone || "").trim() || null,
    whatsapp:
      String(account.whatsapp || session.whatsapp || account.telefone || session.telefone || "").trim() ||
      null,
    authVersion,
    issuedAt: Date.now(),
    tipo: "cliente" as const,
  } satisfies ClienteAppSession;
}

export async function POST(request: Request) {
  if (await hasClienteLogoutMarker()) {
    return NextResponse.json(
      { ok: false, message: "Sessão encerrada neste aparelho." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const cookieSession = await getClienteSessionFromCookie();
  const restoreToken = cookieSession ? "" : await readRestoreToken(request);
  const restoredSession = restoreToken
    ? parseClienteSessionRestoreToken(restoreToken)
    : null;
  const candidateSession = cookieSession || restoredSession;

  if (!candidateSession?.idConta) {
    return NextResponse.json(
      { ok: false, message: "Sessão do cliente indisponível." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const session = await validateSessionAgainstAccount(candidateSession);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Sua sessão não é mais válida. Entre novamente." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
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
