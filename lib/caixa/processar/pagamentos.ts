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

  if (valorBase <= 0) {
    throw new CaixaInputError("Informe um valor de pagamento valido.");
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
  const idempotencyKey = sanitizeIdempotencyKey(body.idempotencyKey);

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
    p_observacoes: sanitizeText(body.pagamento?.observacoes),
  };

  let { data, error } = await ctx.supabaseAdmin.rpc(
    "fn_caixa_adicionar_pagamento_comanda_idempotente",
    {
      ...pagamentoPayload,
      p_idempotency_key: idempotencyKey,
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
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;

  const resultRow = Array.isArray(data) ? data[0] : data;
  const idPagamento = resultRow?.id_pagamento || null;
  const idMovimentacao = resultRow?.id_movimentacao || null;
  const jaExistia = Boolean(resultRow?.ja_existia);

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

  const { error } = await ctx.supabaseAdmin.rpc(
    "fn_caixa_remover_pagamento_comanda",
    {
      p_id_salao: ctx.idSalao,
      p_id_comanda: idComanda,
      p_id_pagamento: idPagamento,
    }
  );

  if (error) throw error;

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
    },
  });

  return {};
}
