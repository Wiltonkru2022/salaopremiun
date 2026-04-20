import { registrarLogSistema } from "@/lib/system-logs";
import type { CaixaProcessarBody, CaixaProcessarContext } from "./types";
import { CaixaInputError, sanitizeMoney, sanitizeText, sanitizeUuid } from "./utils";

export async function abrirCaixa(
  ctx: CaixaProcessarContext,
  body: CaixaProcessarBody
) {
  const { error, data } = await ctx.supabaseAdmin.rpc("fn_caixa_abrir_sessao", {
    p_id_salao: ctx.idSalao,
    p_id_usuario: ctx.idUsuario,
    p_valor_abertura: sanitizeMoney(body.sessao?.valorAbertura),
    p_observacoes: sanitizeText(body.sessao?.observacoes),
  });

  if (error) throw error;

  await registrarLogSistema({
    gravidade: "info",
    modulo: "caixa",
    idSalao: ctx.idSalao,
    idUsuario: ctx.idUsuario,
    mensagem: "Caixa aberto pelo servidor.",
    detalhes: {
      acao: "abrir_caixa",
      id_sessao: data || null,
      valor_abertura: sanitizeMoney(body.sessao?.valorAbertura),
    },
  });

  return { idSessao: data || null };
}

export async function fecharCaixa(
  ctx: CaixaProcessarContext,
  body: CaixaProcessarBody
) {
  const idSessao = sanitizeUuid(body.sessao?.idSessao);
  if (!idSessao) {
    throw new CaixaInputError("Sessao do caixa obrigatoria para fechamento.");
  }

  const { error, data } = await ctx.supabaseAdmin.rpc("fn_caixa_fechar_sessao", {
    p_id_salao: ctx.idSalao,
    p_id_sessao: idSessao,
    p_id_usuario: ctx.idUsuario,
    p_valor_fechamento: sanitizeMoney(body.sessao?.valorFechamento),
    p_observacoes: sanitizeText(body.sessao?.observacoes),
  });

  if (error) throw error;

  await registrarLogSistema({
    gravidade: "info",
    modulo: "caixa",
    idSalao: ctx.idSalao,
    idUsuario: ctx.idUsuario,
    mensagem: "Caixa fechado pelo servidor.",
    detalhes: {
      acao: "fechar_caixa",
      id_sessao: data || idSessao,
      valor_fechamento: sanitizeMoney(body.sessao?.valorFechamento),
    },
  });

  return { idSessao: data || null };
}
