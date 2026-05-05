import { executarMutacaoComandaComEstoque } from "@/lib/comandas/lifecycle";
import { getPlanoAccessSnapshot, PlanAccessError } from "@/lib/plans/access";
import { registrarLogSistema } from "@/lib/system-logs";
import type { CaixaProcessarBody, CaixaProcessarContext } from "./types";
import { carregarSessaoAberta, sanitizeText } from "./utils";

export async function finalizarComanda(params: {
  ctx: CaixaProcessarContext;
  idComanda: string;
}) {
  const { ctx, idComanda } = params;
  await carregarSessaoAberta(ctx.supabaseAdmin, ctx.idSalao);

  const snapshot = await getPlanoAccessSnapshot(ctx.idSalao);
  if (snapshot.planoCodigo === "basico") {
    const { count, error: produtoCountError } = await ctx.supabaseAdmin
      .from("comanda_itens")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", ctx.idSalao)
      .eq("id_comanda", idComanda)
      .eq("ativo", true)
      .eq("tipo_item", "produto");

    if (produtoCountError) {
      throw new Error("Erro ao validar itens da comanda antes da finalizacao.");
    }

    if ((count || 0) > 0) {
      throw new PlanAccessError(
        "Venda de produtos no caixa fica liberada a partir do plano Pro.",
        "PRODUCT_SALES_PLAN_REQUIRED"
      );
    }
  }

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

  return executarMutacaoComandaComEstoque({
    supabaseAdmin: ctx.supabaseAdmin,
    idSalao: ctx.idSalao,
    idComanda,
    idUsuario: ctx.idUsuario,
    sourceModule: "caixa",
    sourceAction: "finalizar_comanda",
    stockMode: "apply",
    mutate: async () => {
      const { error } = await ctx.supabaseAdmin.rpc("fn_caixa_finalizar_comanda", {
        p_id_salao: ctx.idSalao,
        p_id_comanda: idComanda,
        p_exigir_cliente: exigirCliente,
      });

      if (error) throw error;
    },
    successMessage: "Comanda finalizada pelo servidor.",
    warningMessage: "Comanda finalizada com aviso de estoque.",
    logModule: "caixa",
    logAction: "finalizar_comanda",
    baseDetails: {
      exigir_cliente: exigirCliente,
    },
  });
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
    p_motivo: motivo || undefined,
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
