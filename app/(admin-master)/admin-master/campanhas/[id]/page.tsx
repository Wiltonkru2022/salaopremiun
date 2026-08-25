import Link from "next/link";
import { notFound } from "next/navigation";
import AdminMasterPageHeader, { AdminMasterMetricCard } from "@/components/admin-master/AdminMasterPageHeader";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function dateValue(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Campo_Grande" }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function AdminMasterCampanhaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminMasterUser("comunicacao_ver");
  const { id } = await params;
  const { data } = await getSupabaseAdmin().from("campanhas").select("id, nome, tipo, publico_tipo, objetivo, status, inicio_em, fim_em, criada_em").eq("id", id).maybeSingle();
  if (!data?.id) notFound();

  return (
    <div className="space-y-5">
      <AdminMasterPageHeader
        title={String(data.nome || "Campanha")}
        description="Objetivo, público, período e diagnóstico da campanha em um único padrão visual."
        eyebrow="Campanha"
        breadcrumb={[{ label: "Admin Master", href: "/admin-master" }, { label: "Campanhas", href: "/admin-master/campanhas" }, { label: String(data.nome || "Detalhe") }]}
        actions={<><Link href="/admin-master/campanhas" className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 hover:border-violet-200 hover:text-violet-700">Voltar</Link><Link href={`/admin-master/atividades?busca=${encodeURIComponent(id)}`} className="inline-flex h-10 items-center rounded-xl bg-violet-700 px-4 text-sm font-bold text-white hover:bg-violet-800">Ver auditoria</Link></>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMasterMetricCard label="Status" value={String(data.status || "-")} hint={String(data.tipo || "-")} tone="violet" />
        <AdminMasterMetricCard label="Público" value={String(data.publico_tipo || "-")} hint="Segmento alvo" tone="blue" />
        <AdminMasterMetricCard label="Início" value={dateValue(data.inicio_em)} hint="Data planejada" />
        <AdminMasterMetricCard label="Fim" value={dateValue(data.fim_em)} hint="Encerramento" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><div className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Objetivo</div><p className="mt-3 text-sm leading-7 text-zinc-700">{String(data.objetivo || "Sem objetivo definido")}</p></div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950 shadow-sm"><div className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">Métricas</div><p className="mt-3 text-sm leading-6">Envio, clique, conversão e falha aparecem quando os eventos vinculados à campanha forem registrados.</p></div>
      </section>
    </div>
  );
}
