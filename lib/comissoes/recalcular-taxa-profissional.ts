import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import type { SupabaseClient } from "@supabase/supabase-js";

type ConfigRow = {
  repassa_taxa_cliente?: boolean | null;
  desconta_taxa_profissional?: boolean | null;
};

type PagamentoRow = {
  taxa_maquininha_valor?: number | null;
};

type ItemRow = {
  id: string;
  base_calculo_aplicada?: string | null;
  desconta_taxa_maquininha_aplicada?: boolean | null;
};

type ComissaoRow = {
  id: string;
  id_comanda_item?: string | null;
  tipo_profissional?: string | null;
  tipo_destinatario?: string | null;
  id_profissional?: string | null;
  id_assistente?: string | null;
  percentual?: number | null;
  percentual_aplicado?: number | null;
  valor_base?: number | null;
};

export type RecalcularTaxaBody = {
  idSalao?: string | null;
  idComanda?: string | null;
};

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function getTipoDestinatario(row: ComissaoRow) {
  const tipo = String(row.tipo_profissional || row.tipo_destinatario || "").trim();

  if (tipo) return tipo.toLowerCase();
  if (row.id_assistente) return "assistente";
  if (row.id_profissional) return "profissional";

  return "";
}

function getPercentualAplicado(row: ComissaoRow) {
  return Number(row.percentual_aplicado ?? row.percentual ?? 0);
}

export function buildErroCargaMensagem(errors: {
  configError: unknown;
  pagamentosError: unknown;
  itensError: unknown;
  comissoesError: unknown;
}) {
  const fontes: string[] = [];

  if (errors.configError) fontes.push("configuracoes do salao");
  if (errors.pagamentosError) fontes.push("pagamentos da comanda");
  if (errors.itensError) fontes.push("itens da comanda");
  if (errors.comissoesError) fontes.push("lancamentos de comissao");

  if (fontes.length === 0) {
    return "Erro ao carregar dados para recalcular a comissao.";
  }

  if (fontes.length === 1) {
    return `Erro ao carregar ${fontes[0]} para recalcular a comissao.`;
  }

  return `Erro ao carregar ${fontes.join(", ")} para recalcular a comissao.`;
}

export function distribuirTaxa(
  totalTaxa: number,
  rows: Array<{ id: string; peso: number }>
) {
  if (totalTaxa <= 0 || rows.length === 0) return new Map<string, number>();

  const totalPeso = rows.reduce((acc, row) => acc + row.peso, 0);
  if (totalPeso <= 0) return new Map<string, number>();

  const distribuicao = new Map<string, number>();
  let acumulado = 0;

  rows.forEach((row, index) => {
    const ultimo = index === rows.length - 1;
    const valor = ultimo
      ? roundCurrency(totalTaxa - acumulado)
      : roundCurrency((totalTaxa * row.peso) / totalPeso);

    distribuicao.set(row.id, valor);
    acumulado = roundCurrency(acumulado + valor);
  });

  return distribuicao;
}

export async function validarPermissaoRecalculoComissao(idSalao: string) {
  return requireSalaoPermission(idSalao, "comissoes_ver", {
    allowedNiveis: ["admin", "gerente"],
  });
}

