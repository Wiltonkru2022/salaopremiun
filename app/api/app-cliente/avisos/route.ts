import { NextResponse } from "next/server";
import { getClienteSessionFromCookie } from "@/lib/cliente-auth.server";
import {
  isClientVisualNoticeActive,
  parseClientVisualNoticeConfig,
  sortClientVisualNotices,
  type ClientVisualNoticeRow,
} from "@/lib/client-app/visual-notifications";
import { queryNeonDirect } from "@/lib/neon/direct.server";

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
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function GET() {
  const session = await getClienteSessionFromCookie();
  if (!session?.idConta) return json({ ok: false, notice: null }, 401);

  const now = new Date();

  try {
    const noticesResult = await queryNeonDirect<ClientVisualNoticeRow>(
      `select id::text,
              titulo::text,
              descricao::text,
              tipo::text,
              publico_tipo::text,
              filtros_json,
              link_url::text,
              imagem_url::text,
              status::text,
              agendada_em,
              enviada_em,
              criada_em
         from public.notificacoes_globais
        where publico_tipo::text in ('todos', 'clientes')
          and status::text in ('publicada', 'agendada')
        order by criada_em desc
        limit 30`
    );

    const candidates = sortClientVisualNotices(
      noticesResult.rows.filter((row) => isClientVisualNoticeActive(row, now))
    );

    if (!candidates.length) return json({ ok: true, notice: null });

    const ids = candidates.map((item) => String(item.id));
    const placeholders = ids.map((_, index) => `$${index + 2}::text`).join(", ");

    const statesResult = await queryNeonDirect<NoticeStateRow>(
      `select id_notificacao::text,
              exibida_em::text,
              lida_em::text,
              dispensada_em::text,
              clicada_em::text
         from public.notificacoes_cliente_estado
        where cliente_app_conta_id::text = $1::text
          and id_notificacao::text in (${placeholders})`,
      [session.idConta, ...ids]
    );

    const stateByNotice = new Map<string, NoticeStateRow>(
      statesResult.rows.map((item) => [String(item.id_notificacao), item])
    );

    const selected = candidates.find((item) => {
      const config = parseClientVisualNoticeConfig(item.filtros_json);
      if (!config) return false;
      const state = stateByNotice.get(String(item.id));
      return !(config.dispensavel && state?.dispensada_em);
    });

    if (!selected) return json({ ok: true, notice: null });

    const config = parseClientVisualNoticeConfig(selected.filtros_json);
    if (!config) return json({ ok: true, notice: null });

    const previousState = stateByNotice.get(String(selected.id));
    if (!previousState?.lida_em || !previousState?.exibida_em) {
      const timestamp = now.toISOString();

      await queryNeonDirect(
        `insert into public.notificacoes_cliente_estado
           (id_notificacao, cliente_app_conta_id, exibida_em, lida_em, atualizado_em)
         values
           ($1, $2, $3::timestamptz, $4::timestamptz, $5::timestamptz)
         on conflict (id_notificacao, cliente_app_conta_id) do update set
           exibida_em = coalesce(public.notificacoes_cliente_estado.exibida_em, excluded.exibida_em),
           lida_em = coalesce(public.notificacoes_cliente_estado.lida_em, excluded.lida_em),
           atualizado_em = excluded.atualizado_em`,
        [
          selected.id,
          session.idConta,
          previousState?.exibida_em || timestamp,
          previousState?.lida_em || timestamp,
          timestamp,
        ]
      ).catch((error) => {
        console.warn("[client-visual-notice] tracking failed", error);
      });
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
  } catch (error) {
    console.error("[client-visual-notice] list failed", error);
    return json({ ok: false, notice: null }, 500);
  }
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

  try {
    const noticeResult = await queryNeonDirect<ClientVisualNoticeRow>(
      `select id::text,
              titulo::text,
              descricao::text,
              tipo::text,
              publico_tipo::text,
              filtros_json,
              link_url::text,
              imagem_url::text,
              status::text,
              agendada_em,
              enviada_em,
              criada_em
         from public.notificacoes_globais
        where id::text = $1::text
        limit 1`,
      [id]
    );

    const row = noticeResult.rows[0];
    if (!row?.id) return json({ ok: false }, 404);

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
    const dismiss = action === "dismiss" ? timestamp : null;
    const click = action === "click" ? timestamp : null;

    await queryNeonDirect(
      `insert into public.notificacoes_cliente_estado
         (id_notificacao, cliente_app_conta_id, lida_em, dispensada_em, clicada_em, atualizado_em)
       values
         ($1, $2, $3::timestamptz, $4::timestamptz, $5::timestamptz, $6::timestamptz)
       on conflict (id_notificacao, cliente_app_conta_id) do update set
         lida_em = excluded.lida_em,
         dispensada_em = coalesce(excluded.dispensada_em, public.notificacoes_cliente_estado.dispensada_em),
         clicada_em = coalesce(excluded.clicada_em, public.notificacoes_cliente_estado.clicada_em),
         atualizado_em = excluded.atualizado_em`,
      [id, session.idConta, timestamp, dismiss, click, timestamp]
    );

    return json({ ok: true });
  } catch (error) {
    console.error("[client-visual-notice] interaction failed", error);
    return json({ ok: false }, 500);
  }
}
