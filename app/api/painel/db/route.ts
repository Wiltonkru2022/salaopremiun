import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getProviderConfig } from "@/lib/platform/provider-config.server";
import { withNeonRls } from "@/lib/neon/database.server";
import {
  executePainelNeonQuery,
  executePainelNeonRpc,
  type PainelDbQuery,
  type PainelDbRpc,
} from "@/lib/neon/painel-query.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function replaySupabaseQuery(client: any, request: PainelDbQuery) {
  let query: any = client.from(request.table);
  const mutation = request.mutation;

  if (mutation?.kind === "insert") query = query.insert(mutation.payload);
  else if (mutation?.kind === "update") query = query.update(mutation.payload);
  else if (mutation?.kind === "delete") query = query.delete();
  else if (mutation?.kind === "upsert") query = query.upsert(mutation.payload, mutation.options);

  if (request.select) query = query.select(request.select, request.selectOptions);

  for (const filter of request.filters || []) {
    if (filter.op === "or") query = query.or(String(filter.value || ""));
    else query = query[filter.op](filter.column, filter.value);
  }

  for (const order of request.orders || []) {
    query = query.order(order.column, {
      ascending: order.ascending !== false,
      nullsFirst: order.nullsFirst,
    });
  }

  if (request.range) query = query.range(request.range[0], request.range[1]);
  else if (request.limit !== undefined) query = query.limit(request.limit);

  if (request.single) query = query.single();
  else if (request.maybeSingle) query = query.maybeSingle();
  return query;
}

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
    const providers = getProviderConfig();

    if (providers.database === "neon") {
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
    }

    const supabase = await createClient();
    const result =
      body.kind === "rpc"
        ? await (supabase as any).rpc(body.fn, body.args || {})
        : await replaySupabaseQuery(supabase, body);

    return NextResponse.json({
      data: result.data ?? null,
      error: result.error ?? null,
      count: result.count ?? null,
      status: result.status ?? (result.error ? 400 : 200),
      statusText: result.statusText ?? (result.error ? "Error" : "OK"),
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Falha ao executar consulta do painel.";
    return NextResponse.json(
      { data: null, error: { message }, count: null, status: 500, statusText: "Error" },
      { status: 500 }
    );
  }
}
