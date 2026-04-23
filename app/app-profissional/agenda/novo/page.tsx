import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { buscarConfiguracaoAgendaProfissional } from "@/app/services/profissional/agenda";
import { criarAgendamentoProfissionalAction } from "../actions";

function hojeISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

type SearchParams = Promise<{
  cliente_id?: string;
  servico_id?: string;
  data?: string;
  hora_inicio?: string;
  observacoes?: string;
  erro?: string;
  conflito?: string;
  conflito_msg?: string;
  agendamento_id?: string;
}>;

type DiaTrabalho = {
  dia: string;
  ativo: boolean;
  inicio: string;
  fim: string;
};

type Pausa = {
  inicio: string;
  fim: string;
  descricao?: string | null;
};

type ClienteOption = {
  id: string;
  nome: string;
  telefone?: string | null;
};

type ServicoOption = {
  id: string;
  nome: string;
  duracao_minutos?: number | string | null;
};

type AgendaDiaRow = {
  id: string;
  hora_inicio: string;
  hora_fim: string;
  status: string;
  clientes?: { nome?: string | null } | { nome?: string | null }[] | null;
  servicos?: { nome?: string | null } | { nome?: string | null }[] | null;
};

export default async function NovoAgendamentoProfissionalPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await requireProfissionalAppContext();

  const query = searchParams ? await searchParams : {};
  const dataSelecionada = query?.data || hojeISO();

  const [
    configProfissional,
    agendaPageData,
  ] = await Promise.all([
      buscarConfiguracaoAgendaProfissional(
        session.idSalao,
        session.idProfissional
      ),
      runAdminOperation({
        action: "app_profissional_agenda_novo_page",
        actorId: session.idProfissional,
        idSalao: session.idSalao,
        run: async (supabaseAdmin) => {
          const [
            clientesResult,
            servicosResult,
            vinculosServicosResult,
            agendaDiaResult,
          ] = await Promise.all([
            supabaseAdmin
              .from("clientes")
              .select("id, nome, telefone")
              .eq("id_salao", session.idSalao)
              .in("ativo", ["true", "ativo"])
              .order("nome", { ascending: true }),

            supabaseAdmin
              .from("servicos")
              .select("id, nome, duracao_minutos, ativo")
              .eq("id_salao", session.idSalao)
              .eq("ativo", true)
              .order("nome", { ascending: true }),

            supabaseAdmin
              .from("profissional_servicos")
              .select("id_servico")
              .eq("id_salao", session.idSalao)
              .eq("id_profissional", session.idProfissional)
              .eq("ativo", true),

            supabaseAdmin
              .from("agendamentos")
              .select(
                "id, hora_inicio, hora_fim, status, clientes ( id, nome ), servicos ( id, nome )"
              )
              .eq("id_salao", session.idSalao)
              .eq("profissional_id", session.idProfissional)
              .eq("data", dataSelecionada)
              .not("status", "eq", "cancelado")
              .order("hora_inicio", { ascending: true }),
          ]);

          return {
            clientesResult,
            servicosResult,
            vinculosServicosResult,
            agendaDiaResult,
          };
        },
      }),
    ]);

  const {
    clientesResult,
    servicosResult,
    vinculosServicosResult,
    agendaDiaResult,
  } = agendaPageData;

  if (clientesResult.error) {
    throw new Error(clientesResult.error.message);
  }

  if (servicosResult.error) {
    throw new Error(servicosResult.error.message);
  }

  if (vinculosServicosResult.error) {
    throw new Error(vinculosServicosResult.error.message);
  }

  if (agendaDiaResult.error) {
    throw new Error(agendaDiaResult.error.message);
  }

  const clientes = clientesResult.data ?? [];
  const idsServicosLiberados = new Set(
    (vinculosServicosResult.data ?? []).map((item) => item.id_servico).filter(Boolean)
  );
  const servicos = (servicosResult.data ?? []).filter((servico) =>
    idsServicosLiberados.has(servico.id)
  );
  const agendaDia = ((agendaDiaResult.data ?? []) as AgendaDiaRow[]).map((item) => ({
    id: item.id,
    hora_inicio: String(item.hora_inicio).slice(0, 5),
    hora_fim: String(item.hora_fim).slice(0, 5),
    cliente_nome: Array.isArray(item.clientes)
      ? item.clientes[0]?.nome
      : item.clientes?.nome || "Cliente",
    servico_nome: Array.isArray(item.servicos)
      ? item.servicos[0]?.nome
      : item.servicos?.nome || "Serviço",
    status: item.status,
  }));

  return (
    <ProfissionalShell
      title="Novo agendamento"
      subtitle="Criar atendimento na agenda"
    >
      <div className="space-y-4 pb-24">
        {query?.erro ? (
          <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {query.erro}
          </div>
        ) : null}

        {query?.conflito === "1" ? (
          <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
            {query.conflito_msg ||
              "Já existe horário ocupado. Confirme se deseja agendar mesmo assim."}
          </div>
        ) : null}

        <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Regras do profissional
          </div>

          <div className="mt-3 text-sm text-zinc-600">
            Dias ativos:{" "}
            {configProfissional.diasTrabalho.filter((d: DiaTrabalho) => d.ativo).length
              ? configProfissional.diasTrabalho
                  .filter((d: DiaTrabalho) => d.ativo)
                  .map((d: DiaTrabalho) => d.dia)
                  .join(", ")
              : "Nenhum dia ativo configurado"}
          </div>

          {configProfissional.pausas.length ? (
            <div className="mt-2 text-sm text-zinc-600">
              Pausas:{" "}
              {configProfissional.pausas
                .map(
                  (p: Pausa) =>
                    `${String(p.inicio).slice(0, 5)} - ${String(p.fim).slice(0, 5)}${
                      p.descricao ? ` (${p.descricao})` : ""
                    }`
                )
                .join(", ")}
            </div>
          ) : (
            <div className="mt-2 text-sm text-zinc-500">
              Sem pausas configuradas.
            </div>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Criar agendamento
          </div>

          <form
            action={criarAgendamentoProfissionalAction}
            className="space-y-3"
          >
            <select
              name="cliente_id"
              defaultValue={query?.cliente_id || ""}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none"
            >
              <option value="">Selecione o cliente</option>
              {(clientes as ClienteOption[]).map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                  {cliente.telefone ? ` · ${cliente.telefone}` : ""}
                </option>
              ))}
            </select>

            <select
              name="servico_id"
              defaultValue={query?.servico_id || ""}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none"
            >
              <option value="">Selecione o serviço</option>
              {(servicos as ServicoOption[]).map((servico) => (
                <option key={servico.id} value={servico.id}>
                  {servico.nome}
                  {servico.duracao_minutos
                    ? ` · ${servico.duracao_minutos} min`
                    : ""}
                </option>
              ))}
            </select>

            <input
              type="date"
              name="data"
              defaultValue={dataSelecionada}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none"
            />

            <input
              type="time"
              name="hora_inicio"
              defaultValue={query?.hora_inicio || ""}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none"
            />

            <textarea
              name="observacoes"
              defaultValue={query?.observacoes || ""}
              placeholder="Observações (opcional)"
              className="min-h-[100px] w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none"
            />

            {query?.conflito === "1" ? (
              <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <input
                  type="checkbox"
                  name="confirmar_conflito"
                  value="true"
                  className="mt-1"
                />
                Confirmo que desejo agendar mesmo com outro cliente neste horário.
              </label>
            ) : null}

          <button className="h-12 w-full rounded-2xl bg-zinc-950 text-sm font-semibold text-white">
              Confirmar agendamento
            </button>
          </form>
        </div>

        <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Agendamentos já existentes no dia
          </div>

          {agendaDia.length ? (
            <div className="space-y-3">
              {agendaDia.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1.25rem] border border-zinc-100 bg-zinc-50 p-3"
                >
                  <div className="text-sm font-semibold text-zinc-950">
                    {item.hora_inicio} - {item.hora_fim}
                  </div>

                  <div className="mt-1 text-sm text-zinc-900">
                    {item.cliente_nome}
                  </div>

                  <div className="mt-1 text-sm text-zinc-500">
                    {item.servico_nome}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
              Nenhum agendamento neste dia.
            </div>
          )}
        </div>
      </div>
    </ProfissionalShell>
  );
}
