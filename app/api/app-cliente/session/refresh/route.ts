import { NextRequest, NextResponse } from "next/server";
import {
  createClienteSessionRestoreToken,
  getClienteSessionFromCookie,
  hasClienteLogoutMarker,
  parseClienteSessionRestoreToken,
  setClienteSessionOnResponse,
  type ClienteAppSession,
} from "@/lib/cliente-auth.server";
import { queryNeonDirect } from "@/lib/neon/direct.server";
import { getClienteSecurityDecisionDirect } from "@/lib/client-app/security-access-direct.server";

type AccountRow = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  ativo: boolean | null;
  auth_version: number | string | null;
};

async function readRestoreToken(request: Request) {
  try {
    const body = (await request.json()) as { restoreToken?: unknown };
    return typeof body.restoreToken === "string" ? body.restoreToken : "";
  } catch {
    return "";
  }
}

async function validateSessionAgainstAccount(
  session: ClienteAppSession
): Promise<ClienteAppSession | null> {
  const result = await queryNeonDirect<AccountRow>(
    `select id::text,
            nome::text,
            email::text,
            telefone::text,
            whatsapp::text,
            ativo,
            auth_version
       from public.clientes_app_auth
      where id::text = $1::text
      limit 1`,
    [session.idConta]
  );

  const account = result.rows[0];
  if (!account?.id || account.ativo === false) return null;

  const authVersion = Number(account.auth_version || 1);
  if (Number(session.authVersion || 1) !== authVersion) return null;

  const security = await getClienteSecurityDecisionDirect({
    userId: account.id,
  });
  if (!security.allowed) return null;

  return {
    idConta: account.id,
    nome: String(account.nome || session.nome || "Cliente").trim() || "Cliente",
    email: String(account.email || session.email || "").trim(),
    telefone:
      String(account.telefone || session.telefone || "").trim() || null,
    whatsapp:
      String(
        account.whatsapp ||
          session.whatsapp ||
          account.telefone ||
          session.telefone ||
          ""
      ).trim() || null,
    authVersion,
    issuedAt: Date.now(),
    tipo: "cliente",
  };
}

export async function POST(request: NextRequest) {
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
      {
        ok: false,
        message: "Sua sessão não é mais válida. Entre novamente.",
      },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const response = NextResponse.json(
    {
      ok: true,
      restoreToken: createClienteSessionRestoreToken(session),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );

  setClienteSessionOnResponse(request, response, session);
  return response;
}
