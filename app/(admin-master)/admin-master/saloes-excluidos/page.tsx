import Link from "next/link";
import {
  ArrowUpRight,
  Eye,
  MessageCircle,
  Phone,
  RotateCcw,
  Search,
} from "lucide-react";
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
    timeZone: "America/Sao_Paulo",
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

export default async function AdminMasterSaloesExcluidosPage({
  searchParams,
}: {
  searchParams?: Promise<{ pagina?: string; busca?: string; status?: string }>;
}) {
  await requireAdminMasterUser("saloes_ver");
  const params = searchParams ? await searchParams : {};
  const paginaAtual = Math.max(0, Number(params?.pagina || 1) - 1);
  const busca = String(params?.busca || "").trim();
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

  if (busca) {
    query = query.or(
      `nome_salao.ilike.%${busca}%,nome_responsavel.ilike.%${busca}%,email.ilike.%${busca}%,cidade.ilike.%${busca}%`
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
      <section className="rounded-[28px] bg-zinc-950 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-amber-100">
              <RotateCcw size={14} />
              Recuperação
            </div>
            <h1 className="mt-4 font-display text-[2rem] font-black">
              Salões excluídos
            </h1>
            <p className="mt-2.5 max-w-3xl text-sm leading-6 text-zinc-300">
              Acompanhe contas apagadas, registre a decisão do suporte e
              restaure um cadastro básico quando houver solicitação legítima.
            </p>
          </div>

          <Link
            href="/admin-master/saloes"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20"
          >
            Ver salões ativos
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">
          Não foi possível carregar os salões excluídos agora.
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">
            Registros
          </div>
          <div className="mt-2.5 font-display text-[2rem] font-black">
            {totalRows}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Base de reativação e auditoria.
          </p>
        </div>
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.24em] opacity-70">
            Com telefone
          </div>
          <div className="mt-2.5 font-display text-[2rem] font-black">
            {rows.filter((row) => onlyDigits(row.whatsapp || row.telefone)).length}
          </div>
          <p className="mt-1 text-sm opacity-75">Prontos para contato humano.</p>
        </div>
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.24em] opacity-70">
            Com e-mail
          </div>
          <div className="mt-2.5 font-display text-[2rem] font-black">
            {rows.filter((row) => row.email).length}
          </div>
          <p className="mt-1 text-sm opacity-75">Base para recuperação por campanha.</p>
        </div>
      </section>

      <form className="grid gap-3 rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_auto]">
        <label className="relative block">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            name="busca"
            defaultValue={busca}
            placeholder="Buscar por salão, responsável, e-mail ou cidade"
            className="h-11 w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-zinc-400"
          />
        </label>
        <select
          name="status"
          defaultValue={status}
          className="h-11 rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-bold outline-none transition focus:border-zinc-400"
        >
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="restaurado">Restaurado</option>
          <option value="mantido_excluido">Mantido excluído</option>
        </select>
        <button className="h-11 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white transition hover:bg-zinc-800">
          Filtrar
        </button>
      </form>

      <section className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-sm">
        <div className="scroll-premium overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-100 text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.18em] text-zinc-500">
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
              {rows.length ? (
                rows.map((row) => {
                  const phone = onlyDigits(row.whatsapp || row.telefone);
                  const whatsappPhone = phone.startsWith("55")
                    ? phone
                    : `55${phone}`;
                  const rowStatus = deletedSalonStatus(row);
                  return (
                    <tr key={row.id} className="hover:bg-zinc-50/80">
                      <td className="max-w-[280px] px-4 py-3.5">
                        <div className="font-black text-zinc-950">
                          {row.nome_salao}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {row.id_salao_original || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${statusClass(rowStatus)}`}
                        >
                          {statusLabel(rowStatus)}
                        </span>
                      </td>
                      <td className="max-w-[240px] px-4 py-3.5">
                        <div className="font-semibold text-zinc-800">
                          {row.nome_responsavel || "-"}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {row.cpf_cnpj || "-"}
                        </div>
                      </td>
                      <td className="max-w-[260px] px-4 py-3.5">
                        <div className="space-y-1.5">
                          {row.email ? (
                            <a
                              href={`mailto:${row.email}`}
                              className="block font-semibold text-zinc-800 hover:text-zinc-950"
                            >
                              {row.email}
                            </a>
                          ) : (
                            <span className="block text-zinc-500">Sem e-mail</span>
                          )}
                          {phone ? (
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={`tel:${phone}`}
                                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black text-zinc-700"
                              >
                                <Phone size={12} />
                                Ligar
                              </a>
                              <a
                                href={`https://wa.me/${whatsappPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800"
                              >
                                <MessageCircle size={12} />
                                WhatsApp
                              </a>
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="max-w-[260px] px-4 py-3.5 text-zinc-700">
                        <div>
                          {[row.cidade, row.estado].filter(Boolean).join(" / ") || "-"}
                        </div>
                        <div className="mt-1 truncate text-xs text-zinc-500">
                          {row.endereco_completo ||
                            [row.bairro, row.cep].filter(Boolean).join(" - ") ||
                            "-"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-zinc-700">
                        {formatDate(row.data_exclusao)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/admin-master/saloes-excluidos/${row.id}`}
                          className="inline-flex h-9 items-center gap-2 rounded-full bg-zinc-950 px-3 text-xs font-black text-white transition hover:bg-zinc-800"
                        >
                          <Eye size={14} />
                          Detalhes
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    Nenhum salão excluído encontrado com estes filtros.
                  </td>
                </tr>
              )}
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
