import { processarEstoqueComanda } from "@/lib/estoque/comanda-stock";
import { registrarLogSistema } from "@/lib/system-logs";
import type { CaixaProcessarBody, CaixaProcessarContext } from "./types";
import { carregarSessaoAberta, sanitizeText } from "./utils";

export async function finalizarComanda(params: {
  ctx: CaixaProcessarContext;
  idComanda: string;
}) {
  const { ctx, idComanda } = params;
  await carregarSessaoAberta(ctx.supabaseAdmin, ctx.idSalao);

  const { data: config, error: configError } = await ctx.supabaseAdmin
    .from("configuracoes_salao")
    .select("exigir_cliente_na_venda")
    .eq("id_salao", ctx.idSalao)
    .maybeSingle();

  if (configError) {
    throw new Error("Erro ao carregar configuracoes do caixa.");
  }

  const exigirCliente = Boolean(
    (config as { exigir_cliente_na_venda?: boolean | null } | null)
      ?.exigir_cliente_na_venda
  );

  const { error } = await ctx.supabaseAdmin.rpc("fn_caixa_finalizar_comanda", {
    p_id_salao: ctx.idSalao,
    p_id_comanda: idComanda,
    p_exigir_cliente: exigirCliente,
  });

  if (error) throw error;

  let warning: string | null = null;

  try {
    const estoqueResult = await processarEstoqueComanda(ctx.supabaseAdmin, {
      idSalao: ctx.idSalao,
      idComanda,
      idUsuario: ctx.idUsuario,
    });

    if (
      estoqueResult.skipped &&
      estoqueResult.reason &&
      !estoqueResult.reason.toLowerCase().includes("ja foi processado")
    ) {
      warning = estoqueResult.reason;
    }
  } catch (estoqueError) {
    warning =
      estoqueError instanceof Error
        ? estoqueError.message
        : "nao foi possivel atualizar o estoque da comanda.";
  }

  await registrarLogSistema({
    gravidade: warning ? "warning" : "info",
    modulo: "caixa",
    idSalao: ctx.idSalao,
    idUsuario: ctx.idUsuario,
    mensagem: warning
      ? "Comanda finalizada com aviso de estoque."
      : "Comanda finalizada pelo servidor.",
    detalhes: {
      acao: "finalizar_comanda",
      id_comanda: idComanda,
      exigir_cliente: exigirCliente,
      warning,
    },
  });

  return { warning };
}

export async function cancelarComanda(params: {
  ctx: CaixaProcessarContext;
  body: CaixaProcessarBody;
  idComanda: string;
}) {
  const { ctx, body, idComanda } = params;
  const motivo = sanitizeText(body.motivo);

  const { error } = await ctx.supabaseAdmin.rpc("fn_caixa_cancelar_comanda", {
    p_id_salao: ctx.idSalao,
    p_id_comanda: idComanda,
    p_motivo: motivo,
  });

  if (error) throw error;

  await registrarLogSistema({
    gravidade: "warning",
    modulo: "caixa",
    idSalao: ctx.idSalao,
    idUsuario: ctx.idUsuario,
    mensagem: "Comanda cancelada pelo servidor.",
    detalhes: {
      acao: "cancelar_comanda",
      id_comanda: idComanda,
      motivo,
    },
  });

  return {};
}
