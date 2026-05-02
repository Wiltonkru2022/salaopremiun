import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Scissors,
  Trash2,
  UserX,
} from "lucide-react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalSectionHeader from "@/components/profissional/ui/ProfissionalSectionHeader";
import ProfissionalStatusPill from "@/components/profissional/ui/ProfissionalStatusPill";
import ProfissionalSurface from "@/components/profissional/ui/ProfissionalSurface";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import {
  abrirComandaDoAgendamentoAction,
  atualizarAgendamentoProfissionalAction,
  cancelarAgendamentoProfissionalAction,
  enviarComandaDoAgendamentoParaCaixaAction,
  marcarClienteNaoCompareceuAction,
} from "./actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ ok?: string; erro?: string }>;

type AgendamentoRow = {
  id: string;
  cliente_id?: string | null;
  servico_id?: string | null;
  data?: string | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  status?: string | null;
  id_comanda?: string | null;
  observacoes?: string | null;
  duracao_minutos?: number | string | null;
};

type ClienteRow = {
  id: string;
  nome?: string | null;
  telefone?: string | null;
};

type ServicoRow = {
  id: string;
  nome?: string | null;
  duracao_minutos?: number | string | null;
  preco?: number | string | null;
  preco_padrao?: number | string | null;
};

type ComandaRow = {
  id: string;
  numero?: number | string | null;
  status?: string | null;
  total?: number | string | null;
};

const STATUS_OPTIONS = [
  ["pendente", "Pendente"],
  ["confirmado", "Confirmado"],
  ["em_atendimento", "Em atendimento"],
  ["atendido", "Atendido"],
  ["aguardando_pagamento", "Aguardando pagamento"],
  ["faltou", "Cliente nao compareceu"],
  ["cancelado", "Cancelado"],
] as const;

function formatDate(value?: string | null) {
  if (!value) return "Data nao informada";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(year, month - 1, day));
}