export async function recalcularTaxaProfissional(params: {
  supabaseAdmin: SupabaseClient;
  idSalao: string;
  idComanda: string;
}) {
  const { supabaseAdmin, idSalao, idComanda } = params;

  const [
    { data: config, error: configError },
    { data: pagamentos, error: pagamentosError },
    { data: itens, error: itensError },
    { data: comissoes, error: comissoesError },
  ] = await Promise.all([
    supabaseAdmin
      .from("configuracoes_salao")
      .select("repassa_taxa_cliente, desconta_taxa_profissional")
      .eq("id_salao", idSalao)
      .maybeSingle(),

    supabaseAdmin
      .from("comanda_pagamentos")
      .select("taxa_maquininha_valor")
      .eq("id_salao", idSalao)
      .eq("id_comanda", idComanda),

    supabaseAdmin
      .from("comanda_itens")
      .select("id, base_calculo_aplicada, desconta_taxa_maquininha_aplicada")
      .eq("id_salao", idSalao)
      .eq("id_comanda", idComanda)
      .eq("ativo", true),

    supabaseAdmin
      .from("comissoes_lancamentos")
      .select("competencia, competencia_data, criado_em, descricao, id, id_agendamento, id_assistente, id_comanda, id_comanda_item, id_profissional, id_salao, observacoes, origem_percentual, pago_em, percentual, percentual_aplicado, status, tipo_destinatario, tipo_profissional, updated_at, valor_base, valor_comissao, valor_comissao_assistente")
      .eq("id_salao", idSalao)
      .eq("id_comanda", idComanda),
  ]);

  if (configError || pagamentosError || itensError || comissoesError) {
    throw new Error(
      buildErroCargaMensagem({
        configError,
        pagamentosError,
        itensError,
        comissoesError,
      })
    );
  }

  const configRow = (config as ConfigRow | null) || null;
  const repassaTaxaCliente = Boolean(configRow?.repassa_taxa_cliente);
  const descontaTaxaProfissional = Boolean(
    configRow?.desconta_taxa_profissional
  );

  if (repassaTaxaCliente || !descontaTaxaProfissional) {
    return {
      ok: true as const,
      skipped: true,
      reason: repassaTaxaCliente
        ? "Taxa repassada ao cliente."
        : "Desconto da taxa do profissional desativado.",
    };
  }

  const totalTaxa = roundCurrency(
    ((pagamentos as PagamentoRow[] | null) || []).reduce(
      (acc, item) => acc + Number(item.taxa_maquininha_valor || 0),
      0
    )
  );

  if (totalTaxa <= 0) {
    return {
      ok: true as const,
      skipped: true,
      reason: "Sem taxa de maquininha para descontar.",
    };
  }

  const itensMap = new Map<string, ItemRow>();
  ((itens as ItemRow[] | null) || []).forEach((item) => {
    itensMap.set(item.id, item);
  });

  const comissoesElegiveis = ((comissoes as ComissaoRow[] | null) || []).filter(
    (row) => {
      const item = row.id_comanda_item ? itensMap.get(row.id_comanda_item) : null;
      const tipo = getTipoDestinatario(row);

      if (!item) return false;
      if (tipo === "assistente") return false;
      if (String(item.base_calculo_aplicada || "").toLowerCase() !== "bruto") {
        return false;
      }
      if (!item.desconta_taxa_maquininha_aplicada) return false;

      const percentual = getPercentualAplicado(row);
      const valorBase = Number(row.valor_base || 0);

      return percentual > 0 && valorBase > 0;
    }
  );

  if (comissoesElegiveis.length === 0) {
    return {
      ok: true as const,
      skipped: true,
      reason: "Nenhuma comissao elegivel para desconto em base bruta.",
    };
  }

  const distribuicaoTaxa = distribuirTaxa(
    totalTaxa,
    comissoesElegiveis.map((row) => ({
      id: row.id,
      peso: Number(row.valor_base || 0),
    }))
  );

  await Promise.all(
    comissoesElegiveis.map(async (row) => {
      const percentual = getPercentualAplicado(row);
      const valorBase = Number(row.valor_base || 0);
      const taxaRateada = Number(distribuicaoTaxa.get(row.id) || 0);
      const valorBrutoComissao = roundCurrency((valorBase * percentual) / 100);
      const valorFinalComissao = Math.max(
        roundCurrency(valorBrutoComissao - taxaRateada),
        0
      );

      const { error: updateError } = await supabaseAdmin
        .from("comissoes_lancamentos")
        .update({
          valor_comissao: valorFinalComissao,
        })
        .eq("id", row.id)
        .eq("id_salao", idSalao);

      if (updateError) {
        throw updateError;
      }
    })
  );

  return {
    ok: true as const,
    adjusted: true,
    totalTaxa,
    adjustedRows: comissoesElegiveis.length,
  };
}

export { AuthzError };
