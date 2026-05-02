import { Clock3, Receipt, Sparkles, UserRound } from "lucide-react";
import { criarComandaProfissionalAction } from "@/app/app-profissional/comandas/nova/actions";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalSectionHeader from "@/components/profissional/ui/ProfissionalSectionHeader";
import ProfissionalSurface from "@/components/profissional/ui/ProfissionalSurface";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

type SearchParams = Promise<{
  cliente_id?: string;
  servico_id?: string;
  data?: string;
  hora_inicio?: string;
  observacoes?: string;
  erro?: string;
}>;

type ClienteOption = {
  id: string;
  nome: string;
  telefone?: string | null;
};

type ServicoOption = {
  id: string;
  nome: string;
  duracao_minutos?: number | null;
};

function hojeLocal() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function horaAtualArredondada() {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  return now.toTimeString().slice(0, 5);
}

function inputClass() {
  return "mt-2 h-11 w-full rounded-[18px] border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400";
}

export default async function NovaComandaProfissionalPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await requireProfissionalAppContext();
  const query = searchParams ? await searchParams : {};

  const { clientes, servicos } = await runAdminOperation({
    action: "app_profissional_nova_comanda_page",
    actorId: session.idProfissional,
    idSalao: session.idSalao,
    run: async (supabaseAdmin) => {
      const [
        { data: clientesData, error: clientesError },
        { data: vinculosData, error: vinculosError },
      ] = await Promise.all([
        supabaseAdmin
          .from("clientes")
          .select("id, nome, telefone")
          .eq("id_salao", session.idSalao)
          .order("nome", { ascending: true })
          .limit(80),
        supabaseAdmin
          .from("profissional_servicos")
          .select("id_servico")
          .eq("id_salao", session.idSalao)
          .eq("id_profissional", session.idProfissional)
          .eq("ativo", true),
      ]);

      if (clientesError) throw new Error(clientesError.message);
      if (vinculosError) throw new Error(vinculosError.message);

      const idsServicos = Array.from(
        new Set((vinculosData || []).map((item) => item.id_servico).filter(Boolean))
      );

      if (!idsServicos.length) {
        return {
          clientes: (clientesData || []) as ClienteOption[],
          servicos: [] as ServicoOption[],
        };
      }

      const { data: servicosData, error: servicosError } = await supabaseAdmin
        .from("servicos")
        .select("id, nome, duracao_minutos, ativo, status")
        .eq("id_salao", session.idSalao)
        .in("id", idsServicos)
        .eq("ativo", true)
        .eq("status", "ativo")
        .order("nome", { ascending: true });

      if (servicosError) throw new Error(servicosError.message);

      return {
        clientes: (clientesData || []) as ClienteOption[],
        servicos: (servicosData || []) as ServicoOption[],
      };
    },
  });

  return (
    <ProfissionalShell
      title="Nova comanda"
      subtitle="Abrir atendimento direto no app"
    >
      <div className="space-y-3.5 pb-20">
        {query.erro ? (
          <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {query.erro}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[1.5rem] bg-zinc-950 px-4 py-4 text-white shadow-[0_16px_34px_rgba(15,23,42,0.15)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100">
                <Receipt size={14} />
                Atendimento rapido
              </div>
              <h1 className="mt-3 text-[1.45rem] font-black tracking-[-0.04em] leading-none">
                Abrir comanda
              </h1>
              <p className="mt-2.5 text-sm leading-6 text-zinc-300">
                Crie a comanda e o atendimento de uma vez, sem sair do app
                profissional.
              </p>
            </div>

            <div className="rounded-[1.1rem] bg-white/10 px-4 py-2.5 text-right">
              <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                Fluxo
              </div>
              <div className="mt-1 text-sm font-bold text-white">App - agenda - caixa</div>
            </div>
          </div>
        </section>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Dados da comanda"
            description="Escolha cliente, servico e horario para abrir tudo pronto."
          />

          <form action={criarComandaProfissionalAction} className="space-y-3.5">
            <label className="block text-sm font-medium text-zinc-700">
              Cliente
              <select
                name="cliente_id"
                defaultValue={query.cliente_id || ""}
                className={inputClass()}
                required
              >
                <option value="">Selecione o cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                    {cliente.telefone ? ` - ${cliente.telefone}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-zinc-700">
              Servico inicial
              <select
                name="servico_id"
                defaultValue={query.servico_id || ""}
                className={inputClass()}
                required
              >
                <option value="">Selecione o servico inicial</option>
                {servicos.map((servico) => (
                  <option key={servico.id} value={servico.id}>
                    {servico.nome}
                    {servico.duracao_minutos ? ` - ${servico.duracao_minutos} min` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="block text-sm font-medium text-zinc-700">
                Data
                <input
                  type="date"
                  name="data"
                  defaultValue={query.data || hojeLocal()}
                  className={inputClass()}
                  required
                />
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Hora
                <input
                  type="time"
                  name="hora_inicio"
                  defaultValue={query.hora_inicio || horaAtualArredondada()}
                  className={inputClass()}
                  required
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-zinc-700">
              Observacoes
              <textarea
                name="observacoes"
                defaultValue={query.observacoes || ""}
                placeholder="Ex.: cliente ja chegou e vai iniciar atendimento"
                className="mt-2 min-h-[90px] w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
              />
            </label>

            <button className="h-11 w-full rounded-[18px] bg-zinc-950 text-sm font-bold text-white">
              Criar comanda no app
            </button>
          </form>
        </ProfissionalSurface>

        <div className="grid grid-cols-2 gap-2.5">
          <ProfissionalSurface>
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <UserRound size={16} />
              Cliente pronto
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              O cliente precisa estar cadastrado para abrir a comanda sem erro.
            </p>
          </ProfissionalSurface>

          <ProfissionalSurface>
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Clock3 size={16} />
              Hora reservada
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              O atendimento ja nasce vinculado ao horario informado.
            </p>
          </ProfissionalSurface>
        </div>

        <ProfissionalSurface>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-emerald-50 text-emerald-700">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold tracking-[-0.02em] text-zinc-950">
                Fluxo mais rapido
              </div>
              <p className="mt-1.5 text-sm leading-6 text-zinc-500">
                Esse atalho existe para o profissional nao precisar voltar ao painel:
                a comanda ja sai pronta para continuar no app e depois seguir ao caixa.
              </p>
            </div>
          </div>
        </ProfissionalSurface>
      </div>
    </ProfissionalShell>
  );
}
