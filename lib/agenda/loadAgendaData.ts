import type { DatabaseClient } from "@/lib/db/types";
import { addDays, subDays } from "date-fns";
import type { Agendamento, Bloqueio, Cliente, Servico, ViewMode } from "@/types/agenda";
import { formatFullDate, normalizeTimeString } from "@/lib/utils/agenda";

const AGENDA_VIEW_LIMIT = 320;

// Mantido por compatibilidade com chamadas existentes. A agenda agora e sempre
// carregada fresca para evitar que um agendamento recem-criado fique invisivel.
export function invalidarCacheAgenda(_idSalao?: string) {}

export async function loadAgendaData(params: {
  supabase: DatabaseClient;
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
          subDays(
            currentDate,
            currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1
          )
        );
  const endDate =
    viewMode === "day"
      ? formatFullDate(currentDate)
      : formatFullDate(addDays(new Date(`${startDate}T12:00:00`), 6));

  const [agRes, blRes] = await Promise.all([
    supabase
      .from("agendamentos")
      .select(
        "id,id_salao,cliente_id,pessoa_atendida_cliente_id,agendado_por_app_conta_id,pessoa_agendada_tipo,pessoa_agendada_nome,pessoa_agendada_whatsapp,profissional_id,servico_id,id_comanda,data,hora_inicio,hora_fim,duracao_minutos,observacoes,status,reserva_expira_em,sinal_valor,sinal_status,sinal_comprovante_path,sinal_confirmacao_responsavel,sinal_confirmado_por_tipo,sinal_confirmado_por_id,sinal_confirmado_por_nome,sinal_confirmado_em,origem,created_at,updated_at"
      )
      .eq("id_salao", idSalao)
      .eq("profissional_id", selectedProfissionalId)
      .gte("data", startDate)
      .lte("data", endDate)
      .order("data")
      .order("hora_inicio")
      .limit(AGENDA_VIEW_LIMIT),
    supabase
      .from("agenda_bloqueios")
      .select(
        "created_at,data,hora_fim,hora_inicio,id,id_salao,motivo,profissional_id"
      )
      .eq("id_salao", idSalao)
      .eq("profissional_id", selectedProfissionalId)
      .gte("data", startDate)
      .lte("data", endDate)
      .order("data")
      .order("hora_inicio")
      .limit(AGENDA_VIEW_LIMIT),
  ]);

  if (agRes.error) {
    console.error("Erro ao buscar agendamentos:", agRes.error);
    throw agRes.error;
  }
  if (blRes.error) {
    console.error("Erro ao buscar bloqueios:", blRes.error);
    throw blRes.error;
  }

  const clientesById = new Map(clientes.map((cliente) => [cliente.id, cliente]));
  const servicosById = new Map(servicos.map((servico) => [servico.id, servico]));

  const agendamentos = ((agRes.data || []) as Array<Record<string, unknown>>).map(
    (ag) => {
      const pessoaAtendidaId = String(
        ag.pessoa_atendida_cliente_id || ""
      ).trim();
      const clienteResponsavelId = String(ag.cliente_id || "").trim();
      const clienteOperacionalId = pessoaAtendidaId || clienteResponsavelId;
      const clienteFallback =
        clientesById.get(clienteOperacionalId) ||
        clientesById.get(clienteResponsavelId);
      const servicoFallback = servicosById.get(
        String(ag.servico_id || "")
      ) as
        | (Servico & {
            preco_padrao?: number | null;
            preco?: number | null;
            duracao_minutos?: number | null;
          })
        | undefined;
      const clienteInfo = clienteFallback as
        | (Cliente & {
            whatsapp?: string | null;
            telefone?: string | null;
            nome?: string | null;
          })
        | undefined;

      const clienteNome = String(
        ag.pessoa_agendada_nome || clienteInfo?.nome || "Cliente"
      );
      const clienteWhatsapp =
        String(
          ag.pessoa_agendada_whatsapp ||
            clienteInfo?.whatsapp ||
            clienteInfo?.telefone ||
            ""
        ) || null;
      const servicoNome = String(servicoFallback?.nome || "Serviço");
      const duracao = Number(
        ag.duracao_minutos ?? servicoFallback?.duracao_minutos ?? 0
      );
      const preco = Number(
        servicoFallback?.preco_padrao ?? servicoFallback?.preco ?? 0
      );

      return {
        ...ag,
        cliente_responsavel_id: clienteResponsavelId,
        cliente_id: clienteOperacionalId,
        id_comanda: (ag.id_comanda as string | null) || null,
        comanda_numero: null,
        comanda_status: null,
        hora_inicio: normalizeTimeString(String(ag.hora_inicio || "")),
        hora_fim: normalizeTimeString(String(ag.hora_fim || "")),
        cliente: { nome: clienteNome, whatsapp: clienteWhatsapp },
        servico: { nome: servicoNome, duracao_minutos: duracao, preco },
      } as Agendamento;
    }
  );

  const bloqueios = ((blRes.data || []) as Bloqueio[]).map((b) => ({
    ...b,
    hora_inicio: normalizeTimeString(b.hora_inicio),
    hora_fim: normalizeTimeString(b.hora_fim),
  }));

  return { agendamentos, bloqueios };
}
