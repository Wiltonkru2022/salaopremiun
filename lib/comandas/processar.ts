import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buscarVinculoProfissionalServico,
  resolverRegraComissaoServico,
} from "@/lib/comissoes/regrasServico";
import type {
  AcaoComanda,
  ComandaPayload,
  ItemPayload,
} from "@/types/comandas";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

export type ResolvedItemPayload = {
  tipoItem: string;
  quantidade: number;
  valorUnitario: number;
  idServico: string | null;
  idProduto: string | null;
  idProfissional: string | null;
  idAssistente: string | null;
  descricao: string;
  custoTotal: number;
  comissaoPercentual: number;
  comissaoAssistentePercentual: number;
  baseCalculo: string;
  descontaTaxaMaquininha: boolean;
  origem: string;
  observacoes: string | null;
  idAgendamento: string | null;
};

export type CriarComandaPorAgendamentoResult = {
  idComanda: string | null;
  jaExistia: boolean;
};

export type AdicionarItemComandaResult = {
  idComanda: string;
  idItem: string;
  idempotencyKey: string | null;
  idempotentReplay: boolean;
  resolved: ResolvedItemPayload;
};

export const COMANDA_ACTIONS: AcaoComanda[] = [
  "salvar_base",
  "adicionar_item",
  "editar_item",
  "remover_item",
  "enviar_pagamento",
  "criar_por_agendamento",
];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

