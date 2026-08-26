import Link from "next/link";
import { notFound } from "next/navigation";
import AdminMasterPageHeader from "@/components/admin-master/AdminMasterPageHeader";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getDatabaseAdmin } from "@/lib/db/admin";

function dateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function Info(props: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">{props.label}</div>
      <div className="mt-2 break-words text-sm font-black text-zinc-900">{props.value}</div>
    </div>
  );
}

export const dynamic = "force-dynamic";

const WHATSAPP_DETAIL_COLUMNS: Record<string, string> = {
  whatsapp_envios:
    "id, id_salao, tipo, destino, template, status, custo_creditos, erro_texto, criado_em, enviado_em",
  whatsapp_filas:
    "id, id_salao, status, tentativas, ultimo_erro, criado_em, processado_em",
  whatsapp_pacote_saloes:
    "id, id_salao, creditos_total, creditos_usados, creditos_saldo, status, comprado_em, expira_em",
};

export default async function AdminMasterWhatsappDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminMasterUser("whatsapp_ver");
  const { id } = await params;
  const [kind, rawId] = decodeURIComponent(id).split(":");
  if (!kind || !rawId) notFound();

  const supabase = getDatabaseAdmin();
  const table =
    kind === "envio"
      ? "whatsapp_envios"
      : kind === "fila"
        ? "whatsapp_filas"
        : kind === "saldo"
          ? "whatsapp_pacote_saloes"
          : null;
  if (!table) notFound();

  const { data } = await (supabase as any)
    .from(table)
    .select(WHATSAPP_DETAIL_COLUMNS[table])
    .eq("id", rawId)
    .maybeSingle();
  if (!data?.id) notFound();

  const row = data as Record<string, unknown>;
  const idSalao = String(row.id_salao || "");
  const { data: salao } = idSalao
    ? await supabase.from("saloes").select("id, nome").eq("id", idSalao).maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6">
      <AdminMasterPageHeader
        eyebrow="WhatsApp"
        title={`Detalhe do ${kind}`}
        description="Contexto do envio, fila ou saldo de créditos para diagnosticar consumo, erro e reprocessamento."
        breadcrumb={[{ label: "Admin Master", href: "/admin-master" }, { label: "WhatsApp", href: "/admin-master/whatsapp" }, { label: "Detalhe" }]}
        actions={<>
          <Link href="/admin-master/whatsapp" className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:border-violet-200 hover:text-violet-700">Voltar</Link>
          {idSalao ? <Link href={`/admin-master/saloes/${idSalao}`} className="inline-flex h-10 items-center rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-700">Abrir salão</Link> : null}
        </>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info label="Salão" value={String(salao?.nome || idSalao || "-")} />
        <Info label="Status" value={String(row.status || "-")} />
        <Info label="Criado" value={dateTime(String(row.criado_em || row.comprado_em || ""))} />
        <Info label="Créditos" value={String(row.custo_creditos ?? row.creditos_saldo ?? row.creditos_usados ?? "-")} />
      </section>

      <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
          Diagnóstico
        </div>
        <div className="mt-4 grid gap-3 text-sm text-zinc-600 md:grid-cols-2">
          <div><span className="font-bold text-zinc-950">Destino:</span> {String(row.destino || "-")}</div>
          <div><span className="font-bold text-zinc-950">Template:</span> {String(row.template || "-")}</div>
          <div><span className="font-bold text-zinc-950">Tentativas:</span> {String(row.tentativas || "0")}</div>
          <div><span className="font-bold text-zinc-950">Processado:</span> {dateTime(String(row.processado_em || row.enviado_em || ""))}</div>
          <div className="md:col-span-2"><span className="font-bold text-zinc-950">Erro:</span> {String(row.ultimo_erro || row.erro_texto || "-")}</div>
        </div>
      </section>

      <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950 shadow-sm">
        Para reprocessar com segurança, use a fila de WhatsApp com auditoria. Se houver erro repetido, abra um ticket
        para o salão antes de consumir novos créditos.
      </section>
    </div>
  );
}
