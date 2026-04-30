import { obterTaxaConfigurada, type CaixaTaxasConfig } from "@/lib/caixa/taxas";
import { registrarLogSistema } from "@/lib/system-logs";
import type { CaixaProcessarBody, CaixaProcessarContext } from "./types";
import {
  carregarSessaoAberta,
  CaixaInputError,
  isMissingRpcFunction,
  sanitizeIdempotencyKey,
  sanitizeInteger,
  sanitizeMoney,
  sanitizeText,
  sanitizeUuid,
} from "./utils";

type ComandaResumoPagamento = {
  idCliente: string | null;
  faltaReceber: number;
};

type RpcResult<T> = {
  data: T | null;
  error: unknown;
};

type PagamentoResumoRow = {
  id: string;
  forma_pagamento: string;
  valor_credito_cliente?: number | null;
};

type PagamentoIdempotenteRow = {
  id: string;
  id_movimentacao?: string | null;
  forma_pagamento: string;
  valor?: number | null;
  parcelas?: number | null;
  taxa_maquininha_percentual?: number | null;
  taxa_maquininha_valor?: number | null;
  valor_credito_cliente?: number | null;
  observacoes?: string | null;
};

async function callUnknownRpc<T>(
  ctx: CaixaProcessarContext,
  functionName: string,
  args: Record<string, unknown>
): Promise<RpcResult<T>> {
  return (ctx.supabaseAdmin.rpc as unknown as (
    name: string,
    params: Record<string, unknown>
  ) => Promise<RpcResult<T>>)(functionName, args);
}

async function carregarResumoComanda(
  ctx: CaixaProcessarContext,
  idComanda: string
): Promise<ComandaResumoPagamento> {
  const { data: comanda, error: comandaError } = await ctx.supabaseAdmin
    .from("comandas")
    .select("id_cliente, total")
    .eq("id", idComanda)
    .eq("id_salao", ctx.idSalao)
    .maybeSingle();

  if (comandaError || !comanda) {
    throw new Error("Nao foi possivel identificar a comanda para o pagamento.");
  }

  const { data: pagamentos, error: pagamentosError } = await ctx.supabaseAdmin
    .from("comanda_pagamentos")
    .select("valor")
    .eq("id_salao", ctx.idSalao)
    .eq("id_comanda", idComanda);

  if (pagamentosError) {
    throw new Error("Nao foi possivel consolidar os pagamentos da comanda.");
  }

  const total = sanitizeMoney(comanda.total);
  const totalPago = sanitizeMoney(
    ((pagamentos as Array<{ valor?: number | null }> | null) || []).reduce(
      (acc, item) => acc + Number(item.valor || 0),
      0
    )
  );

  return {
    idCliente: sanitizeUuid(comanda.id_cliente),
    faltaReceber: sanitizeMoney(Math.max(total - totalPago, 0)),
  };
}

async function carregarPagamentoPorIdempotencia(params: {
  ctx: CaixaProcessarContext;
  idComanda: string;
  idempotencyKey: string | null;
}) {
  const { ctx, idComanda, idempotencyKey } = params;

  if (!idempotencyKey) {
    return null;
  }

  const { data, error } = await ctx.supabaseAdmin
    .from("comanda_pagamentos")
    .select(
      "id, id_movimentacao, forma_pagamento, valor, parcelas, taxa_maquininha_percentual, taxa_maquininha_valor, valor_credito_cliente, observacoes"
    )
    .eq("id_salao", ctx.idSalao)
    .eq("id_comanda", idComanda)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new Error("Nao foi possivel validar a idempotencia do pagamento.");
  }

  return (data as PagamentoIdempotenteRow | null) || null;
}

