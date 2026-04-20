import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import {
  carregarComandaDoSalao,
  executarMutacaoComandaComEstoque,
} from "@/lib/comandas/lifecycle";
import {
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { AcaoVenda } from "@/types/vendas";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ACOES_VENDA: AcaoVenda[] = ["detalhes", "reabrir", "excluir"];

export function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

export function sanitizeText(value: unknown) {
  const parsed = String(value || "").trim();
  return parsed || null;
}

export function resolveVendaHttpStatus(error: unknown) {
  const candidate = error as { code?: string } | null;
  if (!candidate?.code) return 500;
  if (candidate.code === "P0001") return 400;
  if (candidate.code === "23514") return 409;
  return 500;
}

export function isAcaoVenda(value: string): value is AcaoVenda {
  return ACOES_VENDA.includes(value as AcaoVenda);
}

export async function validarComandaVenda(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idSalao: string;
  idComanda: string;
}) {
  return carregarComandaDoSalao({
    ...params,
    notFoundMessage: "Venda nao encontrada para este salao.",
  });
}

export async function carregarContextoVenda(params: {
  idSalao: string;
  acao: AcaoVenda;
}) {
  const { idSalao, acao } = params;

  const membership =
    acao === "detalhes"
      ? await requireSalaoPermission(idSalao, "vendas_ver")
      : await requireSalaoPermission(idSalao, "vendas_ver", {
          allowedNiveis: ["admin", "gerente"],
        });

  if (acao !== "detalhes") {
    await assertCanMutatePlanFeature(idSalao, "vendas");
  }

  return {
    membership,
    supabaseAdmin: getSupabaseAdmin(),
  };
}

export async function obterDetalhesVenda(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idComanda: string;
}) {
  const { supabaseAdmin, idComanda } = params;

  const { data, error } = await supabaseAdmin.rpc("fn_detalhes_venda", {
    p_id_comanda: idComanda,
  });

  if (error) {
    throw error;
  }

  return { detalhe: data || null };
}

export async function reabrirVenda(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idSalao: string;
  idComanda: string;
  motivo?: string | null;
  idUsuario: string;
}) {
  const { supabaseAdmin, idSalao, idComanda, motivo, idUsuario } = params;
  return executarMutacaoComandaComEstoque({
    supabaseAdmin,
    idSalao,
    idComanda,
    idUsuario,
    sourceModule: "vendas",
    sourceAction: "reabrir_venda",
    stockMode: "revert",
    mutate: async () => {
      const { error } = await supabaseAdmin.rpc("fn_reabrir_venda_para_caixa", {
        p_id_comanda: idComanda,
        p_motivo: sanitizeText(motivo),
        p_reopened_by: idUsuario,
      });

      if (error) {
        throw error;
      }
    },
    successMessage: "Venda reaberta para o caixa pelo servidor.",
    warningMessage: "Venda reaberta com aviso de estoque.",
    logModule: "vendas",
    logAction: "reabrir",
    baseDetails: {
      motivo: sanitizeText(motivo),
    },
  });
}

export async function excluirVenda(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idSalao: string;
  idComanda: string;
  motivo?: string | null;
  idUsuario: string;
}) {
  const { supabaseAdmin, idSalao, idComanda, motivo, idUsuario } = params;
  return executarMutacaoComandaComEstoque({
    supabaseAdmin,
    idSalao,
    idComanda,
    idUsuario,
    sourceModule: "vendas",
    sourceAction: "excluir_venda",
    stockMode: "revert",
    mutate: async () => {
      const { error } = await supabaseAdmin.rpc("fn_excluir_venda_completa", {
        p_id_comanda: idComanda,
        p_motivo: sanitizeText(motivo),
        p_deleted_by: idUsuario,
      });

      if (error) {
        throw error;
      }
    },
    successMessage: "Venda excluida pelo servidor.",
    warningMessage: "Venda excluida com aviso de estoque.",
    logModule: "vendas",
    logAction: "excluir",
    baseDetails: {
      motivo: sanitizeText(motivo),
    },
    warningSeverity: "warning",
    successSeverity: "warning",
  });
}

export { AuthzError, PlanAccessError };
