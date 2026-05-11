import Link from "next/link";
import { ArrowUpRight, MessageCircle, Phone, RotateCcw } from "lucide-react";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function onlyDigits(value: string | null | undefined) {
  return String(value || "").replace(/\D/g, "");
}

export default async function AdminMasterSaloesExcluidosPage() {
  await requireAdminMasterUser("saloes_ver");

  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as any)
    .from("reativar_salao")
    .select(
      "id, id_salao_original, nome_salao, nome_responsavel, email, telefone, whatsapp, cpf_cnpj, endereco_completo, cidade, estado, bairro, cep, data_exclusao, motivo, origem"
    )
    .order("data_exclusao", { ascending: false })
    .limit(100);

  const rows = ((data || []) as SalaoExcluidoRow[]) || [];

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
              Lista de salões que apagaram a conta pelo painel. Use estes dados
              mínimos para acompanhamento, marketing e reativação assistida.
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
            {rows.length}
          </div>
          <p className="mt-1 text-sm text-zinc-500">Últimos 100 salões excluídos.</p>
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

      <section className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-sm">
        <div className="scroll-premium overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-100 text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.18em] text-zinc-500">
              <tr>
                <th className="px-4 py-3.5 font-bold">Salão</th>
                <th className="px-4 py-3.5 font-bold">Responsável</th>
                <th className="px-4 py-3.5 font-bold">Contato</th>
                <th className="px-4 py-3.5 font-bold">Cidade</th>
                <th className="px-4 py-3.5 font-bold">Exclusão</th>
                <th className="px-4 py-3.5 font-bold">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.length ? (
                rows.map((row) => {
                  const phone = onlyDigits(row.whatsapp || row.telefone);
                  const whatsappPhone = phone.startsWith("55")
                    ? phone
                    : `55${phone}`;
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
                        <div>{[row.cidade, row.estado].filter(Boolean).join(" / ") || "-"}</div>
                        <div className="mt-1 truncate text-xs text-zinc-500">
                          {row.endereco_completo || [row.bairro, row.cep].filter(Boolean).join(" - ") || "-"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-zinc-700">
                        {formatDate(row.data_exclusao)}
                      </td>
                      <td className="max-w-[320px] whitespace-normal px-4 py-3.5 leading-5 text-zinc-700">
                        {row.motivo || "Sem motivo informado."}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    Nenhum salão excluído registrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