async function usarCreditoCliente(params: {
  ctx: CaixaProcessarContext;
  idComanda: string;
  valorBase: number;
  observacoes: string;
  idempotencyKey: string | null;
}) {
  const { ctx, idComanda, valorBase, observacoes, idempotencyKey } = params;
  const pagamentoExistente = await carregarPagamentoPorIdempotencia({
    ctx,
    idComanda,
    idempotencyKey,
  });

  if (pagamentoExistente) {
    return {
      idPagamento: pagamentoExistente.id,
      idMovimentacao: pagamentoExistente.id_movimentacao || null,
      repassaTaxaCliente: false,
      taxaPercentual: 0,
      taxaValor: 0,
      valorFinalCobrado: sanitizeMoney(pagamentoExistente.valor),
      valorCreditoGerado: sanitizeMoney(
        pagamentoExistente.valor_credito_cliente
      ),
      creditoClienteUsado: sanitizeMoney(pagamentoExistente.valor),
      idempotentReplay: true,
    };
  }

  const resumo = await carregarResumoComanda(ctx, idComanda);

  if (!resumo.idCliente) {
    throw new CaixaInputError(
      "Vincule uma cliente na comanda antes de usar o credito dela."
    );
  }

  if (resumo.faltaReceber <= 0) {
    throw new CaixaInputError("Esta comanda ja esta quitada.");
  }

  if (valorBase > resumo.faltaReceber) {
    throw new CaixaInputError(
      "O credito da cliente nao pode passar do valor que falta receber."
    );
  }

  const { data, error } = await callUnknownRpc<
    Array<{ id_pagamento?: string | null; ja_existia?: boolean | null }>
  >(ctx, "fn_caixa_adicionar_pagamento_credito_cliente", {
    p_id_salao: ctx.idSalao,
    p_id_comanda: idComanda,
    p_id_usuario: ctx.idUsuario,
    p_valor: valorBase,
    p_observacoes: observacoes || null,
    p_idempotency_key: idempotencyKey || null,
  });

  if (error) throw error;

  const resultRow = Array.isArray(data) ? data[0] : data;
  const idPagamento = resultRow?.id_pagamento || null;
  const jaExistia = Boolean(resultRow?.ja_existia);

  await registrarLogSistema({
    gravidade: jaExistia ? "warning" : "info",
    modulo: "caixa",
    idSalao: ctx.idSalao,
    idUsuario: ctx.idUsuario,
    mensagem: jaExistia
      ? "Pagamento com credito da cliente reaproveitado por idempotencia."
      : "Pagamento com credito da cliente registrado no caixa.",
    detalhes: {
      acao: "adicionar_pagamento",
      origem_credito: true,
      id_comanda: idComanda,
      id_cliente: resumo.idCliente,
      id_pagamento: idPagamento,
      valor_base: valorBase,
      idempotency_key: idempotencyKey,
      ja_existia: jaExistia,
    },
  });

  return {
    idPagamento,
    idMovimentacao: null,
    repassaTaxaCliente: false,
    taxaPercentual: 0,
    taxaValor: 0,
    valorFinalCobrado: valorBase,
    valorCreditoGerado: 0,
    creditoClienteUsado: valorBase,
    idempotentReplay: jaExistia,
  };
}

