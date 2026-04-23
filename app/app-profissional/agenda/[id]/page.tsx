import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CircleDollarSign,
  Clock,
  Edit3,
  Scissors,
  Trash2,
  UserX,
} from "lucide-react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";
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

function getStatusClasses(status?: string | null) {
  const valor = String(status || "").toLowerCase();

  if (valor === "confirmado") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (valor === "em_atendimento") return "border-blue-200 bg-blue-50 text-blue-700";
  if (valor === "atendido") return "border-sky-200 bg-sky-50 text-sky-700";
  if (valor === "aguardando_pagamento") return "border-amber-200 bg-amber-50 text-amber-700";
  if (valor === "faltou" || valor === "cancelado") return "border-red-200 bg-red-50 text-red-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
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
  const session = await getProfissionalSessionFromCookie();
  if (!session) redirect("/app-profissional/login");

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

        const [
          clienteResult,
          servicoResult,
          comandaResult,
          itensResult,
        ] = await Promise.all([
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
      <div className="space-y-4 pb-28">
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

        <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Cliente
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-zinc-950">
                {cliente?.nome || "Cliente"}
              </h1>
              {cliente?.telefone ? (
                <div className="mt-1 text-sm text-zinc-500">{cliente.telefone}</div>
              ) : null}
            </div>

            <span
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                status
              )}`}
            >
              {getStatusLabel(status)}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[1.25rem] bg-zinc-50 p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Clock size={17} />
                Horario
              </div>
              <div className="mt-2 text-lg font-bold text-zinc-950">
                {horaInicio} - {horaFim}
              </div>
            </div>

            <div className="rounded-[1.25rem] bg-zinc-50 p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Scissors size={17} />
                Servico
              </div>
              <div className="mt-2 text-sm font-bold text-zinc-950">
                {servico?.nome || "Servico"}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {formatMoney(servico?.preco ?? servico?.preco_padrao)}
              </div>
            </div>
          </div>

          {agendamento.observacoes ? (
            <div className="mt-4 rounded-[1.25rem] bg-zinc-50 p-4 text-sm text-zinc-600">
              {agendamento.observacoes}
            </div>
          ) : null}
        </section>

        <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <CircleDollarSign size={18} />
                Comanda e caixa
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                {comanda
                  ? `Comanda ${comanda.numero || ""} - ${getStatusLabel(comanda.status)}`
                  : "Abra uma comanda para lancar itens e enviar ao caixa."}
              </p>
            </div>
            {comanda ? (
              <div className="text-right text-sm font-bold text-zinc-950">
                {formatMoney(comanda.total)}
                <div className="text-xs font-medium text-zinc-400">
                  {itensCount} item(ns)
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-2">
            {comanda ? (
              <Link
                href={`/app-profissional/comandas/${comanda.id}`}
                className="rounded-2xl bg-zinc-950 px-4 py-3 text-center text-sm font-bold text-white"
              >
                Abrir comanda
              </Link>
            ) : (
              <form action={abrirComandaDoAgendamentoAction}>
                <input type="hidden" name="id_agendamento" value={agendamento.id} />
                <button className="w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white">
                  Abrir comanda deste atendimento
                </button>
              </form>
            )}

            {comanda ? (
              <form action={enviarComandaDoAgendamentoParaCaixaAction}>
                <input type="hidden" name="id_agendamento" value={agendamento.id} />
                <button
                  disabled={!comandaAberta}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Enviar comanda para o caixa
                </button>
              </form>
            ) : null}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
            <Edit3 size={18} />
            Editar agendamento
          </div>

          <form action={atualizarAgendamentoProfissionalAction} className="mt-4 space-y-3">
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

            <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <input
                type="checkbox"
                name="confirmar_conflito"
                value="true"
                className="mt-1"
              />
              Salvar mesmo se houver conflito com outro horario.
            </label>

            <button className="w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white">
              Salvar alteracoes
            </button>
          </form>
        </section>

        <section className="grid gap-2">
          <form action={marcarClienteNaoCompareceuAction}>
            <input type="hidden" name="id_agendamento" value={agendamento.id} />
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              <UserX size={18} />
              Cliente nao compareceu
            </button>
          </form>

          <form action={cancelarAgendamentoProfissionalAction}>
            <input type="hidden" name="id_agendamento" value={agendamento.id} />
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              <Trash2 size={18} />
              Excluir da agenda (cancelar)
            </button>
          </form>
        </section>

        <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 text-sm text-zinc-500 shadow-sm">
          Fluxo recomendado: confirme o atendimento, abra a comanda, lance os itens
          e envie para o caixa quando estiver pronto para pagamento.
        </div>
      </div>
    </ProfissionalShell>
  );
}
