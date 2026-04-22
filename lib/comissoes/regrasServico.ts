import type { SupabaseClient } from "@supabase/supabase-js";

export type ServicoComissaoSource = {
  id?: string;
  nome?: string | null;
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
  nome?: string | null;
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
  | "sem_regra";

export type RegraComissaoServico = {
  valorUnitario: number;
  comissaoPercentual: number;
  comissaoAssistentePercentual: number;
  baseCalculo: string;
  descontaTaxaMaquininha: boolean;
  origemComissao: OrigemComissaoServico;
};

export type ComissaoAplicadaPreview = {
  comissao_percentual_aplicada: number;
  comissao_assistente_percentual_aplicada: number;
  base_calculo_aplicada: string;
  desconta_taxa_maquininha_aplicada: boolean;
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
  idSalao: string;
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
    .eq("id_salao", params.idSalao)
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
  const { servico, vinculo } = params;

  const valorUnitario =
    pickFirstNumber(vinculo?.preco_personalizado, servico?.preco_padrao, servico?.preco) ?? 0;

  const comissaoVinculo = pickFirstNumber(vinculo?.comissao_percentual);
  const comissaoServico = pickFirstNumber(
    servico?.comissao_percentual_padrao,
    servico?.comissao_percentual
  );
  let comissaoPercentual = 0;
  let origemComissao: OrigemComissaoServico = "sem_regra";

  // Origem operacional: o serviço define a regra padrão; o vínculo do
  // profissional só entra como exceção explícita. A comissão antiga do cadastro
  // do profissional não é herdada aqui para evitar três níveis invisíveis.
  if (comissaoVinculo !== null) {
    comissaoPercentual = comissaoVinculo;
    origemComissao = "profissional_servico";
  } else if (comissaoServico !== null) {
    comissaoPercentual = comissaoServico;
    origemComissao = "servico_padrao";
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

export function resolverRegraPadraoServico(
  servico?: ServicoComissaoSource | null
) {
  return resolverRegraComissaoServico({
    servico,
    profissional: null,
    vinculo: null,
  });
}

export function criarPreviewComissaoServico(
  servico?: ServicoComissaoSource | null
): ComissaoAplicadaPreview {
  const regra = resolverRegraPadraoServico(servico);

  return {
    comissao_percentual_aplicada: regra.comissaoPercentual,
    comissao_assistente_percentual_aplicada:
      regra.comissaoAssistentePercentual,
    base_calculo_aplicada: regra.baseCalculo,
    desconta_taxa_maquininha_aplicada: regra.descontaTaxaMaquininha,
  };
}

export function criarPreviewComissaoProduto(percentual?: number | null) {
  return {
    comissao_percentual_aplicada: pickFirstNumber(percentual) ?? 0,
    comissao_assistente_percentual_aplicada: 0,
    base_calculo_aplicada: "bruto",
    desconta_taxa_maquininha_aplicada: false,
  } satisfies ComissaoAplicadaPreview;
}

export function criarPreviewComissaoManual() {
  return {
    comissao_percentual_aplicada: 0,
    comissao_assistente_percentual_aplicada: 0,
    base_calculo_aplicada: "bruto",
    desconta_taxa_maquininha_aplicada: false,
  } satisfies ComissaoAplicadaPreview;
}

export function criarCamposAplicacaoComissao(
  regra: RegraComissaoServico
): ComissaoAplicadaPreview & {
  comissao_valor_aplicado: number;
  comissao_assistente_valor_aplicado: number;
} {
  return {
    comissao_percentual_aplicada: regra.comissaoPercentual,
    comissao_valor_aplicado: 0,
    comissao_assistente_percentual_aplicada:
      regra.comissaoAssistentePercentual,
    comissao_assistente_valor_aplicado: 0,
    base_calculo_aplicada: regra.baseCalculo,
    desconta_taxa_maquininha_aplicada: regra.descontaTaxaMaquininha,
  };
}
