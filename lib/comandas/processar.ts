import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buscarVinculoProfissionalServico,
  resolverRegraComissaoServico,
} from "@/lib/comissoes/regrasServico";
import {
  allocateComboUnitPrices,
  normalizeComboComponents,
} from "@/lib/servicos/combo-utils";
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
  ehCombo: boolean;
  comboResumo: string | null;
};

type ComboServicoItem = {
  id_servico_item: string;
  ordem?: number | null;
  preco_base?: number | null;
  percentual_rateio?: number | null;
  servico: {
    id: string;
    nome: string;
    preco?: number | null;
    preco_padrao?: number | null;
    custo_produto?: number | null;
    comissao_percentual?: number | null;
    comissao_percentual_padrao?: number | null;
    comissao_assistente_percentual?: number | null;
    base_calculo?: string | null;
    desconta_taxa_maquininha?: boolean | null;
  };
};

type ServicoComboLookupRow = {
  eh_combo?: boolean | null;
  combo_resumo?: string | null;
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

function shouldAplicarComissaoAssistente(params: {
  idAssistente: string | null;
  idProfissional: string | null;
}) {
  return Boolean(params.idAssistente && params.idProfissional);
}

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

function buildCompactIdempotencyKey(parts: Array<string | null | undefined>) {
  const raw = parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join("|");

  if (!raw) {
    return null;
  }

  return sanitizeIdempotencyKey(
    `ci:${createHash("sha1").update(raw).digest("hex").slice(0, 40)}`
  );
}

export function isComandaAction(value: string): value is AcaoComanda {
  return COMANDA_ACTIONS.includes(value as AcaoComanda);
}

export function criarChaveItemAgendamento(resolved: ResolvedItemPayload) {
  if (!resolved.idAgendamento) {
    return null;
  }

  return buildCompactIdempotencyKey([
    "agendamento-item",
    resolved.idAgendamento,
    resolved.idServico || "sem-servico",
    resolved.idProduto || "sem-produto",
    resolved.idProfissional || "sem-profissional",
  ]);
}

async function buscarItensComboServico(params: {
  supabaseAdmin: SupabaseAdminClient;
  idSalao: string;
  idServicoCombo: string;
}) {
  const { data, error } = await params.supabaseAdmin
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
    throw error;
  }

  return ((data || []) as unknown as ComboServicoItem[]).filter(
    (item) => item.id_servico_item && item.servico?.id
  );
}

async function expandirItensCombo(params: {
  supabaseAdmin: SupabaseAdminClient;
  idSalao: string;
  resolved: ResolvedItemPayload;
}) {
  const { resolved, supabaseAdmin, idSalao } = params;

  if (!resolved.ehCombo || !resolved.idServico) {
    return [resolved];
  }

  const itensCombo = await buscarItensComboServico({
    supabaseAdmin,
    idSalao,
    idServicoCombo: resolved.idServico,
  });

  if (itensCombo.length === 0) {
    return [resolved];
  }

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
  const valoresUnitarios = allocateComboUnitPrices(
    resolved.valorUnitario,
    componentes
  );

  return Promise.all(
    componentes.map(async (item, index) => {
      const servico = itensCombo.find(
        (comboItem) => comboItem.servico.id === item.id
      )?.servico;

      if (!servico) {
        return resolved;
      }

      const { data: profissional, error: profissionalError } = resolved.idProfissional
        ? await supabaseAdmin
            .from("profissionais")
            .select("id, nome, comissao_percentual, tipo_profissional")
            .eq("id", resolved.idProfissional)
            .eq("id_salao", idSalao)
            .maybeSingle()
        : { data: null, error: null };

      if (profissionalError) {
        throw new Error("Erro ao validar profissional do combo.");
      }

      const vinculo =
        resolved.idProfissional && servico.id
          ? await buscarVinculoProfissionalServico({
              supabase: supabaseAdmin,
              idSalao,
              idProfissional: resolved.idProfissional,
              idServico: servico.id,
            })
          : null;

      const regra = resolverRegraComissaoServico({
        servico,
        profissional,
        vinculo,
      });

      return {
        ...resolved,
        idServico: servico.id,
        descricao: `${resolved.descricao} • ${servico.nome}`,
        valorUnitario: valoresUnitarios[index] || 0,
        custoTotal: sanitizeMoney(Number(servico.custo_produto || 0) * resolved.quantidade),
        comissaoPercentual: regra.comissaoPercentual,
        comissaoAssistentePercentual: shouldAplicarComissaoAssistente({
          idAssistente: resolved.idAssistente,
          idProfissional: resolved.idProfissional,
        })
          ? regra.comissaoAssistentePercentual
          : 0,
        baseCalculo: regra.baseCalculo,
        descontaTaxaMaquininha: regra.descontaTaxaMaquininha,
        ehCombo: false,
        comboResumo: resolved.comboResumo,
      } satisfies ResolvedItemPayload;
    })
  );
}

