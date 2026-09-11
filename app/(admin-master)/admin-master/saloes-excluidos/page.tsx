import Link from "next/link";
import {
  ArrowUpRight,
  Eye,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
} from "lucide-react";
import AdminMasterPageHeader from "@/components/admin-master/AdminMasterPageHeader";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import PaginationLinks from "@/components/ui/PaginationLinks";
import type { Json } from "@/types/database.generated";

export const dynamic = "force-dynamic";

type SalaoExcluidoRow = {
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
};

const SALOES_EXCLUIDOS_PAGE_SIZE = 10;

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Campo_Grande",
  }).format(date);
}

function onlyDigits(value: string | null | undefined) {
  return String(value || "").replace(/\D/g, "");
}

function metadataObject(value: Json | null | undefined): Record<string, Json> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, Json>;
}

function deletedSalonStatus(row: Pick<SalaoExcluidoRow, "metadata">) {
  const metadata = metadataObject(row.metadata);
  const status = metadata.admin_master_status;
  return typeof status === "string" && status.trim() ? status : "pendente";
}

function statusLabel(status: string) {
  if (status === "restaurado") return "Restaurado";
  if (status === "mantido_excluido") return "Mantido excluído";
  return "Pendente";
}

function statusClass(status: string) {
  if (status === "restaurado") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "mantido_excluido") {
    return "border-zinc-200 bg-zinc-100 text-zinc-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function contactInfo(row: SalaoExcluidoRow) {
  const phone = onlyDigits(row.whatsapp || row.telefone);
  return {
    phone,
    whatsappPhone: phone ? (phone.startsWith("55") ? phone : `55${phone}`) : "",
  };
}

