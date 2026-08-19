import { NextResponse } from "next/server";
import {
  createClienteSession,
  createClienteSessionRestoreToken,
  getClienteSessionFromCookie,
  hasClienteLogoutMarker,
  parseClienteSessionRestoreToken,
} from "@/lib/cliente-auth.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSecurityAccessDecision } from "@/lib/security/user-security";

async function readRestoreToken(request: Request) {
  try {
    const body = (await request.json()) as { restoreToken?: unknown };
    return typeof body.restoreToken === "string" ? body.restoreToken : "";
  } catch {
    return "";
  }
}

function unauthorized(message: string) {
  return NextResponse.json(
    { ok: false, message },
    {
      status: 401,
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}

export async function POST(request: Request) {
  if (await hasClienteLogoutMarker()) {
    return unauthorized("Sessão encerrada neste aparelho.");
  }

  const cookieSession = await getClienteSessionFromCookie();
  const restoreToken = cookieSession ? "" : await readRestoreToken(request);
  const restoredSession = restoreToken
    ? parseClienteSessionRestoreToken(restoreToken)
    : null;
  const session = cookieSession || restoredSession;

  if (!session?.idConta) {
    return unauthorized("Sessão do cliente indisponível.");
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: account, error } = await supabaseAdmin
    .from("clientes_app_auth")
    .select("id, ativo, auth_version")
    .eq("id", session.idConta)
    .limit(1)
    .maybeSingle();

  if (
    error ||
    !account?.id ||
    account.ativo === false ||
    Number(account.auth_version || 1) !== Number(session.authVersion || 1)
  ) {
    return unauthorized("Sua sessão precisa ser autenticada novamente.");
  }

  const securityDecision = await getSecurityAccessDecision({
    tipoUsuario: "cliente",
    userId: session.idConta,
  });
  if (!securityDecision.allowed) {
    return unauthorized("Seu acesso está temporariamente indisponível.");
  }

  await createClienteSession(session);

  return NextResponse.json(
    { ok: true, restoreToken: createClienteSessionRestoreToken(session) },
    {
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
