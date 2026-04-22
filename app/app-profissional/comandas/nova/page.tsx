import { redirect } from "next/navigation";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { criarComandaProfissionalAction } from "./actions";

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

export default async function NovaComandaProfissionalPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    redirect("/app-profissional/login");
  }

  const query = searchParams ? await searchParams : {};

  const { clientes, servicos } = await runAdminOperation({
    action: "app_profissional_nova_comanda_page",
    actorId: session.idProfissional,
    idSalao: session.idSalao,
    run: async (supabaseAdmin) => {
      const [{ data: clientesData, error: clientesError }, { data: vinculosData, error: vinculosError }] =
        await Promise.all([
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
      subtitle="Criar atendimento dentro do app"
    >
      <div className="space-y-4 pb-24">
        {query.erro ? (
          <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {query.erro}
          </div>
        ) : null}

        <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Dados da comanda
          </div>

          <form action={criarComandaProfissionalAction} className="space-y-3">
            <select
              name="cliente_id"
              defaultValue={query.cliente_id || ""}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none"
            >
              <option value="">Selecione o cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                  {cliente.telefone ? ` - ${cliente.telefone}` : ""}
                </option>
              ))}
            </select>

            <select
              name="servico_id"
              defaultValue={query.servico_id || ""}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none"
            >
              <option value="">Selecione o servico inicial</option>
              {servicos.map((servico) => (
                <option key={servico.id} value={servico.id}>
                  {servico.nome}
                  {servico.duracao_minutos
                    ? ` - ${servico.duracao_minutos} min`
                    : ""}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                name="data"
                defaultValue={query.data || hojeLocal()}
                className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none"
              />

              <input
                type="time"
                name="hora_inicio"
                defaultValue={query.hora_inicio || horaAtualArredondada()}
                className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none"
              />
            </div>

            <textarea
              name="observacoes"
              defaultValue={query.observacoes || ""}
              placeholder="Observacoes da comanda (opcional)"
              className="min-h-[96px] w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none"
            />

            <button className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-semibold text-white">
              Criar comanda no app
            </button>
          </form>
        </div>

        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Esta comanda sera vinculada a um atendimento rapido na agenda do
          profissional, mantendo tudo dentro do app profissional.
        </div>
      </div>
    </ProfissionalShell>
  );
}
