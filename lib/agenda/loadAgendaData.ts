import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, subDays } from "date-fns";
import type { Agendamento, Bloqueio, Cliente, Servico, ViewMode } from "@/types/agenda";
import { formatFullDate, normalizeTimeString } from "@/lib/utils/agenda";

const AGENDA_VIEW_LIMIT = 320;

export async function loadAgendaData(params: {
  supabase: SupabaseClient;
  idSalao: string;
  selectedProfissionalId: string;
  viewMode: ViewMode;
  currentDate: Date;
  clientes: Cliente[];
  servicos: Servico[];
}) {
  const {
    supabase,
    idSalao,
    selectedProfissionalId,
    viewMode,
    currentDate,
    clientes,
    servicos,
  } = params;

  const startDate =
    viewMode === "day"
      ? formatFullDate(currentDate)
      : formatFullDate(
          subDays(currentDate, currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1)
        );

  const endDate =
    viewMode === "day"
      ? formatFullDate(currentDate)
      : formatFullDate(addDays(new Date(`${startDate}T12:00:00`), 6));

  const [agRes, blRes] = await Promise.all([
    supabase
      .from("agendamentos")
      .select(`
        id,
        id_salao,
        cliente_id,
        profissional_id,
        servico_id,
        id_comanda,
        data,
        hora_inicio,
        hora_fim,
        duracao_minutos,
        observacoes,
        status,
        reserva_expira_em,
        sinal_valor,
        sinal_status,
        sinal_comprovante_path,
        sinal_confirmacao_responsavel,
        sinal_confirmado_por_tipo,
        sinal_confirmado_por_id,
        sinal_confirmado_por_nome,
        sinal_confirmado_em,
        origem,
        created_at,
        updated_at,
        comandas (
          id,
          numero,
          status
        )
      `)
      .eq("id_salao", idSalao)
      .eq("profissional_id", selectedProfissionalId)
      .gte("data", startDate)
      .lte("data", endDate)
      .order("data")
      .order("hora_inicio")
      .limit(AGENDA_VIEW_LIMIT),

    supabase
      .from("agenda_bloqueios")
      .select("created_at, data, hora_fim, hora_inicio, id, id_salao, motivo, profissional_id")
      .eq("id_salao", idSalao)
      .eq("profissional_id", selectedProfissionalId)
      .gte("data", startDate)
      .lte("data", endDate)
      .order("data")
      .order("hora_inicio")
      .limit(AGENDA_VIEW_LIMIT),
  ]);

  if (agRes.error) console.error("Erro ao buscar agendamentos:", agRes.error);
  if (blRes.error) console.error("Erro ao buscar bloqueios:", blRes.error);

  let agendamentos: Agendamento[] = [];
  let bloqueios: Bloqueio[] = [];

  if (agRes.data) {
    const agendamentoRows = agRes.data as Array<Record<string, unknown>>;
    const clientesById = new Map(clientes.map((cliente) => [cliente.id, cliente]));
    const missingClienteIds = Array.from(
      new Set(
        agendamentoRows
          .map((agendamento) => String(agendamento.cliente_id || "").trim())
          .filter((idCliente) => idCliente && !clientesById.has(idCliente))
      )
    );

    if (missingClienteIds.length) {
      const { data: clientesAgendados, error: clientesAgendadosError } =
        await supabase
          .from("clientes")
          .select("id, nome, whatsapp, telefone, cashback")
          .eq("id_salao", idSalao)
          .in("id", missingClienteIds);

      if (clientesAgendadosError) {
        console.error("Erro ao buscar clientes dos agendamentos:", clientesAgendadosError);
      }

      ((clientesAgendados || []) as Cliente[]).forEach((cliente) => {
        clientesById.set(cliente.id, cliente);
      });
    }

    agendamentos = agendamentoRows.map((ag) => {
      const clienteId = String(ag.cliente_id || "").trim();
      const cliente = clienteId ? clientesById.get(clienteId) : undefined;
      const servico = servicos.find((s) => s.id === ag.servico_id);

      const servicoPreco = servico as
        | (Servico & {
            preco_padrao?: number | null;
            preco?: number | null;
            duracao_minutos?: number | null;
          })
        | undefined;

      const clienteInfo = cliente as (Cliente & { whatsapp?: string | null }) | undefined;
      const comandaInfo = ag.comandas as
        | { id?: string | null; numero?: number | null; status?: string | null }
        | undefined;

      const precoServico = Number(servicoPreco?.preco_padrao ?? servicoPreco?.preco ?? 0);

      return {
        ...ag,
        id_comanda: (ag.id_comanda as string | null) || comandaInfo?.id || null,
        comanda_numero: comandaInfo?.numero || null,
        comanda_status: comandaInfo?.status || null,
        hora_inicio: normalizeTimeString(String(ag.hora_inicio || "")),
        hora_fim: normalizeTimeString(String(ag.hora_fim || "")),
        cliente: cliente
          ? { nome: cliente.nome, whatsapp: clienteInfo?.whatsapp || null }
          : { nome: "Cliente", whatsapp: null },
        servico: servico
          ? {
              nome: servico.nome,
              duracao_minutos: servicoPreco?.duracao_minutos || 0,
              preco: precoServico,
            }
          : {
              nome: "Serviço",
              duracao_minutos: 0,
              preco: 0,
            },
      } as Agendamento;
    });
  }

  if (blRes.data) {
    bloqueios = (blRes.data as Bloqueio[]).map((b) => ({
      ...b,
      hora_inicio: normalizeTimeString(b.hora_inicio),
      hora_fim: normalizeTimeString(b.hora_fim),
    }));
  }

  return {
    agendamentos,
    bloqueios,
  };
}
