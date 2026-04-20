import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { reverterEstoqueComanda, processarEstoqueComanda } from "@/lib/estoque/comanda-stock";
import type { getSupabaseAdmin } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

type EstoqueFlowParams = {
  supabaseAdmin: AdminClient;
  idSalao: string;
  idComanda: string;
  idUsuario?: string | null;
  sourceModule: "caixa" | "vendas" | "comandas";
  sourceAction: string;
};

function normalizeWarning(result: { skipped?: boolean; reason?: string | null }) {
  if (!result.skipped || !result.reason) {
    return null;
  }

  const reason = String(result.reason || "").trim();
  if (!reason) return null;
  if (reason.toLowerCase().includes("ja foi processado")) return null;
  return reason;
}

export async function aplicarBaixaEstoqueNoFluxoComanda(
  params: EstoqueFlowParams
) {
  try {
    const result = await processarEstoqueComanda(params.supabaseAdmin, {
      idSalao: params.idSalao,
      idComanda: params.idComanda,
      idUsuario: params.idUsuario || null,
      sourceModule: params.sourceModule,
      sourceAction: params.sourceAction,
    });

    return {
      warning: normalizeWarning(result),
      result,
    };
  } catch (error) {
    const description =
      error instanceof Error
        ? error.message
        : "Nao foi possivel atualizar o estoque da comanda.";

    try {
      await reportOperationalIncident({
        supabaseAdmin: params.supabaseAdmin,
        key: `fluxo:comanda:estoque_baixa:${params.idSalao}:${params.idComanda}:${params.sourceAction}`,
        module: "operacao_comanda",
        title: "Baixa de estoque falhou no fluxo da comanda",
        description,
        severity: "critica",
        idSalao: params.idSalao,
        details: {
          source_module: params.sourceModule,
          source_action: params.sourceAction,
          id_comanda: params.idComanda,
        },
      });
    } catch (incidentError) {
      console.error(
        "Falha ao registrar incidente de baixa de estoque no fluxo da comanda:",
        incidentError
      );
    }

    return {
      warning: description,
      result: null,
    };
  }
}

export async function reverterEstoqueNoFluxoComanda(
  params: EstoqueFlowParams
) {
  try {
    const result = await reverterEstoqueComanda(params.supabaseAdmin, {
      idSalao: params.idSalao,
      idComanda: params.idComanda,
      idUsuario: params.idUsuario || null,
      sourceModule: params.sourceModule,
      sourceAction: params.sourceAction,
    });

    return {
      warning: normalizeWarning(result),
      result,
    };
  } catch (error) {
    const description =
      error instanceof Error
        ? error.message
        : "Nao foi possivel devolver o estoque da comanda.";

    try {
      await reportOperationalIncident({
        supabaseAdmin: params.supabaseAdmin,
        key: `fluxo:comanda:estoque_reversao:${params.idSalao}:${params.idComanda}:${params.sourceAction}`,
        module: "operacao_comanda",
        title: "Reversao de estoque falhou no fluxo da comanda",
        description,
        severity: "alta",
        idSalao: params.idSalao,
        details: {
          source_module: params.sourceModule,
          source_action: params.sourceAction,
          id_comanda: params.idComanda,
        },
      });
    } catch (incidentError) {
      console.error(
        "Falha ao registrar incidente de reversao de estoque no fluxo da comanda:",
        incidentError
      );
    }

    return {
      warning: description,
      result: null,
    };
  }
}
