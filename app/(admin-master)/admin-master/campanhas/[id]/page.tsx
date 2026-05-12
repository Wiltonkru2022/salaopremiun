import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function dateValue(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

function Card(props: { label: string; value: string; hint?: string }) {
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

export default async function AdminMasterCampanhaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminMasterUser("comunicacao_ver");
  const { id } = await params;
  const { data } = await getSupabaseAdmin()
    .from("campanhas")
    .select("id, nome, tipo, publico_tipo, objetivo, status, inicio_em, fim_em, criada_em")
    .eq("id", id)
    .maybeSingle();

  if (!data?.id) notFound();

  const status = String(data.status || "-");
  const objetivo = String(data.objetivo || "Sem objetivo definido");

  return (
    <div className="space-y-6">
      <section className="rounded-[34px] bg-zinc-950 p-7 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.35em] text-amber-200">
              Campanha
            </div>
            <h1 className="mt-3 font-display text-4xl font-black">
              {String(data.nome || "Campanha")}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
              Diagnóstico da campanha, objetivo, período e próximos passos para acompanhar conversão.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin-master/campanhas" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20">
              Voltar
            </Link>
            <Link href={`/admin-master/logs?busca=${encodeURIComponent(id)}`} className="rounded-full bg-white px-4 py-2 text-sm font-black text-zinc-950 transition hover:bg-amber-100">
              Ver auditoria
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card label="Status" value={status} hint={String(data.tipo || "-")} />
        <Card label="Público" value={String(data.publico_tipo || "-")} hint="Segmento alvo" />
        <Card label="Início" value={dateValue(data.inicio_em)} hint="Data planejada" />
        <Card label="Fim" value={dateValue(data.fim_em)} hint="Data de encerramento" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
            Objetivo
          </div>
          <p className="mt-4 text-sm leading-7 text-zinc-700">{objetivo}</p>
        </div>
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <div className="text-xs font-black uppercase tracking-[0.25em] opacity-70">
            Métricas
          </div>
          <p className="mt-4 text-sm leading-7">
            As métricas reais aparecem quando os disparos vinculados à campanha registrarem envio, clique,
            conversão ou falha. Sem evento vinculado, o AdminMaster mantém a campanha em acompanhamento.
          </p>
        </div>
      </section>
    </div>
  );
}