async function inserirItensResolvidosNaComanda(params: {
  supabaseAdmin: SupabaseAdminClient;
  idSalao: string;
  idComanda: string;
  resolvedItems: ResolvedItemPayload[];
  comanda: ComandaPayload;
  idempotencyKey?: string | null;
}) {
  let firstItemId = "";
  let houveReplay = false;

  for (const [index, resolved] of params.resolvedItems.entries()) {
    const key =
      params.idempotencyKey && params.resolvedItems.length > 1
        ? buildCompactIdempotencyKey([
            params.idempotencyKey,
            String(index),
            resolved.idServico || resolved.idProduto || "manual",
            resolved.idProfissional || "sem-profissional",
            resolved.idAgendamento || "sem-agendamento",
          ])
        : params.idempotencyKey;

    let { data: itemResult, error: addItemError } = await params.supabaseAdmin.rpc(
      "fn_adicionar_item_comanda_idempotente",
      {
        p_id_salao: params.idSalao,
        p_id_comanda: params.idComanda,
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
        p_comissao_assistente_percentual: resolved.comissaoAssistentePercentual,
        p_base_calculo: resolved.baseCalculo,
        p_desconta_taxa_maquininha: resolved.descontaTaxaMaquininha,
        p_origem: resolved.origem,
        p_observacoes: resolved.observacoes as unknown as string,
        p_desconto: sanitizeMoney(params.comanda.desconto),
        p_acrescimo: sanitizeMoney(params.comanda.acrescimo),
        p_idempotency_key: key || undefined,
      }
    );

    if (
      addItemError &&
      isMissingRpcFunction(addItemError, "fn_adicionar_item_comanda_idempotente")
    ) {
      const fallback = await params.supabaseAdmin.rpc("fn_adicionar_item_comanda", {
        p_id_salao: params.idSalao,
        p_id_comanda: params.idComanda,
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
        p_comissao_assistente_percentual: resolved.comissaoAssistentePercentual,
        p_base_calculo: resolved.baseCalculo,
        p_desconta_taxa_maquininha: resolved.descontaTaxaMaquininha,
        p_origem: resolved.origem,
        p_observacoes: resolved.observacoes as unknown as string,
        p_desconto: sanitizeMoney(params.comanda.desconto),
        p_acrescimo: sanitizeMoney(params.comanda.acrescimo),
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

    if (!firstItemId) {
      firstItemId = itemId;
    }
    houveReplay = houveReplay || jaExistia;
  }

  return {
    firstItemId,
    houveReplay,
  };
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

  const { data: agendamentoBase, error: agendamentoError } = await supabaseAdmin
    .from("agendamentos")
    .select("id, id_salao")
    .eq("id", idAgendamento)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (agendamentoError || !agendamentoBase?.id) {
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

  const { data: detalhesAgendamento, error: detalhesAgendamentoError } = await supabaseAdmin
    .from("agendamentos")
    .select("id, profissional_id, servico_id, observacoes")
    .eq("id", idAgendamento)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (detalhesAgendamentoError) {
    throw detalhesAgendamentoError;
  }

  if (detalhesAgendamento?.id && detalhesAgendamento.servico_id) {
    const resolved = await resolverItemPayload({
      supabaseAdmin,
      idSalao,
      item: {
        tipo_item: "servico",
        quantidade: 1,
        valor_unitario: 0,
        id_servico: detalhesAgendamento.servico_id,
        id_agendamento: idAgendamento,
        id_profissional: detalhesAgendamento.profissional_id,
        observacoes: detalhesAgendamento.observacoes,
        origem: "agenda",
      },
    });

    if (resolved.ehCombo && data) {
      const { error: deleteError } = await supabaseAdmin
        .from("comanda_itens")
        .delete()
        .eq("id_salao", idSalao)
        .eq("id_comanda", data)
        .eq("id_agendamento", idAgendamento);

      if (deleteError) {
        throw deleteError;
      }

      const expanded = await expandirItensCombo({
        supabaseAdmin,
        idSalao,
        resolved,
      });

      await inserirItensResolvidosNaComanda({
        supabaseAdmin,
        idSalao,
        idComanda: data,
        resolvedItems: expanded,
        comanda: {
          idComanda: data,
          desconto: 0,
          acrescimo: 0,
        },
      });
    }
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
  const expanded = await expandirItensCombo({
    supabaseAdmin,
    idSalao,
    resolved,
  });
  const itemIdempotencyKey = idempotencyKey || criarChaveItemAgendamento(resolved);
  const insertResult = await inserirItensResolvidosNaComanda({
    supabaseAdmin,
    idSalao,
    idComanda,
    resolvedItems: expanded,
    comanda,
    idempotencyKey: itemIdempotencyKey,
  });

  return {
    idComanda,
    idItem: insertResult.firstItemId,
    idempotencyKey: itemIdempotencyKey,
    idempotentReplay: insertResult.houveReplay,
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
  let valorUnitario = sanitizeMoney(item.valor_unitario);
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
          "id, nome, preco, preco_padrao, custo_produto, comissao_percentual, comissao_percentual_padrao, comissao_assistente_percentual, base_calculo, desconta_taxa_maquininha, eh_combo, combo_resumo"
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
    comissaoPercentual = servico.eh_combo ? 0 : regra.comissaoPercentual;
    comissaoAssistentePercentual =
      servico.eh_combo ||
      !shouldAplicarComissaoAssistente({
        idAssistente,
        idProfissional,
      })
        ? 0
        : regra.comissaoAssistentePercentual;
    baseCalculo = regra.baseCalculo;
    descontaTaxaMaquininha = regra.descontaTaxaMaquininha;

    if (!valorUnitario) {
      valorUnitario = sanitizeMoney(servico.preco_padrao ?? servico.preco ?? 0);
    }
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
    ehCombo: Boolean((item as { eh_combo?: boolean | null }).eh_combo),
    comboResumo: sanitizeText((item as { combo_resumo?: string | null }).combo_resumo),
  };

  if (tipoItem === "servico" && resolved.idServico) {
    const { data: servicoInfoRaw } = await supabaseAdmin
      .from("servicos")
      .select("eh_combo, combo_resumo")
      .eq("id", resolved.idServico)
      .eq("id_salao", idSalao)
      .maybeSingle();
    const servicoInfo = servicoInfoRaw as ServicoComboLookupRow | null;

    resolved.ehCombo = Boolean(servicoInfo?.eh_combo);
    resolved.comboResumo = sanitizeText(servicoInfo?.combo_resumo);
  }

  return resolved;
}