function formatMoney(value?: number | string | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function getStatusLabel(status?: string | null) {
  const valor = String(status || "").toLowerCase();
  const option = STATUS_OPTIONS.find(([key]) => key === valor);
  return option?.[1] || status || "Sem status";
}

function getStatusTone(status?: string | null) {
  const valor = String(status || "").toLowerCase();

  if (valor === "confirmado") return "success" as const;
  if (valor === "em_atendimento" || valor === "atendido") return "info" as const;
  if (valor === "aguardando_pagamento" || valor === "pendente") {
    return "warning" as const;
  }
  if (valor === "faltou" || valor === "cancelado") return "danger" as const;

  return "neutral" as const;
}

function inputClass() {
  return "mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400";
}

export default async function AgendamentoDetalheProfissionalPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const session = await requireProfissionalAppContext();

  const { id } = await params;
  const query = searchParams ? await searchParams : {};

  const { agendamento, cliente, servico, comanda, itensCount } =
    await runAdminOperation({
      action: "app_profissional_agendamento_detalhe_page",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const { data: agendamentoData, error: agendamentoError } =
          await supabase
            .from("agendamentos")
            .select(
              "id, cliente_id, servico_id, data, hora_inicio, hora_fim, status, id_comanda, observacoes, duracao_minutos"
            )
            .eq("id", id)
            .eq("id_salao", session.idSalao)
            .eq("profissional_id", session.idProfissional)
            .maybeSingle();

        if (agendamentoError) throw new Error(agendamentoError.message);

        if (!agendamentoData) {
          return {
            agendamento: null,
            cliente: null,
            servico: null,
            comanda: null,
            itensCount: 0,
          };
        }

        const [clienteResult, servicoResult, comandaResult, itensResult] =
          await Promise.all([
            agendamentoData.cliente_id
              ? supabase
                  .from("clientes")
                  .select("id, nome, telefone")
                  .eq("id", agendamentoData.cliente_id)
                  .eq("id_salao", session.idSalao)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
            agendamentoData.servico_id
              ? supabase
                  .from("servicos")
                  .select("id, nome, duracao_minutos, preco, preco_padrao")
                  .eq("id", agendamentoData.servico_id)
                  .eq("id_salao", session.idSalao)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
            agendamentoData.id_comanda
              ? supabase
                  .from("comandas")
                  .select("id, numero, status, total")
                  .eq("id", agendamentoData.id_comanda)
                  .eq("id_salao", session.idSalao)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
            agendamentoData.id_comanda
              ? supabase
                  .from("comanda_itens")
                  .select("id", { count: "exact", head: true })
                  .eq("id_comanda", agendamentoData.id_comanda)
                  .eq("id_salao", session.idSalao)
                  .eq("ativo", true)
              : Promise.resolve({ data: null, error: null, count: 0 }),
          ]);

        if (clienteResult.error) throw new Error(clienteResult.error.message);
        if (servicoResult.error) throw new Error(servicoResult.error.message);
        if (comandaResult.error) throw new Error(comandaResult.error.message);
        if (itensResult.error) throw new Error(itensResult.error.message);

        return {
          agendamento: agendamentoData as AgendamentoRow,
          cliente: clienteResult.data as ClienteRow | null,
          servico: servicoResult.data as ServicoRow | null,
          comanda: comandaResult.data as ComandaRow | null,
          itensCount: itensResult.count || 0,
        };
      },
    });

  if (!agendamento) {
    return (
      <ProfissionalShell title="Agendamento" subtitle="Detalhes">
        <div className="space-y-4 pb-24">
          <Link
            href="/app-profissional/agenda"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700"
          >
            <ArrowLeft size={18} />
            Voltar para agenda
          </Link>
          <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            Agendamento nao encontrado ou fora da sua agenda.
          </div>
        </div>
      </ProfissionalShell>
    );
  }

  const horaInicio = String(agendamento.hora_inicio || "").slice(0, 5);
  const horaFim = String(agendamento.hora_fim || "").slice(0, 5);
  const status = String(agendamento.status || "pendente");
  const comandaAberta = comanda && String(comanda.status).toLowerCase() === "aberta";

  return (
    <ProfissionalShell title="Agendamento" subtitle={formatDate(agendamento.data)}>
      <div className="space-y-3.5 pb-24">
        <Link
          href={`/app-profissional/agenda?data=${agendamento.data || ""}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700"
        >
          <ArrowLeft size={18} />
          Voltar para agenda
        </Link>

        {query.ok ? (
          <div className="rounded-[1.25rem] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-sm">
            {query.ok}
          </div>
        ) : null}

        {query.erro ? (
          <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            {query.erro}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[1.5rem] bg-zinc-950 px-4 py-4 text-white shadow-[0_16px_34px_rgba(15,23,42,0.15)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
                Cliente
              </div>
              <h1 className="mt-2 text-[1.45rem] font-black tracking-[-0.04em] leading-none">
                {cliente?.nome || "Cliente"}
              </h1>
              {cliente?.telefone ? (
                <div className="mt-1.5 text-sm text-zinc-300">{cliente.telefone}</div>
              ) : null}
            </div>

            <ProfissionalStatusPill
              label={getStatusLabel(status)}
              tone={getStatusTone(status)}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-[1.1rem] bg-white/10 p-3.5">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Clock size={17} />
                Horario
              </div>
              <div className="mt-2 text-lg font-bold text-white">
                {horaInicio} - {horaFim}
              </div>
            </div>

            <div className="rounded-[1.1rem] bg-white/10 p-3.5">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Scissors size={17} />
                Servico
              </div>
              <div className="mt-2 text-sm font-bold text-white">
                {servico?.nome || "Servico"}
              </div>
              <div className="mt-1 text-xs text-zinc-300">
                {formatMoney(servico?.preco ?? servico?.preco_padrao)}
              </div>
            </div>
          </div>

          {agendamento.observacoes ? (
            <div className="mt-3 rounded-[1.1rem] bg-white/10 p-3.5 text-sm text-zinc-200">
              {agendamento.observacoes}
            </div>
          ) : null}
        </section>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Comanda e caixa"
            description={
              comanda
                ? `Comanda ${comanda.numero || ""} pronta para revisar ou enviar ao caixa.`
                : "Abra uma comanda para lancar itens e seguir para o caixa."
            }
          />

          <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-zinc-200 bg-zinc-50/80 p-3.5">
            <div>
              <div className="text-sm font-semibold text-zinc-900">
                {comanda ? `Comanda #${comanda.numero}` : "Sem comanda aberta"}
              </div>
              <div className="mt-1 text-sm text-zinc-500">
                {comanda
                  ? `${itensCount} item(ns) lancados`
                  : "Crie a comanda deste atendimento em um toque."}
              </div>
            </div>
            {comanda ? (
              <div className="text-right">
                <div className="text-base font-bold text-zinc-950">
                  {formatMoney(comanda.total)}
                </div>
                <div className="text-xs text-zinc-400">
                  {getStatusLabel(comanda.status)}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2">
            {comanda ? (
              <Link
                href={`/app-profissional/comandas/${comanda.id}`}
                className="rounded-[18px] bg-zinc-950 px-4 py-2.5 text-center text-sm font-bold text-white"
              >
                Abrir comanda
              </Link>
            ) : (
              <form action={abrirComandaDoAgendamentoAction}>
                <input type="hidden" name="id_agendamento" value={agendamento.id} />
                <button className="w-full rounded-[18px] bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white">
                  Abrir comanda deste atendimento
                </button>
              </form>
            )}

            {comanda ? (
              <form action={enviarComandaDoAgendamentoParaCaixaAction}>
                <input type="hidden" name="id_agendamento" value={agendamento.id} />
                <button
                  disabled={!comandaAberta}
                  className="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Enviar comanda para o caixa
                </button>
              </form>
            ) : null}
          </div>
        </ProfissionalSurface>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Editar atendimento"
            description="Ajuste horario, status e observacoes."
          />

          <form action={atualizarAgendamentoProfissionalAction} className="space-y-2.5">
            <input type="hidden" name="id_agendamento" value={agendamento.id} />

            <label className="block text-sm font-medium text-zinc-700">
              Data
              <input
                className={inputClass()}
                type="date"
                name="data"
                defaultValue={agendamento.data || ""}
                required
              />
            </label>

            <label className="block text-sm font-medium text-zinc-700">
              Hora de inicio
              <input
                className={inputClass()}
                type="time"
                name="hora_inicio"
                defaultValue={horaInicio}
                required
              />
            </label>

            <label className="block text-sm font-medium text-zinc-700">
              Status
              <select className={inputClass()} name="status" defaultValue={status}>
                {STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-zinc-700">
              Observacoes
              <textarea
                className={`${inputClass()} min-h-24 resize-none`}
                name="observacoes"
                defaultValue={agendamento.observacoes || ""}
                placeholder="Ex.: cliente pediu ajuste de horario"
              />
            </label>

            <label className="flex items-start gap-3 rounded-[18px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <input
                type="checkbox"
                name="confirmar_conflito"
                value="true"
                className="mt-1"
              />
              Salvar mesmo se houver conflito com outro horario.
            </label>

            <button className="w-full rounded-[18px] bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white">
              Salvar alteracoes
            </button>
          </form>
        </ProfissionalSurface>

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Acoes rapidas"
            description="Use quando o atendimento mudar de rumo."
          />

          <div className="grid gap-2">
            <form action={marcarClienteNaoCompareceuAction}>
              <input type="hidden" name="id_agendamento" value={agendamento.id} />
              <button className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800">
                <UserX size={18} />
                Cliente nao compareceu
              </button>
            </form>

            <form action={cancelarAgendamentoProfissionalAction}>
              <input type="hidden" name="id_agendamento" value={agendamento.id} />
              <button className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">
                <Trash2 size={18} />
                Excluir da agenda
              </button>
            </form>
          </div>
        </ProfissionalSurface>
      </div>
    </ProfissionalShell>
  );
}
