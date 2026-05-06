import { CalendarPlus2, Clock3, UsersRound } from "lucide-react";
import { buscarConfiguracaoAgendaProfissional } from "@/app/services/profissional/agenda";
import { criarAgendamentoProfissionalAction } from "@/app/app-profissional/agenda/actions";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalSectionHeader from "@/components/profissional/ui/ProfissionalSectionHeader";
import ProfissionalStatusPill from "@/components/profissional/ui/ProfissionalStatusPill";
import ProfissionalSurface from "@/components/profissional/ui/ProfissionalSurface";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

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

function inputClass() {
  return "mt-2 h-11 w-full rounded-[18px] border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400";
}

function textAreaClass() {
  return "mt-2 min-h-[96px] w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-400";
}

function getStatusTone(status?: string | null) {
  const value = String(status || "").toLowerCase();

  if (value === "confirmado") return "success" as const;
  if (value === "em_atendimento" || value === "atendido") return "info" as const;
  if (value === "cancelado" || value === "faltou") return "danger" as const;

  return "warning" as const;
}

function getStatusLabel(status?: string | null) {
  const value = String(status || "").toLowerCase();
  if (value === "pendente") return "Pendente de confirmacao";
  if (value === "confirmado") return "Confirmado";
  if (value === "cancelado") return "Cancelado";
  if (value === "faltou") return "Nao compareceu";
  if (value === "em_atendimento") return "Em atendimento";
  if (value === "atendido") return "Atendido";
  return status || "Pendente de confirmacao";
}

export default async function NovoAgendamentoProfissionalPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await requireProfissionalAppContext();
  const query = searchParams ? await searchParams : {};
  const dataSelecionada = query.data || hojeISO();

  const [configProfissional, agendaPageData] = await Promise.all([
    buscarConfiguracaoAgendaProfissional(session.idSalao, session.idProfissional),
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

  if (clientesResult.error) throw new Error(clientesResult.error.message);
  if (servicosResult.error) throw new Error(servicosResult.error.message);
  if (vinculosServicosResult.error) {
    throw new Error(vinculosServicosResult.error.message);
  }
  if (agendaDiaResult.error) throw new Error(agendaDiaResult.error.message);

  const clientes = (clientesResult.data ?? []) as ClienteOption[];
  const idsServicosLiberados = new Set(
    (vinculosServicosResult.data ?? []).map((item) => item.id_servico).filter(Boolean)
  );
  const servicos = ((servicosResult.data ?? []) as ServicoOption[]).filter((servico) =>
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
      : item.servicos?.nome || "Servico",
    status: item.status,
  }));

  const diasAtivos = configProfissional.diasTrabalho
    .filter((dia: DiaTrabalho) => dia.ativo)
    .map((dia: DiaTrabalho) => dia.dia);
  const pausas = configProfissional.pausas as Pausa[];

  return (
    <ProfissionalShell
      title="Novo agendamento"
      subtitle="Criar atendimento no seu horario"
    >
      <div className="space-y-3.5 pb-20">
        {query.erro ? (
          <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {query.erro}
          </div>
        ) : null}

        {query.conflito === "1" ? (
          <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
            {query.conflito_msg ||
              "Ja existe horario ocupado. Confirme se deseja agendar mesmo assim."}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[1.5rem] bg-zinc-950 px-4 py-4 text-white shadow-[0_16px_34px_rgba(15,23,42,0.15)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100">
                <CalendarPlus2 size={14} />
                Agenda do profissional
              </div>
              <h1 className="mt-3 text-[1.45rem] font-black tracking-[-0.04em] leading-none">
                Novo horario
              </h1>
              <p className="mt-2.5 text-sm leading-6 text-zinc-300">
                Escolha cliente, servico e horario. O app ja te avisa quando houver
                conflito no mesmo periodo.
              </p>
            </div>

            <div className="rounded-[1.1rem] bg-white/10 px-4 py-2.5 text-right">
              <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                Dia selecionado
              </div>
              <div className="mt-1 text-sm font-bold text-white">
                {dataSelecionada}
              </div>
            </div>
          </div>
        </section>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Regras do profissional"
            description="Confira os dias ativos e as pausas antes de criar o horario."
          />

          <div className="grid gap-2.5">
            <div className="rounded-[1.1rem] border border-zinc-200 bg-zinc-50/80 p-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Clock3 size={16} />
                Dias disponiveis
              </div>
              <div className="mt-2 text-sm leading-6 text-zinc-500">
                {diasAtivos.length ? diasAtivos.join(", ") : "Nenhum dia ativo configurado."}
              </div>
            </div>

            <div className="rounded-[1.1rem] border border-zinc-200 bg-zinc-50/80 p-3.5">
              <div className="text-sm font-semibold text-zinc-900">Pausas</div>
              <div className="mt-2 text-sm leading-6 text-zinc-500">
                {pausas.length
                  ? pausas
                      .map(
                        (pausa) =>
                          `${String(pausa.inicio).slice(0, 5)} - ${String(
                            pausa.fim
                          ).slice(0, 5)}${pausa.descricao ? ` (${pausa.descricao})` : ""}`
                      )
                      .join(", ")
                  : "Sem pausas configuradas."}
              </div>
            </div>
          </div>
        </ProfissionalSurface>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Criar agendamento"
            description="Preencha o essencial para reservar o horario com clareza."
          />

          <form action={criarAgendamentoProfissionalAction} className="space-y-3.5">
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
              Servico
              <select
                name="servico_id"
                defaultValue={query.servico_id || ""}
                className={inputClass()}
                required
              >
                <option value="">Selecione o servico</option>
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
                  defaultValue={dataSelecionada}
                  className={inputClass()}
                  required
                />
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Hora
                <input
                  type="time"
                  name="hora_inicio"
                  defaultValue={query.hora_inicio || ""}
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
                placeholder="Ex.: cliente pediu encaixe rapido"
                className={textAreaClass()}
              />
            </label>

            {query.conflito === "1" ? (
              <label className="flex items-start gap-3 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <input
                  type="checkbox"
                  name="confirmar_conflito"
                  value="true"
                  className="mt-1"
                />
                Confirmo que desejo agendar mesmo com outro cliente neste horario.
              </label>
            ) : null}

            <button className="h-11 w-full rounded-[18px] bg-zinc-950 text-sm font-bold text-white">
              Confirmar agendamento
            </button>
          </form>
        </ProfissionalSurface>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Agenda deste dia"
            description="Veja rapidamente o que ja existe antes de encaixar um novo horario."
          />

          {agendaDia.length ? (
            <div className="space-y-2.5">
              {agendaDia.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1.15rem] border border-zinc-200 bg-zinc-50/70 p-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-zinc-950">
                        {item.hora_inicio} - {item.hora_fim}
                      </div>
                      <div className="mt-2 text-sm font-medium text-zinc-800">
                        {item.cliente_nome}
                      </div>
                      <div className="mt-1 text-sm text-zinc-500">{item.servico_nome}</div>
                    </div>

                    <ProfissionalStatusPill
                      label={getStatusLabel(item.status)}
                      tone={getStatusTone(item.status)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.15rem] border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-4 text-center text-sm text-zinc-500">
              Nenhum agendamento neste dia. Se quiser, este pode ser o primeiro.
            </div>
          )}
        </ProfissionalSurface>

        <ProfissionalSurface>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-amber-50 text-amber-700">
              <UsersRound size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold tracking-[-0.02em] text-zinc-950">
                Dica para ganhar tempo
              </div>
              <p className="mt-1.5 text-sm leading-6 text-zinc-500">
                Se o cliente ainda nao existir, cadastre primeiro e depois volte para
                este horario com os campos preenchidos mais rapido.
              </p>
            </div>
          </div>
        </ProfissionalSurface>
      </div>
    </ProfissionalShell>
  );
}
