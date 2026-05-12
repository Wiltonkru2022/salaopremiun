import Link from "next/link";
import { notFound } from "next/navigation";
import type React from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.generated";
import {
  manterSalaoExcluidoAdminMaster,
  restaurarSalaoExcluidoAdminMaster,
} from "../actions";

export const dynamic = "force-dynamic";

type DeletedSalonDetail = {
  id: string;
  id_salao_original: string | null;
  nome_salao: string;
  nome_responsavel: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cpf_cnpj: string | null;
  endereco_completo: string | null;
  cidade: string | null;
  estado: string | null;
  bairro: string | null;
  cep: string | null;
  data_exclusao: string;
  motivo: string | null;
  origem: string | null;
  metadata: Json | null;
  created_at: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function metadataObject(value: Json | null | undefined): Record<string, Json> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, Json>;
}

function metadataString(metadata: Record<string, Json>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function statusInfo(metadata: Record<string, Json>) {
  const status = metadataString(metadata, "admin_master_status") || "pendente";
  if (status === "restaurado") {
    return {
      label: "Restaurado",
      description: "O cadastro básico já foi recolocado em salões ativos.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-900",
      icon: CheckCircle2,
    };
  }
  if (status === "mantido_excluido") {
    return {
      label: "Mantido excluído",
      description: "O Admin Master registrou que este salão deve seguir fora da base ativa.",
      className: "border-zinc-200 bg-zinc-100 text-zinc-800",
      icon: Trash2,
    };
  }
  return {
    label: "Pendente",
    description: "Ainda falta uma decisão de suporte para este registro.",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    icon: Clock3,
  };
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
        {label}
      </div>
      <div className="mt-2 text-sm font-bold leading-6 text-zinc-900">{value}</div>
    </div>
  );
}

export default async function AdminMasterSalaoExcluidoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ ok?: string }>;
}) {
  await requireAdminMasterUser("saloes_ver");
  const { id } = await params;
  const queryParams = searchParams ? await searchParams : {};
  const supabase = getSupabaseAdmin();

  const { data, error } = await (supabase as any)
    .from("reativar_salao")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const row = data as DeletedSalonDetail;
  const metadata = metadataObject(row.metadata);
  const status = statusInfo(metadata);
  const StatusIcon = status.icon;
  const idSalaoRestaurado = metadataString(metadata, "restaurado_id_salao");
  const restauradoEm = metadataString(metadata, "restaurado_em");
  const mantidoEm = metadataString(metadata, "mantido_excluido_em");

  return (
    <div className="space-y-5">
      <Link
        href="/admin-master/saloes-excluidos"
        className="inline-flex items-center gap-2 text-sm font-black text-zinc-600 transition hover:text-zinc-950"
      >
        <ArrowLeft size={16} />
        Voltar para salões excluídos
      </Link>

      {queryParams.ok ? (
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
          Decisão registrada com auditoria.
        </div>
      ) : null}

      <section className="rounded-[30px] bg-zinc-950 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] ${status.className}`}>
              <StatusIcon size={14} />
              {status.label}
            </div>
            <h1 className="mt-4 font-display text-[2rem] font-black">
              {row.nome_salao}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
              {status.description}
            </p>
          </div>

          {idSalaoRestaurado ? (
            <Link
              href={`/admin-master/saloes/${idSalaoRestaurado}`}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20"
            >
              Ver salão restaurado
              <ExternalLink size={16} />
            </Link>
          ) : null}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Responsável" value={row.nome_responsavel || "-"} />
        <InfoCard
          label="Contato"
          value={
            <div className="space-y-1">
              <div>{row.email || "Sem e-mail"}</div>
              <div className="text-zinc-500">{row.whatsapp || row.telefone || "Sem telefone"}</div>
            </div>
          }
        />
        <InfoCard
          label="Local"
          value={[row.cidade, row.estado].filter(Boolean).join(" / ") || "-"}
        />
        <InfoCard label="Excluído em" value={formatDate(row.data_exclusao)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
              <MapPin size={16} />
              Dados capturados na exclusão
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InfoCard label="CPF/CNPJ" value={row.cpf_cnpj || "-"} />
              <InfoCard label="Origem" value={row.origem || "-"} />
              <InfoCard
                label="Endereço"
                value={row.endereco_completo || [row.bairro, row.cep].filter(Boolean).join(" - ") || "-"}
              />
              <InfoCard label="Motivo original" value={row.motivo || "Sem motivo informado."} />
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
              <ShieldCheck size={16} />
              Auditoria do registro
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InfoCard label="Registro criado em" value={formatDate(row.created_at)} />
              <InfoCard label="Salão original" value={row.id_salao_original || "-"} />
              <InfoCard label="Restaurado em" value={formatDate(restauradoEm)} />
              <InfoCard label="Mantido excluído em" value={formatDate(mantidoEm)} />
            </div>
            <details className="mt-4 rounded-[18px] border border-zinc-200 bg-zinc-50 p-4">
              <summary className="cursor-pointer text-sm font-black text-zinc-800">
                Ver metadata técnica
              </summary>
              <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-5 text-zinc-600">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </details>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] opacity-70">
              <RotateCcw size={16} />
              Restaurar
            </div>
            <p className="mt-3 text-sm leading-6 opacity-80">
              Recria o cadastro básico do salão como ativo. Dependências apagadas
              na exclusão não são recriadas automaticamente.
            </p>
            <form action={restaurarSalaoExcluidoAdminMaster} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={row.id} />
              <textarea
                name="motivo"
                rows={4}
                placeholder="Motivo da restauração"
                className="w-full resize-none rounded-2xl border border-emerald-200 bg-white p-3 text-sm font-semibold text-zinc-900 outline-none focus:border-emerald-500"
              />
              <button className="h-11 w-full rounded-2xl bg-emerald-700 px-4 text-sm font-black text-white transition hover:bg-emerald-800">
                Restaurar cadastro básico
              </button>
            </form>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
              <Trash2 size={16} />
              Manter excluído
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Registra que o suporte revisou o caso e decidiu manter o salão fora
              da base ativa.
            </p>
            <form action={manterSalaoExcluidoAdminMaster} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={row.id} />
              <textarea
                name="motivo"
                rows={4}
                placeholder="Motivo da decisão"
                className="w-full resize-none rounded-2xl border border-zinc-200 bg-white p-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-500"
              />
              <button className="h-11 w-full rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white transition hover:bg-zinc-800">
                Manter como excluído
              </button>
            </form>
          </div>

          {row.email ? (
            <a
              href={`mailto:${row.email}`}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-800 shadow-sm transition hover:bg-zinc-50"
            >
              <Mail size={16} />
              Enviar e-mail
            </a>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
