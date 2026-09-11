import { registrarLogSistema } from "@/lib/system-logs";
import type { CaixaProcessarBody, CaixaProcessarContext } from "./types";
import {
  isMissingRpcFunction,
  CaixaInputError,
  sanitizeIdempotencyKey,
  sanitizeMoney,
  sanitizeText,
  sanitizeUuid,
} from "./utils";

export async function lancarMovimentacao(
  ctx: CaixaProcessarContext,
  body: CaixaProcessarBody
) {
  const idSessao = sanitizeUuid(body.sessao?.idSessao);
  if (!idSessao) {
    throw new CaixaInputError("Sessao do caixa obrigatoria para lancar movimentacao.");
  }

  const idempotencyKey = sanitizeIdempotencyKey(body.idempotencyKey);
  const tipo = sanitizeText(body.movimento?.tipo);
  if (!tipo) {
    throw new CaixaInputError("Tipo de movimentacao obrigatorio.");
  }

  const movimentoPayload = {
    p_id_salao: ctx.idSalao,
    p_id_sessao: idSessao,
    p_id_usuario: ctx.idUsuario,
    p_tipo: tipo,
    p_valor: sanitizeMoney(body.movimento?.valor),
    p_descricao: sanitizeText(body.movimento?.descricao) || undefined,
    p_id_profissional: sanitizeUuid(body.movimento?.idProfissional) || undefined,
    p_id_comanda: sanitizeUuid(body.movimento?.idComanda) || undefined,
    p_forma_pagamento: sanitizeText(body.movimento?.formaPagamento) || undefined,
  };

  let { data, error } = await ctx.supabaseAdmin.rpc(
    "fn_caixa_lancar_movimentacao_idempotente",
    {
      ...movimentoPayload,
      p_idempotency_key: idempotencyKey || undefined,
    }
  );

  if (
    error &&
    isMissingRpcFunction(error, "fn_caixa_lancar_movimentacao_idempotente")
  ) {
    const fallback = await ctx.supabaseAdmin.rpc(
      "fn_caixa_lancar_movimentacao",
      movimentoPayload
    );
    data = fallback.data
      ? fallback.data.map((item) => ({ ...item, ja_existia: false }))
      : null;
    error = fallback.error;
  }

  if (error) throw error;

  const resultRow = Array.isArray(data) ? data[0] : data;
  const idMovimentacao = resultRow?.id_movimentacao || null;
  const idVale = resultRow?.id_vale || null;
  const jaExistia = Boolean(resultRow?.ja_existia);

  await registrarLogSistema({
    gravidade: jaExistia ? "warning" : "info",
    modulo: "caixa",
    idSalao: ctx.idSalao,
    idUsuario: ctx.idUsuario,
    mensagem: jaExistia
      ? "Movimentacao do caixa reaproveitada por idempotencia."
      : "Movimentacao do caixa lancada pelo servidor.",
    detalhes: {
      acao: "lancar_movimentacao",
      id_sessao: idSessao,
      id_movimentacao: idMovimentacao,
      id_vale: idVale,
      tipo: movimentoPayload.p_tipo,
      valor: movimentoPayload.p_valor,
      idempotency_key: idempotencyKey,
      ja_existia: jaExistia,
    },
  });

  return {
    idMovimentacao,
    idVale,
    idempotentReplay: jaExistia,
  };
}
