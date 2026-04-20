import { Profissional, Servico } from "@/types/agenda";

type ServicoSyncPayload = {
  id: string;
  nome: string;
  preco_padrao: number | null;
  preco: number | null;
  custo_produto: number | null;
  comissao_percentual: number | null;
  comissao_percentual_padrao: number | null;
  comissao_assistente_percentual: number | null;
  base_calculo: string | null;
  desconta_taxa_maquininha: boolean | null;
} | null;

type ProfissionalSyncPayload = {
  id: string;
  comissao_percentual: number | null;
} | null;

export function montarPayloadSincronizacao(params: {
  servicos: Servico[];
  profissionais: Profissional[];
  idServico: string;
  idProfissional: string;
}): {
  servico: ServicoSyncPayload;
  profissional: ProfissionalSyncPayload;
} {
  const servicoSelecionado = params.servicos.find((s) => s.id === params.idServico);
  const profissionalSelecionado = params.profissionais.find(
    (p) => p.id === params.idProfissional
  );

  return {
    servico: servicoSelecionado
      ? {
          id: servicoSelecionado.id,
          nome: servicoSelecionado.nome,
          preco_padrao:
            (servicoSelecionado as Servico & { preco_padrao?: number | null }).preco_padrao ?? null,
          preco:
            (servicoSelecionado as Servico & { preco?: number | null }).preco ?? null,
          custo_produto:
            (servicoSelecionado as Servico & { custo_produto?: number | null }).custo_produto ?? null,
          comissao_percentual:
            (servicoSelecionado as Servico & { comissao_percentual?: number | null }).comissao_percentual ?? null,
          comissao_percentual_padrao:
            (servicoSelecionado as Servico & { comissao_percentual_padrao?: number | null })
              .comissao_percentual_padrao ?? null,
          comissao_assistente_percentual:
            (servicoSelecionado as Servico & { comissao_assistente_percentual?: number | null })
              .comissao_assistente_percentual ?? null,
          base_calculo:
            (servicoSelecionado as Servico & { base_calculo?: string | null }).base_calculo ?? null,
          desconta_taxa_maquininha:
            (servicoSelecionado as Servico & { desconta_taxa_maquininha?: boolean | null })
              .desconta_taxa_maquininha ?? null,
        }
      : null,

    profissional: profissionalSelecionado
      ? {
          id: profissionalSelecionado.id,
          comissao_percentual:
            (profissionalSelecionado as Profissional & { comissao_percentual?: number | null })
              .comissao_percentual ?? null,
        }
      : null,
  };
}
