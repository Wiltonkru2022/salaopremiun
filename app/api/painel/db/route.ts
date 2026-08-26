import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { withNeonRls } from "@/lib/neon/database.server";
import {
  executePainelNeonQuery,
  executePainelNeonRpc,
  type PainelDbQuery,
  type PainelDbRpc,
} from "@/lib/neon/painel-query.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorizePainel() {
  const context = await getPainelUserContext();
  if (!context.user || !context.usuario?.id_salao || context.usuario.status !== "ativo") {
    return null;
  }

  const email = String(context.usuario.email || context.user.email || "")
    .trim()
    .toLowerCase();
  if (!email) return null;

  return {
    email,
    usuario: context.usuario,
  };
}

export async function POST(request: Request) {
  const auth = await authorizePainel();
  if (!auth) {
    return NextResponse.json(
      { data: null, error: { message: "Sessao do painel invalida." }, count: null },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as PainelDbQuery | PainelDbRpc | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { data: null, error: { message: "Consulta invalida." }, count: null },
      { status: 400 }
    );
  }

  try {
    const result = await withNeonRls(
      {
        email: auth.email,
        mfaVerified: String(auth.usuario.nivel || "").toLowerCase() === "admin",
      },
      async (client) =>
        body.kind === "rpc"
          ? executePainelNeonRpc(client, body)
          : executePainelNeonQuery(client, body)
    );

    return NextResponse.json(result, { status: result.status || 200 });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Falha ao executar consulta Neon do painel.";
    return NextResponse.json(
      { data: null, error: { message }, count: null, status: 500, statusText: "Error" },
      { status: 500 }
    );
  }
}
