import Link from "next/link";
import type { ReactNode } from "react";
import { criarTicketInternoAdminMaster } from "@/app/(admin-master)/admin-master/tickets/novo/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const categorias = [
  { value: "suporte", label: "Suporte" },
  { value: "assinatura", label: "Assinatura" },
  { value: "cobranca", label: "Cobrança" },
  { value: "agenda", label: "Agenda" },
  { value: "caixa", label: "Caixa" },
  { value: "comanda", label: "Comanda" },
  { value: "comissao", label: "Comissão" },
  { value: "estoque", label: "Estoque" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "acesso", label: "Acesso" },
  { value: "bug", label: "Bug" },
  { value: "melhoria", label: "Melhoria" },
];

const prioridades = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
];

function Field({
  label,
  children,
  span = false,
}: {
  label: string;
  children: ReactNode;
  span?: boolean;
}) {
  return (
    <label className={span ? "block md:col-span-2" : "block"}>
      <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

export default async function AdminMasterNovoTicketPage({
  searchParams,
}: {
  searchParams?: Promise<{ salao?: string; assunto?: string }>;
}) {
  await requireAdminMasterUser("tickets_editar");
  const params = searchParams ? await searchParams : {};
  const supabase = getSupabaseAdmin();
  const { data: saloes } = await supabase
    .from("saloes")
    .select("id, nome, cidade, estado, plano, status")
    .order("nome", { ascending: true })
    .limit(500);

  const saloesOptions = ((saloes || []) as Array<{
    id: string;
    nome?: string | null;
    cidade?: string | null;
    estado?: string | null;
    plano?: string | null;
    status?: string | null;
  }>).map((salao) => ({
    id: salao.id,
    label: [
      salao.nome || salao.id,
      [salao.cidade, salao.estado].filter(Boolean).join("/") || null,
      salao.plano ? `Plano ${salao.plano}` : null,
      salao.status ? `Status ${salao.status}` : null,
    ]
      .filter(Boolean)
      .join(" • "),
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-[34px] bg-zinc-950 p-7 text-white shadow-sm">
        <Link href="/admin-master/tickets" className="text-sm font-bold text-amber-200">
          Voltar para tickets
        </Link>
        <h1 className="mt-4 font-display text-4xl font-black">
          Novo ticket interno
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
          Abra um ticket para acompanhar problema de salão, cobrança, acesso,
          agenda, caixa ou qualquer investigação que precisa de dono e histórico.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form
          action={criarTicketInternoAdminMaster}
          className="grid gap-5 rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm md:grid-cols-2"
        >
          <Field label="Salão" span>
            <select
              name="id_salao"
              required
              defaultValue={params.salao || ""}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
            >
              <option value="">Escolha o salão</option>
              {saloesOptions.map((salao) => (
                <option key={salao.id} value={salao.id}>
                  {salao.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Categoria">
            <select
              name="categoria"
              defaultValue="suporte"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
            >
              {categorias.map((categoria) => (
                <option key={categoria.value} value={categoria.value}>
                  {categoria.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Prioridade">
            <select
              name="prioridade"
              defaultValue="media"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
            >
              {prioridades.map((prioridade) => (
                <option key={prioridade.value} value={prioridade.value}>
                  {prioridade.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Assunto" span>
            <input
              name="assunto"
              required
              defaultValue={params.assunto || ""}
              placeholder="Ex: Salão com falha ao finalizar comanda"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
            />
          </Field>

          <Field label="Mensagem interna" span>
            <textarea
              name="mensagem"
              required
              rows={8}
              placeholder="Descreva o que está acontecendo, onde apareceu, impacto, próximos passos e qualquer ID de log ou alerta."
              className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
            />
          </Field>

          <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row">
            <Link
              href="/admin-master/tickets"
              className="flex-1 rounded-2xl border border-zinc-200 px-4 py-3 text-center text-sm font-black text-zinc-800 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              className="flex-1 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
            >
              Criar ticket
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-blue-200 bg-blue-50 p-5 text-blue-950">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-blue-700">
              Como usar
            </div>
            <h2 className="mt-3 font-display text-2xl font-black">
              Ticket vira trilha de resolução
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-blue-800">
              Use quando o problema precisa ser acompanhado até fechar:
              instabilidade, cobrança travada, erro de página, dúvida do salão
              ou ação manual do Admin Master.
            </p>
          </div>
          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
              Dica
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Depois de criar, a tela do ticket permite responder, alterar status
              e registrar o que foi feito. Assim suporte, logs e salão ficam no
              mesmo contexto.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
