import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminDataTable } from "@/components/admin-master/AdminMasterViews";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function dateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function MetricCard(props: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400">
        {props.label}
      </div>
      <div className="mt-2 text-2xl font-black text-zinc-950">{props.value}</div>
      {props.hint ? <p className="mt-2 text-sm text-zinc-500">{props.hint}</p> : null}
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function AdminMasterNotificacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminMasterUser("comunicacao_ver");
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const [{ data: notificacao }, { data: destinos }] = await Promise.all([
    supabase
      .from("notificacoes_globais")
      .select(
        "id, titulo, descricao, tipo, publico_tipo, status, agendada_em, enviada_em, criada_em, link_url"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("notificacoes_destinos")
      .select("id, id_salao, status, entregue_em, lida_em, clicada_em")
      .eq("id_notificacao", id)
      .limit(500),
  ]);

  if (!notificacao?.id) notFound();

  const rows = ((destinos || []) as Array<Record<string, unknown>>).map((item) => ({
    destino: String(item.id_salao || "-"),
    status: String(item.status || "-"),
    entregue: dateTime(String(item.entregue_em || "")),
    lida: dateTime(String(item.lida_em || "")),
    clique: dateTime(String(item.clicada_em || "")),
  }));
  const total = rows.length;
  const entregues = rows.filter((row) => row.entregue !== "-").length;
  const lidas = rows.filter((row) => row.lida !== "-").length;
  const cliques = rows.filter((row) => row.clique !== "-").length;
  const falhas = rows.filter((row) => /erro|falha|failed/i.test(row.status)).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[34px] bg-zinc-950 p-7 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.35em] text-amber-200">
              Notificação
            </div>
            <h1 className="mt-3 font-display text-4xl font-black">
              {String(notificacao.titulo || "Notificação")}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
              {String(notificacao.descricao || "Detalhe operacional do disparo, leitura, cliques e falhas.")}
            </p>
          </div>
          <Link
            href="/admin-master/notificacoes"
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
          >
            Voltar
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Destinos" value={String(total)} hint={String(notificacao.publico_tipo || "-")} />
        <MetricCard label="Entregues" value={String(entregues)} hint={String(notificacao.status || "-")} />
        <MetricCard label="Lidas" value={String(lidas)} hint={`${total ? Math.round((lidas / total) * 100) : 0}% de leitura`} />
        <MetricCard label="Cliques" value={String(cliques)} hint={String(notificacao.link_url || "Sem link")} />
        <MetricCard label="Falhas" value={String(falhas)} hint="Destinos com erro" />
      </section>

      <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 text-sm text-zinc-600 md:grid-cols-2 xl:grid-cols-4">
          <div><span className="font-bold text-zinc-950">Tipo:</span> {String(notificacao.tipo || "-")}</div>
          <div><span className="font-bold text-zinc-950">Criada:</span> {dateTime(notificacao.criada_em)}</div>
          <div><span className="font-bold text-zinc-950">Agendada:</span> {dateTime(notificacao.agendada_em)}</div>
          <div><span className="font-bold text-zinc-950">Enviada:</span> {dateTime(notificacao.enviada_em)}</div>
        </div>
      </section>

      <AdminDataTable rows={rows} columns={["destino", "status", "entregue", "lida", "clique"]} />
    </div>
  );
}
