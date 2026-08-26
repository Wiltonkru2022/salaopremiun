import { NextResponse } from "next/server";
import { getClienteSessionFromCookie } from "@/lib/cliente-auth.server";
import {
  isClientVisualNoticeActive,
  parseClientVisualNoticeConfig,
  sortClientVisualNotices,
  type ClientVisualNoticeRow,
} from "@/lib/client-app/visual-notifications";
import { getDatabaseAdmin } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

type NoticeStateRow = {
  id_notificacao: string;
  exibida_em?: string | null;
  lida_em?: string | null;
  dispensada_em?: string | null;
  clicada_em?: string | null;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function GET() {
  const session = await getClienteSessionFromCookie();
  if (!session?.idConta) return json({ ok: false, notice: null }, 401);

  const supabase = getDatabaseAdmin() as any;
  const now = new Date();

  const { data, error } = await supabase
    .from("notificacoes_globais")
    .select(
      "id, titulo, descricao, tipo, publico_tipo, filtros_json, link_url, imagem_url, status, agendada_em, enviada_em, criada_em"
    )
    .in("publico_tipo", ["todos", "clientes"])
    .in("status", ["publicada", "agendada"])
    .order("criada_em", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[client-visual-notice] list failed", error);
    return json({ ok: false, notice: null }, 500);
  }

  const candidates = sortClientVisualNotices(
    ((data || []) as ClientVisualNoticeRow[]).filter((row) =>
      isClientVisualNoticeActive(row, now)
    )
  );

  if (!candidates.length) return json({ ok: true, notice: null });

  const ids = candidates.map((item) => item.id);
  const { data: states, error: stateError } = await supabase
    .from("notificacoes_cliente_estado")
    .select(
      "id_notificacao, exibida_em, lida_em, dispensada_em, clicada_em"
    )
    .eq("cliente_app_conta_id", session.idConta)
    .in("id_notificacao", ids);

  if (stateError) {
    console.error("[client-visual-notice] state list failed", stateError);
    return json({ ok: false, notice: null }, 500);
  }

  const stateByNotice = new Map<string, NoticeStateRow>(
    ((states || []) as NoticeStateRow[]).map((item) => [
      String(item.id_notificacao),
      item,
    ])
  );

  const selected = candidates.find((item) => {
    const config = parseClientVisualNoticeConfig(item.filtros_json);
    if (!config) return false;
    const state = stateByNotice.get(item.id);
    return !(config.dispensavel && state?.dispensada_em);
  });

  if (!selected) return json({ ok: true, notice: null });

  const config = parseClientVisualNoticeConfig(selected.filtros_json);
  if (!config) return json({ ok: true, notice: null });

  const previousState = stateByNotice.get(selected.id);
  if (!previousState?.lida_em || !previousState?.exibida_em) {
    const timestamp = now.toISOString();
    const { error: trackingError } = await supabase
      .from("notificacoes_cliente_estado")
      .upsert(
        {
          id_notificacao: selected.id,
          cliente_app_conta_id: session.idConta,
          exibida_em: previousState?.exibida_em || timestamp,
          lida_em: previousState?.lida_em || timestamp,
          atualizado_em: timestamp,
        },
        { onConflict: "id_notificacao,cliente_app_conta_id" }
      );

    if (trackingError) {
      console.warn("[client-visual-notice] tracking failed", trackingError);
    }
  }

  return json({
    ok: true,
    notice: {
      id: selected.id,
      title: selected.titulo,
      body: selected.descricao,
      tone: selected.tipo,
      url: selected.link_url || null,
      imageUrl: selected.imagem_url || null,
      presentation: config.apresentacao,
      dismissible: config.dispensavel,
      blocking: config.bloqueante,
      buttonText: config.botao_texto,
      endsAt: config.fim_em,
      priority: config.prioridade,
    },
  });
}

export async function POST(request: Request) {
  const session = await getClienteSessionFromCookie();
  if (!session?.idConta) return json({ ok: false }, 401);

  const payload = await request.json().catch(() => null);
  const id = String(payload?.id || "").trim();
  const action = String(payload?.action || "").trim();

  if (!id || !["dismiss", "click"].includes(action)) {
    return json({ ok: false, error: "Ação inválida." }, 400);
  }

  const supabase = getDatabaseAdmin() as any;
  const { data: notice, error } = await supabase
    .from("notificacoes_globais")
    .select(
      "id, titulo, descricao, tipo, publico_tipo, filtros_json, link_url, imagem_url, status, agendada_em, enviada_em, criada_em"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !notice?.id) return json({ ok: false }, 404);

  const row = notice as ClientVisualNoticeRow;
  const config = parseClientVisualNoticeConfig(row.filtros_json);
  if (
    !config ||
    !["todos", "clientes"].includes(
      String(row.publico_tipo || "").trim().toLowerCase()
    )
  ) {
    return json({ ok: false }, 404);
  }

  if (action === "dismiss" && !config.dispensavel) {
    return json({ ok: false, error: "Este aviso não pode ser dispensado." }, 403);
  }

  const timestamp = new Date().toISOString();
  const update: Record<string, unknown> = {
    id_notificacao: id,
    cliente_app_conta_id: session.idConta,
    lida_em: timestamp,
    atualizado_em: timestamp,
  };

  if (action === "dismiss") update.dispensada_em = timestamp;
  if (action === "click") update.clicada_em = timestamp;

  const { error: upsertError } = await supabase
    .from("notificacoes_cliente_estado")
    .upsert(update, { onConflict: "id_notificacao,cliente_app_conta_id" });

  if (upsertError) {
    console.error("[client-visual-notice] interaction failed", upsertError);
    return json({ ok: false }, 500);
  }

  return json({ ok: true });
}
