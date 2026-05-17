import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import {
  buscarPainelGlobal,
  normalizeSearchTerm,
  type PainelSearchResult,
} from "@/lib/painel/busca-global";

export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const { user, usuario } = await getPainelUserContext();

  if (!user) {
    return jsonError("Sessão expirada.", 401);
  }

  if (!usuario?.id_salao) {
    return jsonError("Não foi possível identificar o salão do usuário.", 403);
  }

  if (usuario.status !== "ativo") {
    return jsonError("Usuário inativo.", 403);
  }

  const url = new URL(request.url);
  const term = normalizeSearchTerm(url.searchParams.get("q"));

  if (term.length < 2) {
    return NextResponse.json({ results: [] satisfies PainelSearchResult[] });
  }

  const results = await buscarPainelGlobal({
    idSalao: usuario.id_salao,
    term,
  });

  return NextResponse.json({ results });
}
