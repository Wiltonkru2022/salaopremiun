import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, subDays } from "date-fns";
import type { Agendamento, Bloqueio, Cliente, Servico, ViewMode } from "@/types/agenda";
import { formatFullDate, normalizeTimeString } from "@/lib/utils/agenda";

const AGENDA_VIEW_LIMIT = 320;
const AGENDA_CACHE_TTL_MS = 8_000;
const agendaCache = new Map<string, { expiresAt: number; data: { agendamentos: Agendamento[]; bloqueios: Bloqueio[] } }>();

export function invalidarCacheAgenda(idSalao?: string) {
  if (!idSalao) {
    agendaCache.clear();
    return;
  }
  for (const key of agendaCache.keys()) {
    if (key.startsWith(`${idSalao}:`)) agendaCache.delete(key);
  }
}

function firstRelation(value: unknown) {
  if (Array.isArray(value)) return value[0] as Record<string, unknown> | undefined;
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

export async function loadAgendaData(params: {
  supabase: SupabaseClient;
  idSalao: string;
  selectedProfissionalId: string;
  viewMode: ViewMode;
  currentDate: Date;
  clientes: Cliente[];
  servicos: Servico[];
}) {
  const { supabase, idSalao, selectedProfissionalId, viewMode, currentDate, clientes, servicos } = params;

  const startDate = viewMode === "day"
    ? formatFullDate(currentDate)
    : formatFullDate(subDays(currentDate, currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1));
  const endDate = viewMode === "day"
    ? formatFullDate(currentDate)
    : formatFullDate(addDays(new Date(`${startDate}T12:00:00`), 6));

  const cacheKey = `${idSalao}:${selectedProfissionalId}:${viewMode}:${startDate}:${endDate}`;
  const cached = agendaCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const [agRes, blRes] = await Promise.all([
    supabase
      .from("agendamentos")
      .select(`
        id,id_salao,cliente_id,profissional_id,servico_id,id_comanda,data,hora_inicio,hora_fim,
        duracao_minutos,observacoes,status,reserva_expira_em,sinal_valor,sinal_status,
        sinal_comprovante_path,sinal_confirmacao_responsavel,sinal_confirmado_por_tipo,
        sinal_confirmado_por_id,sinal_confirmado_por_nome,sinal_confirmado_em,origem,created_at,updated_at,
        comandas(id,numero,status),
        clientes(id,nome,whatsapp,telefone,cashback),
        servicos(id,nome,duracao_minutos,preco_padrao,preco)
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

  const clientesById = new Map(clientes.map((cliente) => [cliente.id, cliente]));
  const servicosById = new Map(servicos.map((servico) => [servico.id, servico]));

  const agendamentos = ((agRes.data || []) as Array<Record<string, unknown>>).map((ag) => {
    const clienteRel = firstRelation(ag.clientes);
    const servicoRel = firstRelation(ag.servicos);
    const comandaInfo = firstRelation(ag.comandas);
    const clienteFallback = clientesById.get(String(ag.cliente_id || ""));
    const servicoFallback = servicosById.get(String(ag.servico_id || "")) as (Servico & { preco_padrao?: number | null; preco?: number | null; duracao_minutos?: number | null }) | undefined;

    const clienteNome = String(clienteRel?.nome || clienteFallback?.nome || "Cliente");
    const clienteWhatsapp = String(clienteRel?.whatsapp || (clienteFallback as any)?.whatsapp || "") || null;
    const servicoNome = String(servicoRel?.nome || servicoFallback?.nome || "Serviço");
    const duracao = Number(servicoRel?.duracao_minutos ?? servicoFallback?.duracao_minutos ?? 0);
    const preco = Number(servicoRel?.preco_padrao ?? servicoRel?.preco ?? servicoFallback?.preco_padrao ?? servicoFallback?.preco ?? 0);

    return {
      ...ag,
      id_comanda: (ag.id_comanda as string | null) || String(comandaInfo?.id || "") || null,
      comanda_numero: Number(comandaInfo?.numero || 0) || null,
      comanda_status: String(comandaInfo?.status || "") || null,
      hora_inicio: normalizeTimeString(String(ag.hora_inicio || "")),
      hora_fim: normalizeTimeString(String(ag.hora_fim || "")),
      cliente: { nome: clienteNome, whatsapp: clienteWhatsapp },
      servico: { nome: servicoNome, duracao_minutos: duracao, preco },
    } as Agendamento;
  });

  const bloqueios = ((blRes.data || []) as Bloqueio[]).map((b) => ({
    ...b,
    hora_inicio: normalizeTimeString(b.hora_inicio),
    hora_fim: normalizeTimeString(b.hora_fim),
  }));

  const data = { agendamentos, bloqueios };
  agendaCache.set(cacheKey, { expiresAt: Date.now() + AGENDA_CACHE_TTL_MS, data });
  return data;
}