export async function adicionarPagamento(params: {
  ctx: CaixaProcessarContext;
  body: CaixaProcessarBody;
  idComanda: string;
}) {
  const { ctx, body, idComanda } = params;
  const sessao = await carregarSessaoAberta(ctx.supabaseAdmin, ctx.idSalao);
  const { data: config, error: configError } = await ctx.supabaseAdmin
    .from("configuracoes_salao")
    .select(
      "repassa_taxa_cliente, taxa_maquininha_credito, taxa_maquininha_debito, taxa_maquininha_pix, taxa_maquininha_transferencia, taxa_maquininha_boleto, taxa_maquininha_outro, taxa_credito_1x, taxa_credito_2x, taxa_credito_3x, taxa_credito_4x, taxa_credito_5x, taxa_credito_6x, taxa_credito_7x, taxa_credito_8x, taxa_credito_9x, taxa_credito_10x, taxa_credito_11x, taxa_credito_12x"
    )
    .eq("id_salao", ctx.idSalao)
    .maybeSingle();

  if (configError) {
    throw new Error("Erro ao carregar as configuracoes do caixa.");
  }

  const formaPagamento = sanitizeText(body.pagamento?.formaPagamento) || "pix";
  const parcelas = sanitizeInteger(body.pagamento?.parcelas, 1);
  const valorBase = sanitizeMoney(body.pagamento?.valorBase);
  const observacoes = sanitizeText(body.pagamento?.observacoes) || "";
  const destinoExcedente = sanitizeText(body.pagamento?.destinoExcedente);
  const idempotencyKey = sanitizeIdempotencyKey(body.idempotencyKey);

  if (valorBase <= 0) {
    throw new CaixaInputError("Informe um valor de pagamento valido.");
  }

  if (formaPagamento === "credito_cliente") {
    return usarCreditoCliente({
      ctx,
      idComanda,
      valorBase,
      observacoes,
      idempotencyKey,
    });
  }

  const configCaixa = (config as CaixaTaxasConfig | null) || null;
  const taxaPercentual = sanitizeMoney(
    obterTaxaConfigurada(formaPagamento, parcelas, configCaixa)
  );
  const taxaValor = sanitizeMoney((valorBase * taxaPercentual) / 100);
  const repassaTaxaCliente = Boolean(configCaixa?.repassa_taxa_cliente);
  const valorFinalCobrado = repassaTaxaCliente
    ? sanitizeMoney(valorBase + taxaValor)
    : valorBase;
  const pagamentoExistente = await carregarPagamentoPorIdempotencia({
    ctx,
    idComanda,
    idempotencyKey,
  });

  if (pagamentoExistente) {
    return {
      idPagamento: pagamentoExistente.id,
      idMovimentacao: pagamentoExistente.id_movimentacao || null,
      repassaTaxaCliente,
      taxaPercentual: sanitizeMoney(
        pagamentoExistente.taxa_maquininha_percentual
      ),
      taxaValor: sanitizeMoney(pagamentoExistente.taxa_maquininha_valor),
      valorFinalCobrado: sanitizeMoney(pagamentoExistente.valor),
      valorCreditoGerado: sanitizeMoney(
        pagamentoExistente.valor_credito_cliente
      ),
      creditoClienteUsado: 0,
      idempotentReplay: true,
    };
  }

  const resumoAntesDoPagamento = await carregarResumoComanda(ctx, idComanda);

  if (resumoAntesDoPagamento.faltaReceber <= 0) {
    throw new CaixaInputError("Esta comanda ja esta quitada.");
  }

  const pagamentoPayload = {
    p_id_salao: ctx.idSalao,
    p_id_comanda: idComanda,
    p_id_sessao: sessao.id,
    p_id_usuario: ctx.idUsuario,
    p_forma_pagamento: formaPagamento,
    p_valor: valorFinalCobrado,
    p_parcelas: parcelas,
    p_taxa_percentual: taxaPercentual,
    p_taxa_valor: taxaValor,
    p_observacoes: observacoes,
  };

  let { data, error } = await ctx.supabaseAdmin.rpc(
    "fn_caixa_adicionar_pagamento_comanda_idempotente",
    {
      ...pagamentoPayload,
      p_idempotency_key: idempotencyKey || undefined,
    }
  );

  if (
    error &&
    isMissingRpcFunction(
      error,
      "fn_caixa_adicionar_pagamento_comanda_idempotente"
    )
  ) {
    const fallback = await ctx.supabaseAdmin.rpc(
      "fn_caixa_adicionar_pagamento_comanda",
      pagamentoPayload
    );
    data = fallback.data
      ? fallback.data.map((item) => ({ ...item, ja_existia: false }))
      : null;
    error = fallback.error;
  }

  if (error) throw error;

  const resultRow = Array.isArray(data) ? data[0] : data;
  const idPagamento = resultRow?.id_pagamento || null;
  const idMovimentacao = resultRow?.id_movimentacao || null;
  const jaExistia = Boolean(resultRow?.ja_existia);

  let valorCreditoGerado = 0;
  if (destinoExcedente === "credito_cliente") {
    const resumoComanda = resumoAntesDoPagamento;
    const excedente = sanitizeMoney(
      Math.max(valorFinalCobrado - Number(resumoComanda?.faltaReceber || 0), 0)
    );

    if (!resumoComanda?.idCliente) {
      throw new CaixaInputError(
        "Vincule uma cliente na comanda antes de guardar o excedente como credito."
      );
    }

    if (excedente <= 0) {
      throw new CaixaInputError(
        "Nao existe excedente para transformar em credito nesta comanda."
      );
    }

    if (!idPagamento) {
      throw new Error("Pagamento sem identificador para registrar o credito.");
    }

    const { error: creditoError } = await callUnknownRpc<unknown>(
      ctx,
      "fn_caixa_compensar_excedente_credito",
      {
        p_id_salao: ctx.idSalao,
        p_id_comanda: idComanda,
        p_id_pagamento: idPagamento,
        p_valor_credito: excedente,
      }
    );

    if (creditoError) throw creditoError;
    valorCreditoGerado = excedente;
  }

  await registrarLogSistema({
    gravidade: jaExistia ? "warning" : "info",
    modulo: "caixa",
    idSalao: ctx.idSalao,
    idUsuario: ctx.idUsuario,
    mensagem: jaExistia
      ? "Pagamento da comanda reaproveitado por idempotencia."
      : "Pagamento da comanda adicionado pelo servidor.",
    detalhes: {
      acao: "adicionar_pagamento",
      id_comanda: idComanda,
      id_sessao: sessao.id,
      id_pagamento: idPagamento,
      id_movimentacao: idMovimentacao,
      forma_pagamento: formaPagamento,
      valor_base: valorBase,
      valor_final_cobrado: valorFinalCobrado,
      taxa_percentual: taxaPercentual,
      taxa_valor: taxaValor,
      destino_excedente: destinoExcedente,
      valor_credito_gerado: valorCreditoGerado,
      idempotency_key: idempotencyKey,
      ja_existia: jaExistia,
    },
  });

  return {
    idPagamento,
    idMovimentacao,
    repassaTaxaCliente,
    taxaPercentual,
    taxaValor,
    valorFinalCobrado,
    valorCreditoGerado,
    creditoClienteUsado: 0,
    idempotentReplay: jaExistia,
  };
}

