import type { SupabaseClient } from "@supabase/supabase-js";

export type ProcessarComissoesAcao = "marcar_pago" | "cancelar";

type ProcessamentoRow = {
  total_lancamentos: number | string | null;
  total_vales: number | string | null;
  total_profissionais_com_vales: number | string | null;
  ids_processados: string[] | null;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

export function sanitizeIds(ids: unknown) {
  if (!Array.isArray(ids)) return [];

  return Array.from(
    new Set(
      ids
        .map((value) => String(value || "").trim())
        .filter((value) => UUID_REGEX.test(value))
    )
  );
}

export function resolveComissoesHttpStatus(error: unknown) {
  const candidate = error as { code?: string } | null;
  if (!candidate?.code) return 500;
  if (candidate.code === "P0001") return 400;
  if (candidate.code === "23514") return 409;
  return 500;
}

export async function processarLancamentosComissao(params: {
  supabaseAdmin: SupabaseClient;
  idSalao: string;
  ids: string[];
  acao: ProcessarComissoesAcao;
}) {
  const { data, error } = await params.supabaseAdmin.rpc(
    "fn_processar_comissoes_lancamentos",
    {
      p_id_salao: params.idSalao,
      p_ids: params.ids,
      p_acao: params.acao,
    }
  );

  if (error) {
    throw error;
  }

  const row = Array.isArray(data)
    ? (data[0] as ProcessamentoRow | undefined)
    : (data as ProcessamentoRow | null);

  return {
    totalLancamentos: Number(row?.total_lancamentos || 0),
    totalVales: Number(row?.total_vales || 0),
    totalProfissionaisComVales: Number(
      row?.total_profissionais_com_vales || 0
    ),
    idsProcessados: row?.ids_processados || [],
  };
}
