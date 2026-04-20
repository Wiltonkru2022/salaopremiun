import {
  aplicarBaixaEstoqueNoFluxoComanda,
  reverterEstoqueNoFluxoComanda,
} from "@/lib/comandas/operational-flow";
import { registrarLogSistema } from "@/lib/system-logs";
import type { getSupabaseAdmin } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

type ComandaFlowModule = "caixa" | "vendas" | "comandas";
type EstoqueMode = "apply" | "revert";
type LogSeverity = "info" | "warning" | "error";

export async function carregarComandaDoSalao(params: {
  supabaseAdmin: AdminClient;
  idSalao: string;
  idComanda: string;
  notFoundMessage?: string;
}) {
  const {
    supabaseAdmin,
    idSalao,
    idComanda,
    notFoundMessage = "Comanda nao encontrada para este salao.",
  } = params;

  const { data: comanda, error } = await supabaseAdmin
    .from("comandas")
    .select("id, id_salao, id_cliente, numero, status")
    .eq("id", idComanda)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (error) throw error;

  if (!comanda?.id) {
    throw new Error(notFoundMessage);
  }

  return comanda;
}

export async function executarMutacaoComandaComEstoque(params: {
  supabaseAdmin: AdminClient;
  idSalao: string;
  idComanda: string;
  idUsuario: string;
  sourceModule: ComandaFlowModule;
  sourceAction: string;
  stockMode: EstoqueMode;
  mutate: () => Promise<void>;
  successMessage: string;
  warningMessage: string;
  logModule: string;
  logAction: string;
  baseDetails?: Record<string, unknown>;
  warningSeverity?: LogSeverity;
  successSeverity?: LogSeverity;
}) {
  const {
    supabaseAdmin,
    idSalao,
    idComanda,
    idUsuario,
    sourceModule,
    sourceAction,
    stockMode,
    mutate,
    successMessage,
    warningMessage,
    logModule,
    logAction,
    baseDetails,
    warningSeverity = "warning",
    successSeverity = "info",
  } = params;

  await mutate();

  const estoqueFlow =
    stockMode === "apply"
      ? await aplicarBaixaEstoqueNoFluxoComanda({
          supabaseAdmin,
          idSalao,
          idComanda,
          idUsuario,
          sourceModule,
          sourceAction,
        })
      : await reverterEstoqueNoFluxoComanda({
          supabaseAdmin,
          idSalao,
          idComanda,
          idUsuario,
          sourceModule,
          sourceAction,
        });

  const warning = estoqueFlow.warning;

  await registrarLogSistema({
    gravidade: warning ? warningSeverity : successSeverity,
    modulo: logModule,
    idSalao,
    idUsuario,
    mensagem: warning ? warningMessage : successMessage,
    detalhes: {
      acao: logAction,
      id_comanda: idComanda,
      warning,
      ...baseDetails,
    },
  });

  return {
    warning,
  };
}
