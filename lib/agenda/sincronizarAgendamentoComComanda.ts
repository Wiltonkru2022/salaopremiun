import type { SupabaseClient } from "@supabase/supabase-js";
import { adicionarItemComanda } from "@/lib/comandas/processar";
import {
  buscarVinculoProfissionalServico,
  criarCamposAplicacaoComissao,
  resolverRegraComissaoServico,
  type ProfissionalComissaoSource,
  type ServicoComissaoSource,
} from "@/lib/comissoes/regrasServico";
import {
  allocateComboUnitPrices,
  normalizeComboComponents,
} from "@/lib/servicos/combo-utils";

type ServicoComandaInfo = ServicoComissaoSource & {
  id: string;
  nome: string;
  eh_combo?: boolean | null;
  combo_resumo?: string | null;
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

type ComboServicoItem = {
  id_servico_item: string;
  ordem?: number | null;
  preco_base?: number | null;
  percentual_rateio?: number | null;
  servico: ServicoComandaInfo;
};

async function buscarItensComboServico(params: {
  supabase: SupabaseClient;
  idSalao: string;
  idServicoCombo: string;
}) {
  const { data, error } = await params.supabase
    .from("servicos_combo_itens")
    .select(
      `
        id_servico_item,
        ordem,
        preco_base,
        percentual_rateio,
        servico:servicos!servicos_combo_itens_id_servico_item_fkey (
          id,
          nome,
          preco,
          preco_padrao,
          custo_produto,
          comissao_percentual,
          comissao_percentual_padrao,
          comissao_assistente_percentual,
          base_calculo,
          desconta_taxa_maquininha
        )
      `
    )
    .eq("id_salao", params.idSalao)
    .eq("id_servico_combo", params.idServicoCombo)
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (error) {
    console.error("Erro ao carregar itens do combo:", error);
    throw new Error("Erro ao carregar itens do combo do servico.");
  }

  return ((data || []) as unknown as ComboServicoItem[]).filter(
    (item) => item.id_servico_item && item.servico?.id
  );
}

export async function recalcularTotaisComanda(params: {
  supabase: SupabaseClient;
  idSalao: string;
  idComanda: string;
}) {
  const { supabase, idSalao, idComanda } = params;

  const { data: itens, error: itensError } = await supabase
    .from("comanda_itens")
    .select("valor_total")
    .eq("id_salao", idSalao)
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
    .eq("id_salao", idSalao)
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
    .eq("id", idComanda)
    .eq("id_salao", idSalao);

  if (updateError) {
    console.error("Erro ao atualizar totais da comanda:", updateError);
    throw new Error("Erro ao atualizar totais da comanda.");
  }
}

export async function cancelarComandaSeVazia(params: {
  supabase: SupabaseClient;
  idSalao: string;
  idComanda: string;
}) {
  const { supabase, idSalao, idComanda } = params;

  const { data: itens, error: itensError } = await supabase
    .from("comanda_itens")
    .select("id")
    .eq("id_salao", idSalao)
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
    .eq("id_salao", idSalao)
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
    .eq("id", idComanda)
    .eq("id_salao", idSalao);

  if (updateError) {
    console.error("Erro ao cancelar comanda vazia:", updateError);
    throw new Error("Erro ao cancelar comanda vazia.");
  }
}

async function removerAgendamentoDaComandaSemCancelar(params: {
  supabase: SupabaseClient;
  idSalao: string;
  idAgendamento: string;
}) {
  const { supabase, idSalao, idAgendamento } = params;

  const { data: itens, error } = await supabase
    .from("comanda_itens")
    .select("id, id_comanda")
    .eq("id_salao", idSalao)
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
    .eq("id_salao", idSalao)
    .in("id", ids);

  if (deleteError) {
    console.error("Erro ao remover itens do agendamento da comanda:", deleteError);
    throw new Error("Erro ao remover itens da comanda.");
  }

  for (const idComanda of comandasAfetadas) {
    await recalcularTotaisComanda({ supabase, idSalao, idComanda });
  }

  return comandasAfetadas;
}

export async function removerAgendamentoDaComanda(params: {
  supabase: SupabaseClient;
  idSalao: string;
  idAgendamento: string;
}) {
  const { supabase, idSalao, idAgendamento } = params;

  const comandasAfetadas = await removerAgendamentoDaComandaSemCancelar({
    supabase,
    idSalao,
    idAgendamento,
  });

  for (const idComanda of comandasAfetadas) {
    await cancelarComandaSeVazia({ supabase, idSalao, idComanda });
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
    idSalao,
    idAgendamento,
  });

  if (!idComandaNova) {
    const { error: clearAgendamentoError } = await supabase
      .from("agendamentos")
      .update({
        id_comanda: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", idAgendamento)
      .eq("id_salao", idSalao);

    if (clearAgendamentoError) {
      console.error("Erro ao limpar vinculo da comanda no agendamento:", clearAgendamentoError);
      throw new Error("Erro ao desvincular agendamento da comanda.");
    }

    for (const idComanda of comandasAntigasAfetadas) {
      await cancelarComandaSeVazia({ supabase, idSalao, idComanda });
    }

    return;
  }

  if (!servico) {
    throw new Error("Servico nao encontrado para sincronizacao da comanda.");
  }

  const vinculo = await buscarVinculoProfissionalServico({
    supabase,
    idSalao,
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
    .eq("id_salao", idSalao)
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
      .eq("id", idComandaNova)
      .eq("id_salao", idSalao);

    if (reabrirError) {
      console.error("Erro ao reabrir comanda cancelada:", reabrirError);
      throw new Error("Erro ao reabrir a comanda selecionada.");
    }
  }

  let payloads = [
    {
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
    },
  ];

  if (servico.eh_combo) {
    const itensCombo = await buscarItensComboServico({
      supabase,
      idSalao,
      idServicoCombo: servico.id,
    });

    if (itensCombo.length > 0) {
      const componentes = normalizeComboComponents(
        itensCombo.map((item) => ({
          id: item.servico.id,
          nome: item.servico.nome,
          ordem: item.ordem,
          preco_base:
            item.preco_base ??
            item.servico.preco_padrao ??
            item.servico.preco ??
            0,
          percentual_rateio: item.percentual_rateio,
        }))
      );
      const valoresRateados = allocateComboUnitPrices(
        regraServico.valorUnitario,
        componentes
      );

      payloads = await Promise.all(
        componentes.map(async (componente, index) => {
          const itemCombo = itensCombo.find(
            (item) => item.servico.id === componente.id
          );

          if (!itemCombo) {
            throw new Error("Item do combo nao encontrado para sincronizacao.");
          }

          const vinculoItem = await buscarVinculoProfissionalServico({
            supabase,
            idSalao,
            idProfissional,
            idServico: itemCombo.servico.id,
          });
          const regraItem = resolverRegraComissaoServico({
            servico: itemCombo.servico,
            profissional,
            vinculo: vinculoItem,
          });
          const camposItem = criarCamposAplicacaoComissao(regraItem);
          const valorUnitario = valoresRateados[index] || 0;

          return {
            id_salao: idSalao,
            id_comanda: idComandaNova,
            id_agendamento: idAgendamento,
            tipo_item: "servico",
            id_servico: itemCombo.servico.id,
            descricao: `${servico.nome} • ${itemCombo.servico.nome}`,
            quantidade: 1,
            valor_unitario: valorUnitario,
            valor_total: valorUnitario,
            custo_total: Number(itemCombo.servico.custo_produto ?? 0),
            id_profissional: idProfissional,
            id_assistente: null,
            ...camposItem,
            origem: "agenda",
            observacoes: null,
            ativo: true,
          };
        })
      );
    }
  }

  const { error: insertError } = await supabase
    .from("comanda_itens")
    .insert(payloads);

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
    .eq("id", idAgendamento)
    .eq("id_salao", idSalao);

  if (updateAgendamentoError) {
    console.error("Erro ao atualizar comanda do agendamento:", updateAgendamentoError);
    throw new Error("Erro ao vincular agendamento a comanda.");
  }

  await recalcularTotaisComanda({
    supabase,
    idSalao,
    idComanda: idComandaNova,
  });

  for (const idComanda of comandasAntigasAfetadas) {
    if (idComanda !== idComandaNova) {
      await cancelarComandaSeVazia({ supabase, idSalao, idComanda });
    }
  }
}

export async function sincronizarAgendamentoComComandaNoCaixa(params: {
  supabase: SupabaseClient;
  idSalao: string;
  idAgendamento: string;
  idComandaNova: string | null;
  idServico: string;
  idProfissional: string;
}) {
  const {
    supabase,
    idSalao,
    idAgendamento,
    idComandaNova,
    idServico,
    idProfissional,
  } = params;

  await removerAgendamentoDaComanda({
    supabase,
    idSalao,
    idAgendamento,
  });

  if (!idComandaNova) {
    const { error: clearAgendamentoError } = await supabase
      .from("agendamentos")
      .update({
        id_comanda: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", idAgendamento)
      .eq("id_salao", idSalao);

    if (clearAgendamentoError) {
      throw clearAgendamentoError;
    }

    return { idComanda: null as string | null };
  }

  const [{ data: agendamento, error: agendamentoError }, { data: comanda, error: comandaError }] =
    await Promise.all([
      supabase
        .from("agendamentos")
        .select("id, cliente_id, observacoes")
        .eq("id", idAgendamento)
        .eq("id_salao", idSalao)
        .maybeSingle(),
      supabase
        .from("comandas")
        .select("id, status, id_cliente, desconto, acrescimo")
        .eq("id", idComandaNova)
        .eq("id_salao", idSalao)
        .maybeSingle(),
    ]);

  if (agendamentoError || !agendamento?.id) {
    throw agendamentoError || new Error("Agendamento nao encontrado.");
  }

  if (comandaError || !comanda?.id) {
    throw comandaError || new Error("Comanda nao encontrada.");
  }

  const statusComanda = String(comanda.status || "").toLowerCase();

  if (statusComanda === "fechada") {
    throw new Error("A comanda selecionada nao pode receber itens.");
  }

  if (statusComanda === "cancelada") {
    const { error: reopenError } = await supabase
      .from("comandas")
      .update({
        status: "aberta",
        motivo_cancelamento: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", comanda.id)
      .eq("id_salao", idSalao);

    if (reopenError) {
      throw reopenError;
    }
  }

  await adicionarItemComanda({
    supabaseAdmin: supabase,
    idSalao,
    comanda: {
      idComanda: comanda.id,
      idCliente: comanda.id_cliente || agendamento.cliente_id || null,
      desconto: Number(comanda.desconto || 0),
      acrescimo: Number(comanda.acrescimo || 0),
    },
    item: {
      tipo_item: "servico",
      quantidade: 1,
      id_servico: idServico,
      id_agendamento: idAgendamento,
      id_profissional: idProfissional,
      observacoes: agendamento.observacoes,
      origem: "agenda",
    },
    idempotencyKey: `agenda-sync:${idAgendamento}:${comanda.id}:${idServico}:${idProfissional}`,
  });

  const { error: updateAgendamentoError } = await supabase
    .from("agendamentos")
    .update({
      id_comanda: comanda.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idAgendamento)
    .eq("id_salao", idSalao);

  if (updateAgendamentoError) {
    throw updateAgendamentoError;
  }

  return { idComanda: comanda.id };
}
