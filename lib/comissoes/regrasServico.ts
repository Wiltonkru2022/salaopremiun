import type { SupabaseClient } from "@supabase/supabase-js";

export type ServicoComissaoSource = {
  id?: string;
  nome?: string;
  preco?: number | null;
  preco_padrao?: number | null;
  custo_produto?: number | null;
  comissao_percentual?: number | null;
  comissao_percentual_padrao?: number | null;
  comissao_assistente_percentual?: number | null;
  base_calculo?: string | null;
  desconta_taxa_maquininha?: boolean | null;
};

export type ProfissionalComissaoSource = {
  id?: string;
  nome?: string;
  comissao_percentual?: number | null;
  comissao?: number | null;
};

export type VinculoProfissionalServicoSource = {
  preco_personalizado?: number | null;
  comissao_percentual?: number | null;
  comissao_assistente_percentual?: number | null;
  base_calculo?: string | null;
  desconta_taxa_maquininha?: boolean | null;
};

export type OrigemComissaoServico =
  | "profissional_servico"
  | "servico_padrao"
  | "profissional_padrao"
  | "sem_regra";

export type RegraComissaoServico = {
  valorUnitario: number;
  comissaoPercentual: number;
  comissaoAssistentePercentual: number;
  baseCalculo: string;
  descontaTaxaMaquininha: boolean;
  origemComissao: OrigemComissaoServico;
};

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickFirstNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = toNullableNumber(value);
    if (parsed !== null) return parsed;
  }

  return null;
}

function pickFirstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

export async function buscarVinculoProfissionalServico(params: {
  supabase: SupabaseClient;
  idProfissional: string;
  idServico: string;
}) {
  const { data, error } = await params.supabase
    .from("profissional_servicos")
    .select(
      `
      preco_personalizado,
      comissao_percentual,
      comissao_assistente_percentual,
      base_calculo,
      desconta_taxa_maquininha
    `
    )
    .eq("id_profissional", params.idProfissional)
    .eq("id_servico", params.idServico)
    .eq("ativo", true)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar vinculo profissional_servicos:", error);
    throw new Error("Erro ao buscar vinculo do profissional com o servico.");
  }

  return (data as VinculoProfissionalServicoSource | null) || null;
}

export function resolverRegraComissaoServico(params: {
  servico?: ServicoComissaoSource | null;
  profissional?: ProfissionalComissaoSource | null;
  vinculo?: VinculoProfissionalServicoSource | null;
}): RegraComissaoServico {
  const { servico, profissional, vinculo } = params;

  const valorUnitario =
    pickFirstNumber(vinculo?.preco_personalizado, servico?.preco_padrao, servico?.preco) ?? 0;

  const comissaoVinculo = pickFirstNumber(vinculo?.comissao_percentual);
  const comissaoServico = pickFirstNumber(
    servico?.comissao_percentual_padrao,
    servico?.comissao_percentual
  );
  const comissaoProfissional = pickFirstNumber(
    profissional?.comissao_percentual,
    profissional?.comissao
  );

  let comissaoPercentual = 0;
  let origemComissao: OrigemComissaoServico = "sem_regra";

  if (comissaoVinculo !== null) {
    comissaoPercentual = comissaoVinculo;
    origemComissao = "profissional_servico";
  } else if (comissaoServico !== null) {
    comissaoPercentual = comissaoServico;
    origemComissao = "servico_padrao";
  } else if (comissaoProfissional !== null) {
    comissaoPercentual = comissaoProfissional;
    origemComissao = "profissional_padrao";
  }

  const comissaoAssistentePercentual =
    pickFirstNumber(
      vinculo?.comissao_assistente_percentual,
      servico?.comissao_assistente_percentual
    ) ?? 0;

  const baseCalculo = pickFirstText(vinculo?.base_calculo, servico?.base_calculo) || "bruto";

  const descontaTaxaMaquininha =
    typeof vinculo?.desconta_taxa_maquininha === "boolean"
      ? vinculo.desconta_taxa_maquininha
      : Boolean(servico?.desconta_taxa_maquininha ?? false);

  return {
    valorUnitario,
    comissaoPercentual,
    comissaoAssistentePercentual,
    baseCalculo,
    descontaTaxaMaquininha,
    origemComissao,
  };
}
