import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buscarVinculoProfissionalServico,
  criarCamposAplicacaoComissao,
  resolverRegraComissaoServico,
  type ProfissionalComissaoSource,
  type ServicoComissaoSource,
} from "@/lib/comissoes/regrasServico";

type ServicoComandaInfo = ServicoComissaoSource & {
  id: string;
  nome: string;
};

type ProfissionalComandaInfo = ProfissionalComissaoSource & {
  id: string;
};

type SincronizarParams = {
  supabase: SupabaseClient;
  idSalao: string;
  idAgendamento: string;
  idComandaNova?: string | null;
  idServico: string;
  idProfissional: string;
  servico?: ServicoComandaInfo | null;
  profissional?: ProfissionalComandaInfo | null;
};

export async function recalcularTotaisComanda(params: {
  supabase: SupabaseClient;
  idComanda: string;
}) {
  const { supabase, idComanda } = params;

  const { data: itens, error: itensError } = await supabase
    .from("comanda_itens")
    .select("valor_total")
    .eq("id_comanda", idComanda)
    .eq("ativo", true);

  if (itensError) {
    console.error("Erro ao recalcular totais da comanda:", itensError);
    throw new Error("Erro ao recalcular totais da comanda.");
  }

  const subtotal = (itens || []).reduce(
    (acc: number, item: { valor_total?: number | null }) =>
      acc + Number(item.valor_total || 0),
    0
  );

  const { data: comandaAtual, error: comandaError } = await supabase
    .from("comandas")
    .select("id, desconto, acrescimo")
    .eq("id", idComanda)
    .maybeSingle();

  if (comandaError) {
    console.error("Erro ao buscar comanda para recalcular:", comandaError);
    throw new Error("Erro ao buscar comanda para recalcular.");
  }

  if (!comandaAtual?.id) return;

  const desconto = Number(comandaAtual.desconto || 0);
  const acrescimo = Number(comandaAtual.acrescimo || 0);
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

export async function cancelarComandaSeVazia(params: {
  supabase: SupabaseClient;
  idComanda: string;
}) {
  const { supabase, idComanda } = params;

  const { data: itens, error: itensError } = await supabase
    .from("comanda_itens")
    .select("id")
    .eq("id_comanda", idComanda)
    .eq("ativo", true)
    .limit(1);

  if (itensError) {
    console.error("Erro ao validar comanda vazia:", itensError);
    throw new Error("Erro ao validar se a comanda ficou vazia.");
  }

  const possuiItens = Array.isArray(itens) && itens.length > 0;
  if (possuiItens) return;

  const { data: comanda, error: comandaError } = await supabase
    .from("comandas")
    .select("id, status")
    .eq("id", idComanda)
    .maybeSingle();

  if (comandaError) {
    console.error("Erro ao buscar comanda vazia:", comandaError);
    throw new Error("Erro ao buscar comanda para cancelamento.");
  }

  if (!comanda?.id) return;

  if (["fechada", "cancelada"].includes(String(comanda.status || "").toLowerCase())) {
    return;
  }

  const { error: updateError } = await supabase
    .from("comandas")
    .update({
      status: "cancelada",
      motivo_cancelamento:
        "Comanda cancelada automaticamente por ficar sem itens vinculados.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", idComanda);

  if (updateError) {
    console.error("Erro ao cancelar comanda vazia:", updateError);
    throw new Error("Erro ao cancelar comanda vazia.");
  }
}

async function removerAgendamentoDaComandaSemCancelar(params: {
  supabase: SupabaseClient;
  idAgendamento: string;
}) {
  const { supabase, idAgendamento } = params;

  const { data: itens, error } = await supabase
    .from("comanda_itens")
    .select("id, id_comanda")
    .eq("id_agendamento", idAgendamento);

  if (error) {
    console.error("Erro ao buscar itens do agendamento na comanda:", error);
    throw new Error("Erro ao buscar itens da comanda.");
  }

  if (!itens || itens.length === 0) {
    return [] as string[];
  }

  const ids = itens.map((item) => item.id);
  const comandasAfetadas = [
    ...new Set(itens.map((item) => item.id_comanda).filter(Boolean)),
  ] as string[];

  const { error: deleteError } = await supabase
    .from("comanda_itens")
    .delete()
    .in("id", ids);

  if (deleteError) {
    console.error("Erro ao remover itens do agendamento da comanda:", deleteError);
    throw new Error("Erro ao remover itens da comanda.");
  }

  for (const idComanda of comandasAfetadas) {
    await recalcularTotaisComanda({ supabase, idComanda });
  }

  return comandasAfetadas;
}

export async function removerAgendamentoDaComanda(params: {
  supabase: SupabaseClient;
  idAgendamento: string;
}) {
  const { supabase, idAgendamento } = params;

  const comandasAfetadas = await removerAgendamentoDaComandaSemCancelar({
    supabase,
    idAgendamento,
  });

  for (const idComanda of comandasAfetadas) {
    await cancelarComandaSeVazia({ supabase, idComanda });
  }
}

export async function sincronizarAgendamentoComComanda(params: SincronizarParams) {
  const {
    supabase,
    idSalao,
    idAgendamento,
    idComandaNova,
    idServico,
    idProfissional,
    servico,
    profissional,
  } = params;

  const comandasAntigasAfetadas = await removerAgendamentoDaComandaSemCancelar({
    supabase,
    idAgendamento,
  });

  if (!idComandaNova) {
    const { error: clearAgendamentoError } = await supabase
      .from("agendamentos")
      .update({
        id_comanda: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", idAgendamento);

    if (clearAgendamentoError) {
      console.error("Erro ao limpar vinculo da comanda no agendamento:", clearAgendamentoError);
      throw new Error("Erro ao desvincular agendamento da comanda.");
    }

    for (const idComanda of comandasAntigasAfetadas) {
      await cancelarComandaSeVazia({ supabase, idComanda });
    }

    return;
  }

  if (!servico) {
    throw new Error("Servico nao encontrado para sincronizacao da comanda.");
  }

  const vinculo = await buscarVinculoProfissionalServico({
    supabase,
    idProfissional,
    idServico,
  });
  const regraServico = resolverRegraComissaoServico({
    servico,
    profissional,
    vinculo,
  });
  const camposComissao = criarCamposAplicacaoComissao(regraServico);

  const { data: comanda, error: comandaError } = await supabase
    .from("comandas")
    .select("id, status")
    .eq("id", idComandaNova)
    .maybeSingle();

  if (comandaError) {
    console.error("Erro ao validar comanda de destino:", comandaError);
    throw new Error("Erro ao validar comanda de destino.");
  }

  if (!comanda?.id) {
    throw new Error("Comanda de destino nao encontrada.");
  }

  const statusComanda = String(comanda.status || "").toLowerCase();

  if (statusComanda === "fechada") {
    throw new Error("A comanda selecionada nao pode receber itens.");
  }

  if (statusComanda === "cancelada") {
    const { error: reabrirError } = await supabase
      .from("comandas")
      .update({
        status: "aberta",
        motivo_cancelamento: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", idComandaNova);

    if (reabrirError) {
      console.error("Erro ao reabrir comanda cancelada:", reabrirError);
      throw new Error("Erro ao reabrir a comanda selecionada.");
    }
  }

  const payloadItem = {
    id_salao: idSalao,
    id_comanda: idComandaNova,
    id_agendamento: idAgendamento,
    tipo_item: "servico",
    id_servico: servico.id,
    descricao: servico.nome,
    quantidade: 1,
    valor_unitario: regraServico.valorUnitario,
    valor_total: regraServico.valorUnitario,
    custo_total: Number(servico.custo_produto ?? 0),
    id_profissional: idProfissional,
    id_assistente: null,
    ...camposComissao,
    origem: "agenda",
    observacoes: null,
    ativo: true,
  };

  const { error: insertError } = await supabase
    .from("comanda_itens")
    .insert(payloadItem);

  if (insertError) {
    console.error("Erro ao inserir item sincronizado na comanda:", insertError);
    throw new Error("Erro ao inserir item na comanda.");
  }

  const { error: updateAgendamentoError } = await supabase
    .from("agendamentos")
    .update({
      id_comanda: idComandaNova,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idAgendamento);

  if (updateAgendamentoError) {
    console.error("Erro ao atualizar comanda do agendamento:", updateAgendamentoError);
    throw new Error("Erro ao vincular agendamento a comanda.");
  }

  await recalcularTotaisComanda({
    supabase,
    idComanda: idComandaNova,
  });

  for (const idComanda of comandasAntigasAfetadas) {
    if (idComanda !== idComandaNova) {
      await cancelarComandaSeVazia({ supabase, idComanda });
    }
  }
}
