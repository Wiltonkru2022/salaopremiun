import { Activity, ArrowRight, Clock3, UserRound } from "lucide-react";
import AdminMasterDataTableClient from "@/components/admin-master/AdminMasterDataTableClient";
import AdminMasterPageHeader, { AdminMasterMetricCard } from "@/components/admin-master/AdminMasterPageHeader";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AuditRow = {
  id: string;
  id_admin_usuario: string | null;
  acao: string | null;
  entidade: string | null;
  entidade_id: string | null;
  descricao: string | null;
  payload_json: Record<string, unknown> | null;
  criado_em: string | null;
};

function dateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Campo_Grande",
  }).format(parsed);
}

function summarize(value: unknown) {
  if (!value) return "-";
  if (typeof value === "string") return value;
  try {
    const text = JSON.stringify(value);
    return text.length > 180 ? `${text.slice(0, 177)}...` : text;
  } catch {
    return "-";
  }
}

function extractChange(payload: Record<string, unknown> | null, side: "antes" | "depois") {
  if (!payload) return "-";
  const keys = side === "antes" ? ["antes", "before", "anterior", "old"] : ["depois", "after", "novo", "new"];
  for (const key of keys) {
    if (payload[key] !== undefined) return summarize(payload[key]);
  }
  return "-";
}

function actionLabel(value?: string | null) {
  return String(value || "atividade")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function AdminMasterAtividadesPage() {
  await requireAdminMasterUser("auditoria_ver");
  const supabase = getSupabaseAdmin();
  const { data: audits } = await supabase
    .from("admin_master_auditoria")
    .select("id, id_admin_usuario, acao, entidade, entidade_id, descricao, payload_json, criado_em")
    .order("criado_em", { ascending: false })
    .limit(100);

  const rows = ((audits || []) as AuditRow[]).filter((row) => row.id);
  const adminIds = Array.from(new Set(rows.map((row) => row.id_admin_usuario).filter(Boolean))) as string[];
  const { data: admins } = adminIds.length
    ? await supabase.from("admin_master_usuarios").select("id, nome, email").in("id", adminIds)
    : { data: [] as Array<{ id: string; nome?: string | null; email?: string | null }> };
  const adminById = new Map(
    ((admins || []) as Array<{ id: string; nome?: string | null; email?: string | null }>).map((admin) => [
      admin.id,
      admin.nome || admin.email || "Admin Master",
    ])
  );

  const now = Date.now();
  const last24h = rows.filter((row) => row.criado_em && now - new Date(row.criado_em).getTime() <= 24 * 60 * 60 * 1000).length;
  const actors = new Set(rows.map((row) => row.id_admin_usuario).filter(Boolean)).size;
  const sensitive = rows.filter((row) => /segur|desbloq|assinatura|cobranca|plano|permiss/i.test(`${row.acao} ${row.entidade}`)).length;

  const tableRows = rows.map((row) => ({
    administrador: row.id_admin_usuario ? adminById.get(row.id_admin_usuario) || "Admin Master" : "Sistema",
    acao: actionLabel(row.acao),
    entidade: row.entidade || "-",
    descricao: row.descricao || "Ação administrativa registrada.",
    antes: extractChange(row.payload_json, "antes"),
    depois: extractChange(row.payload_json, "depois"),
    criado_em: dateTime(row.criado_em),
  }));

  return (
    <div className="space-y-5">
      <AdminMasterPageHeader
        title="Central de atividades"
        description="Linha do tempo única das ações administrativas, alterações de configuração e eventos auditáveis do Admin Master."
        eyebrow="Governança"
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMasterMetricCard label="Atividades" value={rows.length} hint="Últimos 100 registros" />
        <AdminMasterMetricCard label="Últimas 24h" value={last24h} hint="Mudanças recentes" tone={last24h ? "blue" : "default"} />
        <AdminMasterMetricCard label="Administradores" value={actors} hint="Autores na amostra" tone="violet" />
        <AdminMasterMetricCard label="Ações sensíveis" value={sensitive} hint="Segurança, cobrança ou permissões" tone={sensitive ? "amber" : "green"} />
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Timeline</div>
            <h2 className="mt-1 text-lg font-black text-zinc-950">O que mudou recentemente</h2>
          </div>
          <Activity size={20} className="text-zinc-400" />
        </div>
        <div className="mt-5 space-y-1">
          {rows.slice(0, 12).map((row, index) => {
            const actor = row.id_admin_usuario ? adminById.get(row.id_admin_usuario) || "Admin Master" : "Sistema";
            const before = extractChange(row.payload_json, "antes");
            const after = extractChange(row.payload_json, "depois");
            return (
              <div key={row.id} className="relative flex gap-4 pb-5 last:pb-0">
                {index < Math.min(rows.length, 12) - 1 ? <span className="absolute left-[17px] top-9 h-[calc(100%-18px)] w-px bg-zinc-200" /> : null}
                <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-violet-200 bg-violet-50 text-violet-700"><UserRound size={15} /></span>
                <div className="min-w-0 flex-1 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-black text-zinc-900">{actor} · {actionLabel(row.acao)}</div>
                      <div className="mt-1 text-sm leading-5 text-zinc-600">{row.descricao || `${row.entidade || "Entidade"} atualizada.`}</div>
                    </div>
                    <div className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400"><Clock3 size={12} />{dateTime(row.criado_em)}</div>
                  </div>
                  {before !== "-" || after !== "-" ? (
                    <details className="mt-3 rounded-xl border border-zinc-200 bg-white">
                      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-600">Ver antes e depois <ArrowRight size={13} /></summary>
                      <div className="grid gap-2 border-t border-zinc-100 p-3 sm:grid-cols-2">
                        <div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Antes</div><div className="mt-1 break-words text-xs text-zinc-600">{before}</div></div>
                        <div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Depois</div><div className="mt-1 break-words text-xs text-zinc-600">{after}</div></div>
                      </div>
                    </details>
                  ) : null}
                </div>
              </div>
            );
          })}
          {!rows.length ? <div className="rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-500">Nenhuma atividade administrativa registrada ainda.</div> : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="px-1"><h2 className="text-base font-black text-zinc-950">Auditoria completa</h2><p className="mt-0.5 text-xs text-zinc-500">Busca, filtros, exportação e visual mobile usando o padrão único de tabelas.</p></div>
        <AdminMasterDataTableClient
          rows={tableRows}
          columns={["administrador", "acao", "entidade", "descricao", "antes", "depois", "criado_em"]}
          emptyTitle="Nenhuma atividade encontrada"
          emptyDescription="Não há registros com os filtros atuais."
        />
      </section>
    </div>
  );
}