export async function removerPagamento(params: {
  ctx: CaixaProcessarContext;
  body: CaixaProcessarBody;
  idComanda: string;
}) {
  const { ctx, body, idComanda } = params;
  const idPagamento = sanitizeUuid(body.pagamento?.idPagamento);

  if (!idPagamento) {
    throw new CaixaInputError("Pagamento obrigatorio para remocao.");
  }

  const { data: pagamento, error: pagamentoError } = await ctx.supabaseAdmin
    .from("comanda_pagamentos")
    .select("id, forma_pagamento, valor_credito_cliente")
    .eq("id", idPagamento)
    .eq("id_comanda", idComanda)
    .eq("id_salao", ctx.idSalao)
    .maybeSingle();

  if (pagamentoError || !pagamento) {
    throw new Error("Pagamento nao encontrado para remocao.");
  }

  const pagamentoRow = (pagamento as unknown) as PagamentoResumoRow;

  if (pagamentoRow.forma_pagamento === "credito_cliente") {
    const { error } = await callUnknownRpc<unknown>(
      ctx,
      "fn_caixa_remover_pagamento_credito_cliente",
      {
        p_id_salao: ctx.idSalao,
        p_id_comanda: idComanda,
        p_id_pagamento: idPagamento,
      }
    );

    if (error) throw error;
  } else {
    if (Number(pagamentoRow.valor_credito_cliente || 0) > 0) {
      const { error: creditoError } = await callUnknownRpc<unknown>(
        ctx,
        "fn_caixa_estornar_excedente_credito",
        {
          p_id_salao: ctx.idSalao,
          p_id_comanda: idComanda,
          p_id_pagamento: idPagamento,
        }
      );

      if (creditoError) throw creditoError;
    }

    const { error } = await ctx.supabaseAdmin.rpc(
      "fn_caixa_remover_pagamento_comanda",
      {
        p_id_salao: ctx.idSalao,
        p_id_comanda: idComanda,
        p_id_pagamento: idPagamento,
      }
    );

    if (error) throw error;
  }

  await registrarLogSistema({
    gravidade: "warning",
    modulo: "caixa",
    idSalao: ctx.idSalao,
    idUsuario: ctx.idUsuario,
    mensagem: "Pagamento da comanda removido pelo servidor.",
    detalhes: {
      acao: "remover_pagamento",
      id_comanda: idComanda,
      id_pagamento: idPagamento,
      forma_pagamento: pagamentoRow.forma_pagamento,
      valor_credito_cliente: Number(pagamentoRow.valor_credito_cliente || 0),
    },
  });

  return {};
}
