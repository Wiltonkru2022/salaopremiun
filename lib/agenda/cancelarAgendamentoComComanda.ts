import type { SupabaseClient } from "@supabase/supabase-js";

type Params = {
  supabase: SupabaseClient;
  idAgendamento: string;
};

async function recalcularTotaisComanda(supabase: SupabaseClient, idComanda: string) {
  const { data: itens, error } = await supabase
    .from("comanda_itens")
    .select("valor_total")
    .eq("id_comanda", idComanda);

  if (error) {
    console.error("Erro ao recalcular totais da comanda:", error);
    throw new Error("Erro ao recalcular totais da comanda.");
  }

  const subtotal = (itens || []).reduce((acc: number, item: { valor_total?: number | null }) => {
    return acc + Number(item.valor_total || 0);
  }, 0);

  const { data: comandaAtual, error: comandaError } = await supabase
    .from("comandas")
    .select("desconto, acrescimo")
    .eq("id", idComanda)
    .maybeSingle();

  if (comandaError) {
    console.error("Erro ao buscar comanda:", comandaError);
    throw new Error("Erro ao buscar comanda.");
  }

  const desconto = Number(comandaAtual?.desconto || 0);
  const acrescimo = Number(comandaAtual?.acrescimo || 0);
  const total = subtotal - desconto + acrescimo;

  const { error: updateError } = await supabase
    .from("comandas")
    .update({
      subtotal,
      total,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idComanda);

  if (updateError) {
    console.error("Erro ao atualizar totais da comanda:", updateError);
    throw new Error("Erro ao atualizar totais da comanda.");
  }
}

async function cancelarComandaSeVazia(supabase: SupabaseClient, idComanda: string) {
  const { data: itens, error: itensError } = await supabase
    .from("comanda_itens")
    .select("id")
    .eq("id_comanda", idComanda)
    .limit(1);

  if (itensError) {
    console.error("Erro ao verificar itens da comanda:", itensError);
    throw new Error("Erro ao verificar itens da comanda.");
  }

  if (itens && itens.length > 0) return;

  const { data: comanda, error: comandaError } = await supabase
    .from("comandas")
    .select("id, status")
    .eq("id", idComanda)
    .maybeSingle();

  if (comandaError) {
    console.error("Erro ao buscar comanda:", comandaError);
    throw new Error("Erro ao buscar comanda.");
  }

  if (!comanda?.id) return;

  const statusAtual = String(comanda.status || "").toLowerCase();
  if (statusAtual === "cancelada" || statusAtual === "fechada") return;

  const { error: updateError } = await supabase
    .from("comandas")
    .update({
      status: "cancelada",
      motivo_cancelamento: "Cancelada automaticamente pelo cancelamento do agendamento.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", idComanda);

  if (updateError) {
    console.error("Erro ao cancelar comanda:", updateError);
    throw new Error("Erro ao cancelar comanda.");
  }
}

export async function cancelarAgendamentoComComanda({ supabase, idAgendamento }: Params) {
  const { data: agendamento, error: agendamentoError } = await supabase
    .from("agendamentos")
    .select("id, id_comanda, status")
    .eq("id", idAgendamento)
    .maybeSingle();

  if (agendamentoError) {
    console.error("Erro ao buscar agendamento:", agendamentoError);
    throw new Error("Erro ao buscar agendamento.");
  }

  if (!agendamento?.id) {
    throw new Error("Agendamento não encontrado.");
  }

  const { error: cancelError } = await supabase
    .from("agendamentos")
    .update({
      status: "cancelado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", idAgendamento);

  if (cancelError) {
    console.error("Erro ao cancelar agendamento:", cancelError);
    throw new Error("Erro ao cancelar agendamento.");
  }

  const { data: itens, error: itensError } = await supabase
    .from("comanda_itens")
    .select("id, id_comanda")
    .eq("id_agendamento", idAgendamento);

  if (itensError) {
    console.error("Erro ao buscar itens da comanda:", itensError);
    throw new Error("Erro ao buscar itens da comanda.");
  }

  const comandasAfetadas = new Set<string>();

  for (const item of itens || []) {
    if (item.id_comanda) {
      comandasAfetadas.add(item.id_comanda);
    }

    const { error: deleteError } = await supabase
      .from("comanda_itens")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      console.error("Erro ao remover item da comanda:", deleteError);
      throw new Error("Erro ao remover item da comanda.");
    }
  }

  for (const idComanda of Array.from(comandasAfetadas)) {
    await recalcularTotaisComanda(supabase, idComanda);
    await cancelarComandaSeVazia(supabase, idComanda);
  }
}