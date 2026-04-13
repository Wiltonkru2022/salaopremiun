import type { SupabaseClient } from "@supabase/supabase-js";

type ServicoComandaInfo = {
  id: string;
  nome: string;
  preco_padrao?: number | null;
  preco?: number | null;
  custo_produto?: number | null;
  comissao_percentual?: number | null;
  comissao_assistente_percentual?: number | null;
  base_calculo?: string | null;
  desconta_taxa_maquininha?: boolean | null;
};

type ProfissionalComandaInfo = {
  id: string;
  comissao_percentual?: number | null;
};

type VinculoProfissionalServico = {
  preco_personalizado?: number | null;
  comissao_percentual?: number | null;
  comissao_assistente_percentual?: number | null;
  base_calculo?: string | null;
  desconta_taxa_maquininha?: boolean | null;
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

async function buscarVinculoProfissionalServico(params: {
  supabase: SupabaseClient;
  idProfissional: string;
  idServico: string;
}) {
  const { data, error } = await params.supabase
    .from("profissional_servicos")
    .select(`
      preco_personalizado,
      comissao_percentual,
      comissao_assistente_percentual,
      base_calculo,
      desconta_taxa_maquininha
    `)
    .eq("id_profissional", params.idProfissional)
    .eq("id_servico", params.idServico)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar vínculo profissional_servicos:", error);
    throw new Error("Erro ao buscar vínculo do profissional com o serviço.");
  }

  return (data as VinculoProfissionalServico | null) || null;
}

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
      console.error("Erro ao limpar vínculo da comanda no agendamento:", clearAgendamentoError);
      throw new Error("Erro ao desvincular agendamento da comanda.");
    }

    for (const idComanda of comandasAntigasAfetadas) {
      await cancelarComandaSeVazia({ supabase, idComanda });
    }

    return;
  }

  if (!servico) {
    throw new Error("Serviço não encontrado para sincronização da comanda.");
  }

  const vinculo = await buscarVinculoProfissionalServico({
    supabase,
    idProfissional,
    idServico,
  });

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
    throw new Error("Comanda de destino não encontrada.");
  }

  const statusComanda = String(comanda.status || "").toLowerCase();

  if (statusComanda === "fechada") {
    throw new Error("A comanda selecionada não pode receber itens.");
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

  const valorUnitario = Number(
    vinculo?.preco_personalizado ?? servico.preco_padrao ?? servico.preco ?? 0
  );

  const valorTotal = valorUnitario;

  const comissaoPercentual = Number(
    vinculo?.comissao_percentual ??
      profissional?.comissao_percentual ??
      servico.comissao_percentual ??
      0
  );

  const comissaoAssistentePercentual = Number(
    vinculo?.comissao_assistente_percentual ??
      servico.comissao_assistente_percentual ??
      0
  );

  const baseCalculoAplicada = vinculo?.base_calculo || servico.base_calculo || "bruto";

  const descontaTaxaAplicada =
    vinculo?.desconta_taxa_maquininha ??
    servico.desconta_taxa_maquininha ??
    false;

  const payloadItem = {
    id_salao: idSalao,
    id_comanda: idComandaNova,
    id_agendamento: idAgendamento,
    tipo_item: "servico",
    id_servico: servico.id,
    descricao: servico.nome,
    quantidade: 1,
    valor_unitario: valorUnitario,
    valor_total: valorTotal,
    custo_total: Number(servico.custo_produto ?? 0),
    id_profissional: idProfissional,
    id_assistente: null,
    comissao_percentual_aplicada: comissaoPercentual,
    comissao_valor_aplicado: 0,
    comissao_assistente_percentual_aplicada: comissaoAssistentePercentual,
    comissao_assistente_valor_aplicado: 0,
    base_calculo_aplicada: baseCalculoAplicada,
    desconta_taxa_maquininha_aplicada: descontaTaxaAplicada,
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
    throw new Error("Erro ao vincular agendamento à comanda.");
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