export default async function AdminMasterSaloesExcluidosPage({
  searchParams,
}: {
  searchParams?: Promise<{ pagina?: string; busca?: string; status?: string }>;
}) {
  await requireAdminMasterUser("saloes_ver");
  const params = searchParams ? await searchParams : {};
  const paginaAtual = Math.max(0, Number(params?.pagina || 1) - 1);
  const busca = String(params?.busca || "").trim();
  const safeBusca = busca.replace(/[,%()]/g, " ").trim().slice(0, 80);
  const status = String(params?.status || "todos").trim();
  const from = paginaAtual * SALOES_EXCLUIDOS_PAGE_SIZE;
  const to = from + SALOES_EXCLUIDOS_PAGE_SIZE - 1;

  const supabase = getSupabaseAdmin();
  let query = (supabase as any)
    .from("reativar_salao")
    .select(
      "id, id_salao_original, nome_salao, nome_responsavel, email, telefone, whatsapp, cpf_cnpj, endereco_completo, cidade, estado, bairro, cep, data_exclusao, motivo, origem, metadata",
      { count: "exact" }
    );

  if (safeBusca) {
    query = query.or(
      `nome_salao.ilike.%${safeBusca}%,nome_responsavel.ilike.%${safeBusca}%,email.ilike.%${safeBusca}%,cidade.ilike.%${safeBusca}%`
    );
  }

  if (status !== "todos" && status !== "pendente") {
    query = query.filter("metadata->>admin_master_status", "eq", status);
  }

  const { data, error, count } = await query
    .order("data_exclusao", { ascending: false })
    .range(from, to);

  const loadedRows = ((data || []) as SalaoExcluidoRow[]) || [];
  const rows =
    status === "pendente"
      ? loadedRows.filter((row) => deletedSalonStatus(row) === "pendente")
      : loadedRows;
  const totalRows = count || 0;
  const queryBase = new URLSearchParams();
  if (busca) queryBase.set("busca", busca);
  if (status && status !== "todos") queryBase.set("status", status);

  return (
    <div className="space-y-5">
      <AdminMasterPageHeader
        eyebrow="Recuperação"
        title="Salões excluídos"
        description="Acompanhe contas apagadas, registre a decisão do suporte e restaure um cadastro básico quando houver solicitação legítima."
        actions={<Link href="/admin-master/saloes" className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-bold text-violet-700 transition hover:bg-violet-100">Ver salões ativos <ArrowUpRight size={16} /></Link>}
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">
          Não foi possível carregar os salões excluídos agora.
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Registros</div>
          <div className="mt-2.5 text-3xl font-black text-zinc-950">{totalRows}</div>
          <p className="mt-1 text-sm text-zinc-500">Base de reativação e auditoria.</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">Com telefone</div>
          <div className="mt-2.5 text-3xl font-black">{rows.filter((row) => onlyDigits(row.whatsapp || row.telefone)).length}</div>
          <p className="mt-1 text-sm opacity-75">Prontos para contato humano nesta página.</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm sm:col-span-2 xl:col-span-1">
          <div className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">Com e-mail</div>
          <div className="mt-2.5 text-3xl font-black">{rows.filter((row) => row.email).length}</div>
          <p className="mt-1 text-sm opacity-75">Contatos disponíveis nesta página.</p>
        </div>
      </section>

      <form className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_auto]">
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            name="busca"
            defaultValue={busca}
            placeholder="Buscar por salão, responsável, e-mail ou cidade"
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
          />
        </label>
        <select
          name="status"
          defaultValue={status}
          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
        >
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="restaurado">Restaurado</option>
          <option value="mantido_excluido">Mantido excluído</option>
        </select>
        <button className="h-11 rounded-xl bg-violet-700 px-5 text-sm font-black text-white transition hover:bg-violet-800">
          Filtrar
        </button>
      </form>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="grid gap-3 p-3 md:hidden">
          {rows.length ? rows.map((row) => {
            const rowStatus = deletedSalonStatus(row);
            const { phone, whatsappPhone } = contactInfo(row);
            return (
              <article key={row.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-black text-zinc-950">{row.nome_salao}</div>
                    <div className="mt-1 text-xs font-semibold text-zinc-500">{row.nome_responsavel || "Responsável não informado"}</div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black ${statusClass(rowStatus)}`}>{statusLabel(rowStatus)}</span>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-zinc-600">
                  {row.email ? <a href={`mailto:${row.email}`} className="flex min-w-0 items-center gap-2 rounded-xl bg-zinc-50 p-2.5 font-semibold"><Mail size={14} className="shrink-0 text-zinc-400" /><span className="truncate">{row.email}</span></a> : null}
                  <div className="flex items-start gap-2 rounded-xl bg-zinc-50 p-2.5"><MapPin size={14} className="mt-0.5 shrink-0 text-zinc-400" /><span>{[row.cidade, row.estado].filter(Boolean).join(" / ") || "Local não informado"}</span></div>
                  <div className="rounded-xl bg-zinc-50 p-2.5"><span className="font-bold text-zinc-500">Excluído:</span> {formatDate(row.data_exclusao)}</div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {phone ? <a href={`tel:${phone}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-xs font-black text-zinc-700"><Phone size={14} />Ligar</a> : <span />}
                  {whatsappPhone ? <a href={`https://wa.me/${whatsappPhone}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-black text-emerald-800"><MessageCircle size={14} />WhatsApp</a> : null}
                  <Link href={`/admin-master/saloes-excluidos/${row.id}`} className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-700 text-xs font-black text-white hover:bg-violet-800"><Eye size={14} />Ver detalhes</Link>
                </div>
              </article>
            );
          }) : <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">Nenhum salão excluído encontrado com estes filtros.</div>}
        </div>

        <div className="scroll-premium hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-zinc-100 text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="px-4 py-3.5 font-bold">Salão</th>
                <th className="px-4 py-3.5 font-bold">Status</th>
                <th className="px-4 py-3.5 font-bold">Responsável</th>
                <th className="px-4 py-3.5 font-bold">Contato</th>
                <th className="px-4 py-3.5 font-bold">Cidade</th>
                <th className="px-4 py-3.5 font-bold">Exclusão</th>
                <th className="px-4 py-3.5 font-bold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.length ? rows.map((row) => {
                const { phone, whatsappPhone } = contactInfo(row);
                const rowStatus = deletedSalonStatus(row);
                return (
                  <tr key={row.id}>
                    <td className="max-w-[280px] px-4 py-3.5"><div className="font-black text-zinc-950">{row.nome_salao}</div><div className="mt-1 text-xs text-zinc-500">{row.id_salao_original || "-"}</div></td>
                    <td className="px-4 py-3.5"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${statusClass(rowStatus)}`}>{statusLabel(rowStatus)}</span></td>
                    <td className="max-w-[240px] px-4 py-3.5"><div className="font-semibold text-zinc-800">{row.nome_responsavel || "-"}</div><div className="mt-1 text-xs text-zinc-500">{row.cpf_cnpj || "-"}</div></td>
                    <td className="max-w-[260px] px-4 py-3.5">
                      <div className="space-y-1.5">
                        {row.email ? <a href={`mailto:${row.email}`} className="block font-semibold text-zinc-800 hover:text-violet-700">{row.email}</a> : <span className="block text-zinc-500">Sem e-mail</span>}
                        {phone ? <div className="flex flex-wrap gap-2"><a href={`tel:${phone}`} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-black text-zinc-700"><Phone size={12} />Ligar</a><a href={`https://wa.me/${whatsappPhone}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800"><MessageCircle size={12} />WhatsApp</a></div> : null}
                      </div>
                    </td>
                    <td className="max-w-[260px] px-4 py-3.5 text-zinc-700"><div>{[row.cidade, row.estado].filter(Boolean).join(" / ") || "-"}</div><div className="mt-1 truncate text-xs text-zinc-500">{row.endereco_completo || [row.bairro, row.cep].filter(Boolean).join(" - ") || "-"}</div></td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-zinc-700">{formatDate(row.data_exclusao)}</td>
                    <td className="px-4 py-3.5"><Link href={`/admin-master/saloes-excluidos/${row.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-700 px-3 text-xs font-black text-white transition hover:bg-violet-800"><Eye size={14} />Detalhes</Link></td>
                  </tr>
                );
              }) : <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-500">Nenhum salão excluído encontrado com estes filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <PaginationLinks
        currentPage={paginaAtual}
        pageSize={SALOES_EXCLUIDOS_PAGE_SIZE}
        totalItems={totalRows}
        getHref={(page) => {
          const nextParams = new URLSearchParams(queryBase);
          nextParams.set("pagina", String(page + 1));
          return `/admin-master/saloes-excluidos?${nextParams.toString()}`;
        }}
      />
    </div>
  );
}
