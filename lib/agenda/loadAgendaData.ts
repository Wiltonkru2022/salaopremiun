import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, subDays } from "date-fns";
import type { Agendamento, Bloqueio, Cliente, Servico, ViewMode } from "@/types/agenda";
import { formatFullDate, normalizeTimeString } from "@/lib/utils/agenda";

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
        *,
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
      .order("hora_inicio"),

    supabase
      .from("agenda_bloqueios")
      .select("*")
      .eq("id_salao", idSalao)
      .eq("profissional_id", selectedProfissionalId)
      .gte("data", startDate)
      .lte("data", endDate)
      .order("data")
      .order("hora_inicio"),
  ]);

  if (agRes.error) console.error("Erro ao buscar agendamentos:", agRes.error);
  if (blRes.error) console.error("Erro ao buscar bloqueios:", blRes.error);

  let agendamentos: Agendamento[] = [];
  let bloqueios: Bloqueio[] = [];

  if (agRes.data) {
    agendamentos = (agRes.data as Array<Record<string, unknown>>).map((ag) => {
      const cliente = clientes.find((c) => c.id === ag.cliente_id);
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