export function sanitizeMoney(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

export function sanitizeInt(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function sanitizeText(value: unknown) {
  const parsed = String(value || "").trim();
  return parsed || null;
}

export function sanitizeIdempotencyKey(value: unknown) {
  const parsed = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "")
    .slice(0, 160);

  return parsed || null;
}

export function isComandaAction(value: string): value is AcaoComanda {
  return COMANDA_ACTIONS.includes(value as AcaoComanda);
}

export function criarChaveItemAgendamento(resolved: ResolvedItemPayload) {
  if (!resolved.idAgendamento) {
    return null;
  }

  return sanitizeIdempotencyKey(
    [
      "agendamento-item",
      resolved.idAgendamento,
      resolved.idServico || "sem-servico",
      resolved.idProduto || "sem-produto",
      resolved.idProfissional || "sem-profissional",
    ].join(":")
  );
}

export function resolveComandaHttpStatus(error: unknown) {
  const candidate = error as { code?: string } | null;
  if (!candidate?.code) return 500;
  if (candidate.code === "P0001") return 400;
  if (candidate.code === "23514") return 409;
  return 500;
}

export function isMissingRpcFunction(error: unknown, functionName: string) {
  const candidate = error as { code?: string; message?: string } | null;
  const message = String(candidate?.message || "").toLowerCase();

  return (
    candidate?.code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes(`function public.${functionName.toLowerCase()}`)
  );
}

export async function processarCriacaoPorAgendamento(params: {
  supabaseAdmin: SupabaseAdminClient;
  idSalao: string;
  idAgendamento: string;
}) {
  const { supabaseAdmin, idSalao, idAgendamento } = params;

  const { data: agendamento, error: agendamentoError } = await supabaseAdmin
    .from("agendamentos")
    .select("id, id_salao")
    .eq("id", idAgendamento)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (agendamentoError || !agendamento?.id) {
    throw new Error("Agendamento nao encontrado para este salao.");
  }

  const { data, error } = await supabaseAdmin.rpc(
    "fn_criar_comanda_por_agendamento",
    {
      p_id_agendamento: idAgendamento,
    }
  );

  if (error) {
    throw error;
  }

  return {
    idComanda: data || null,
    jaExistia: false,
  } satisfies CriarComandaPorAgendamentoResult;
}

export async function salvarBaseComanda(params: {
  supabaseAdmin: SupabaseAdminClient;
  idSalao: string;
  comanda: ComandaPayload;
}) {
  const { supabaseAdmin, idSalao, comanda } = params;
  const numero = sanitizeInt(comanda.numero);

  if (!numero) {
    throw new Error("Numero da comanda obrigatorio.");
  }

  const { data, error } = await supabaseAdmin.rpc("fn_salvar_comanda_base", {
    p_id_salao: idSalao,
    p_id_comanda: sanitizeUuid(comanda.idComanda) as unknown as string,
    p_numero: numero,
    p_id_cliente: sanitizeUuid(comanda.idCliente) as unknown as string,
    p_status: sanitizeText(comanda.status) || "aberta",
    p_observacoes: sanitizeText(comanda.observacoes) as unknown as string,
    p_desconto: sanitizeMoney(comanda.desconto),
    p_acrescimo: sanitizeMoney(comanda.acrescimo),
  });

  if (error) {
    throw error;
  }

  return {
    idComanda: data ? String(data) : "",
    numero,
    status: sanitizeText(comanda.status) || "aberta",
  };
}

export async function adicionarItemComanda(params: {
  supabaseAdmin: SupabaseAdminClient;
  idSalao: string;
  comanda: ComandaPayload;
  item: ItemPayload;
  idempotencyKey?: string | null;
}) {
  const { supabaseAdmin, idSalao, comanda, item, idempotencyKey } = params;
  const idComanda = await garantirComandaBase({
    supabaseAdmin,
    idSalao,
    comanda,
  });
  const resolved = await resolverItemPayload({
    supabaseAdmin,
    idSalao,
    item,
  });
  const itemIdempotencyKey =
    idempotencyKey || criarChaveItemAgendamento(resolved);

  let { data: itemResult, error: addItemError } = await supabaseAdmin.rpc(
    "fn_adicionar_item_comanda_idempotente",
    {
      p_id_salao: idSalao,
      p_id_comanda: idComanda,
      p_tipo_item: resolved.tipoItem,
      p_id_agendamento: resolved.idAgendamento as unknown as string,
      p_id_servico: resolved.idServico as unknown as string,
      p_id_produto: resolved.idProduto as unknown as string,
      p_descricao: resolved.descricao,
      p_quantidade: resolved.quantidade,
      p_valor_unitario: resolved.valorUnitario,
      p_custo_total: resolved.custoTotal,
      p_id_profissional: resolved.idProfissional as unknown as string,
      p_id_assistente: resolved.idAssistente as unknown as string,
      p_comissao_percentual: resolved.comissaoPercentual,
      p_comissao_assistente_percentual:
        resolved.comissaoAssistentePercentual,
      p_base_calculo: resolved.baseCalculo,
      p_desconta_taxa_maquininha: resolved.descontaTaxaMaquininha,
      p_origem: resolved.origem,
      p_observacoes: resolved.observacoes as unknown as string,
      p_desconto: sanitizeMoney(comanda.desconto),
      p_acrescimo: sanitizeMoney(comanda.acrescimo),
      p_idempotency_key: itemIdempotencyKey || undefined,
    }
  );

  if (
    addItemError &&
    isMissingRpcFunction(addItemError, "fn_adicionar_item_comanda_idempotente")
  ) {
    const fallback = await supabaseAdmin.rpc("fn_adicionar_item_comanda", {
      p_id_salao: idSalao,
      p_id_comanda: idComanda,
      p_tipo_item: resolved.tipoItem,
      p_id_agendamento: resolved.idAgendamento as unknown as string,
      p_id_servico: resolved.idServico as unknown as string,
      p_id_produto: resolved.idProduto as unknown as string,
      p_descricao: resolved.descricao,
      p_quantidade: resolved.quantidade,
      p_valor_unitario: resolved.valorUnitario,
      p_custo_total: resolved.custoTotal,
      p_id_profissional: resolved.idProfissional as unknown as string,
      p_id_assistente: resolved.idAssistente as unknown as string,
      p_comissao_percentual: resolved.comissaoPercentual,
      p_comissao_assistente_percentual:
        resolved.comissaoAssistentePercentual,
      p_base_calculo: resolved.baseCalculo,
      p_desconta_taxa_maquininha: resolved.descontaTaxaMaquininha,
      p_origem: resolved.origem,
      p_observacoes: resolved.observacoes as unknown as string,
      p_desconto: sanitizeMoney(comanda.desconto),
      p_acrescimo: sanitizeMoney(comanda.acrescimo),
    });
    itemResult = fallback.data
      ? [{ id_item: String(fallback.data), ja_existia: false }]
      : null;
    addItemError = fallback.error;
  }

  if (addItemError) {
    throw addItemError;
  }

  const resultRow = Array.isArray(itemResult) ? itemResult[0] : null;
  const itemId =
    resultRow && typeof resultRow === "object" && "id_item" in resultRow
      ? String(resultRow.id_item || "")
      : String(itemResult || "");
  const jaExistia =
    resultRow && typeof resultRow === "object" && "ja_existia" in resultRow
      ? Boolean(resultRow.ja_existia)
      : false;

  return {
    idComanda,
    idItem: itemId,
    idempotencyKey: itemIdempotencyKey,
    idempotentReplay: jaExistia,
    resolved,
  } satisfies AdicionarItemComandaResult;
}

export async function editarItemComanda(params: {
  supabaseAdmin: SupabaseAdminClient;
  idSalao: string;
  comanda: ComandaPayload;
  item: ItemPayload;
}) {
  const { supabaseAdmin, idSalao, comanda, item } = params;
  const idComanda = sanitizeUuid(comanda.idComanda);
  const idItem = sanitizeUuid(item.idItem);

  if (!idComanda) {
    throw new Error("Comanda obrigatoria para salvar item.");
  }

  if (!idItem) {
    throw new Error("Item obrigatorio para editar a comanda.");
  }

  const resolved = await resolverItemPayload({
    supabaseAdmin,
    idSalao,
    item,
  });

  const { error } = await supabaseAdmin.rpc("fn_atualizar_item_comanda", {
    p_id_salao: idSalao,
    p_id_comanda: idComanda,
    p_id_item: idItem,
    p_tipo_item: resolved.tipoItem,
    p_id_agendamento: resolved.idAgendamento as unknown as string,
    p_id_servico: resolved.idServico as unknown as string,
    p_id_produto: resolved.idProduto as unknown as string,
    p_descricao: resolved.descricao,
    p_quantidade: resolved.quantidade,
    p_valor_unitario: resolved.valorUnitario,
    p_custo_total: resolved.custoTotal,
    p_id_profissional: resolved.idProfissional as unknown as string,
    p_id_assistente: resolved.idAssistente as unknown as string,
    p_comissao_percentual: resolved.comissaoPercentual,
    p_comissao_assistente_percentual:
      resolved.comissaoAssistentePercentual,
    p_base_calculo: resolved.baseCalculo,
    p_desconta_taxa_maquininha: resolved.descontaTaxaMaquininha,
    p_origem: resolved.origem,
    p_observacoes: resolved.observacoes as unknown as string,
    p_desconto: sanitizeMoney(comanda.desconto),
    p_acrescimo: sanitizeMoney(comanda.acrescimo),
  });

  if (error) {
    throw error;
  }

  return {
    idComanda,
    idItem,
    resolved,
  };
}

export async function removerItemComanda(params: {
  supabaseAdmin: SupabaseAdminClient;
  idSalao: string;
  comanda: ComandaPayload;
  item: ItemPayload;
}) {
  const { supabaseAdmin, idSalao, comanda, item } = params;
  const idComanda = sanitizeUuid(comanda.idComanda);
  const idItem = sanitizeUuid(item.idItem);

  if (!idComanda || !idItem) {
    throw new Error("Comanda e item sao obrigatorios para remover.");
  }

  const { error } = await supabaseAdmin.rpc("fn_remover_item_comanda", {
    p_id_salao: idSalao,
    p_id_comanda: idComanda,
    p_id_item: idItem,
    p_desconto: sanitizeMoney(comanda.desconto),
    p_acrescimo: sanitizeMoney(comanda.acrescimo),
  });

  if (error) {
    throw error;
  }

  return {
    idComanda,
    idItem,
  };
}

export async function enviarComandaParaPagamento(params: {
  supabaseAdmin: SupabaseAdminClient;
  idSalao: string;
  comanda: ComandaPayload;
}) {
  const { supabaseAdmin, idSalao, comanda } = params;
  const idComanda = sanitizeUuid(comanda.idComanda);

  if (!idComanda) {
    throw new Error("Comanda obrigatoria para enviar ao pagamento.");
  }

  const { data: itens, error: itensError } = await supabaseAdmin
    .from("comanda_itens")
    .select("id, valor_total")
    .eq("id_salao", idSalao)
    .eq("id_comanda", idComanda)
    .eq("ativo", true);

  if (itensError) {
    throw new Error("Erro ao validar itens da comanda.");
  }

  const totalItens = (itens || []).reduce(
    (acc, item) => acc + sanitizeMoney(item.valor_total),
    0
  );

  if (!itens?.length || totalItens <= 0) {
    throw new Error(
      "Adicione ao menos um item com valor antes de enviar para o caixa."
    );
  }

  const { error } = await supabaseAdmin.rpc(
    "fn_enviar_comanda_para_pagamento",
    {
      p_id_salao: idSalao,
      p_id_comanda: idComanda,
      p_id_cliente: sanitizeUuid(comanda.idCliente) as unknown as string,
      p_observacoes: sanitizeText(comanda.observacoes) as unknown as string,
      p_desconto: sanitizeMoney(comanda.desconto),
      p_acrescimo: sanitizeMoney(comanda.acrescimo),
    }
  );

  if (error) {
    throw error;
  }

  return {
    idComanda,
    status: "aguardando_pagamento" as const,
  };
}

export async function garantirComandaBase(params: {
  supabaseAdmin: SupabaseAdminClient;
  idSalao: string;
  comanda: ComandaPayload;
}) {
  const { supabaseAdmin, idSalao, comanda } = params;
  const numero = sanitizeInt(comanda.numero);
  let idComanda = sanitizeUuid(comanda.idComanda);

  if (idComanda) {
    return idComanda;
  }

  if (!numero) {
    throw new Error("Numero da comanda obrigatorio para criar a comanda.");
  }

  const { data: novoId, error } = await supabaseAdmin.rpc(
    "fn_salvar_comanda_base",
    {
      p_id_salao: idSalao,
      p_id_comanda: null as unknown as string,
      p_numero: numero,
      p_id_cliente: sanitizeUuid(comanda.idCliente) as unknown as string,
      p_status: sanitizeText(comanda.status) || "aberta",
      p_observacoes: sanitizeText(comanda.observacoes) as unknown as string,
      p_desconto: sanitizeMoney(comanda.desconto),
      p_acrescimo: sanitizeMoney(comanda.acrescimo),
    }
  );

  if (error || !novoId) {
    throw error || new Error("Erro ao criar comanda.");
  }

  idComanda = String(novoId);
  return idComanda;
}

export async function resolverItemPayload(params: {
  supabaseAdmin: SupabaseAdminClient;
  idSalao: string;
  item: ItemPayload;
}) {
  const { supabaseAdmin, idSalao, item } = params;

  const tipoItem = String(item.tipo_item || "").trim().toLowerCase();
  const quantidade = Math.max(Number(item.quantidade || 1), 1);
  const valorUnitario = sanitizeMoney(item.valor_unitario);
  const idServico = sanitizeUuid(item.id_servico);
  const idProduto = sanitizeUuid(item.id_produto);
  const idProfissional = sanitizeUuid(item.id_profissional);
  const idAssistente = sanitizeUuid(item.id_assistente);

  let descricao = sanitizeText(item.descricao);
  let custoTotal = sanitizeMoney(item.custo_total);
  let comissaoPercentual = 0;
  let comissaoAssistentePercentual = 0;
  let baseCalculo = "bruto";
  let descontaTaxaMaquininha = false;

  if (tipoItem === "servico") {
    if (!idServico) {
      throw new Error("Servico obrigatorio para item de servico.");
    }

    const [
      { data: servico, error: servicoError },
      { data: profissional, error: profissionalError },
    ] = await Promise.all([
      supabaseAdmin
        .from("servicos")
        .select(
          "id, nome, preco, preco_padrao, custo_produto, comissao_percentual, comissao_percentual_padrao, comissao_assistente_percentual, base_calculo, desconta_taxa_maquininha"
        )
        .eq("id", idServico)
        .eq("id_salao", idSalao)
        .maybeSingle(),
      idProfissional
        ? supabaseAdmin
            .from("profissionais")
            .select("id, nome, comissao_percentual, tipo_profissional")
            .eq("id", idProfissional)
            .eq("id_salao", idSalao)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (servicoError || !servico) {
      throw new Error("Servico nao encontrado para este salao.");
    }

    if (profissionalError) {
      throw new Error("Erro ao validar profissional do item.");
    }

    if (
      profissional &&
      String(profissional.tipo_profissional || "profissional").toLowerCase() ===
        "assistente"
    ) {
      throw new Error("Selecione um profissional principal, nao um assistente.");
    }

    if (idAssistente && idProfissional) {
      const { data: vinculoAssistente, error: vinculoAssistenteError } =
        await supabaseAdmin
          .from("profissional_assistentes")
          .select("id")
          .eq("id_salao", idSalao)
          .eq("id_profissional", idProfissional)
          .eq("id_assistente", idAssistente)
          .eq("ativo", true)
          .maybeSingle();

      if (vinculoAssistenteError || !vinculoAssistente) {
        throw new Error("Assistente nao vinculado ao profissional selecionado.");
      }
    }

    const vinculo =
      idProfissional && idServico
        ? await buscarVinculoProfissionalServico({
            supabase: supabaseAdmin,
            idSalao,
            idProfissional,
            idServico,
          })
        : null;

    const regra = resolverRegraComissaoServico({
      servico,
      profissional,
      vinculo,
    });

    descricao = descricao || servico.nome || "Servico";
    custoTotal = sanitizeMoney(servico.custo_produto);
    comissaoPercentual = regra.comissaoPercentual;
    comissaoAssistentePercentual = regra.comissaoAssistentePercentual;
    baseCalculo = regra.baseCalculo;
    descontaTaxaMaquininha = regra.descontaTaxaMaquininha;
  } else if (tipoItem === "produto") {
    if (!idProduto) {
      throw new Error("Produto obrigatorio para item de produto.");
    }

    const { data: produto, error: produtoError } = await supabaseAdmin
      .from("produtos")
      .select("id, nome, custo_real, comissao_revenda_percentual")
      .eq("id", idProduto)
      .eq("id_salao", idSalao)
      .maybeSingle();

    if (produtoError || !produto) {
      throw new Error("Produto nao encontrado para este salao.");
    }

    descricao = descricao || produto.nome || "Produto";
    custoTotal = sanitizeMoney(Number(produto.custo_real || 0) * quantidade);
    comissaoPercentual = sanitizeMoney(produto.comissao_revenda_percentual);
  } else {
    descricao = descricao || "Item manual";
    custoTotal = sanitizeMoney(item.custo_total);
  }

  const observacoes = sanitizeText(item.observacoes);
  const origem = sanitizeText(item.origem) || "manual";

  const resolved: ResolvedItemPayload = {
    tipoItem,
    quantidade,
    valorUnitario,
    idServico,
    idProduto,
    idProfissional,
    idAssistente,
    descricao: descricao || "Item manual",
    custoTotal,
    comissaoPercentual,
    comissaoAssistentePercentual,
    baseCalculo,
    descontaTaxaMaquininha,
    origem,
    observacoes,
    idAgendamento: sanitizeUuid(item.id_agendamento),
  };

  return resolved;
}
