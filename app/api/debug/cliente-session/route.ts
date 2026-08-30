import { NextResponse } from "next/server";
import {
  getClienteSessionFromCookie,
  hasClienteLogoutMarker,
} from "@/lib/cliente-auth.server";
import { getDatabaseAdmin } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not available" },
      { status: 404 }
    );
  }

  const logoutMarker =
    await hasClienteLogoutMarker();

  const session =
    await getClienteSessionFromCookie();

  let account: unknown = null;
  let accountError: unknown = null;

  if (session?.idConta) {
    const db = getDatabaseAdmin();

    const result = await db
      .from("clientes_app_auth")
      .select(
        "id, data_nascimento, auth_version, ativo, migracao_identidade_concluida"
      )
      .eq("id", session.idConta)
      .limit(2);

    account = result.data;
    accountError = result.error;
  }

  return NextResponse.json({
    logoutMarker,
    session: session
      ? {
          idConta: session.idConta,
          authVersion: session.authVersion,
          tipo: session.tipo,
          issuedAt: session.issuedAt ?? null,
        }
      : null,
    account,
    accountError,
  });
}
