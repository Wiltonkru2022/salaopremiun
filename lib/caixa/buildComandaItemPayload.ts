import type { CatalogoServico, ProfissionalResumo } from "@/components/caixa/types";
import type { ModalItemState } from "@/components/caixa/page-types";
import { buscarVinculoProfissionalServico, resolverRegraComissaoServico } from "@/lib/comissoes/regrasServico";
import { createClient } from "@/lib/supabase/client";

type CaixaSupabaseClient = ReturnType<typeof createClient>;

type Params = {
  supabase: CaixaSupabaseClient;
  idSalao: string;
  idComanda: string;
  itemModal: ModalItemState;
  servicosCatalogo: CatalogoServico[];
  profissionaisCatalogo: ProfissionalResumo[];
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

export async function buildComandaItemPayload({
  supabase,
  idSalao,
  idComanda,
  itemModal,
  servicosCatalogo,
  profissionaisCatalogo,
  quantidade,
  valorUnitario,
  valorTotal,
}: Params) {
  let payloadBase: Record<string, unknown> = {
    id_salao: idSalao,
    id_comanda: idComanda,
    tipo_item: itemModal.tipoItem,
    descricao: itemModal.descricao.trim(),
    quantidade,
    valor_unitario: valorUnitario,
    valor_total: valorTotal,
    custo_total: 0,
    id_profissional: itemModal.idProfissional || null,
    id_assistente: itemModal.idAssistente || null,
    origem: "caixa_manual",
    ativo: true,
  };

  if (itemModal.tipoItem !== "servico") {
    return {
      ...payloadBase,
      comissao_percentual_aplicada: 0,
      comissao_valor_aplicado: 0,
      comissao_assistente_percentual_aplicada: 0,
      comissao_assistente_valor_aplicado: 0,
      base_calculo_aplicada: "bruto",
      desconta_taxa_maquininha_aplicada: false,
    };
  }

  const servico = servicosCatalogo.find((item) => item.id === itemModal.catalogoId);
  const profissional = profissionaisCatalogo.find(
    (item) => item.id === itemModal.idProfissional
  );
  const vinculo =
    servico?.id && itemModal.idProfissional
      ? await buscarVinculoProfissionalServico({
          supabase,
          idProfissional: itemModal.idProfissional,
          idServico: servico.id,
        })
      : null;
  const regraServico = resolverRegraComissaoServico({
    servico,
    profissional,
    vinculo,
  });

  payloadBase = {
    ...payloadBase,
    id_servico: servico?.id || null,
    comissao_percentual_aplicada: regraServico.comissaoPercentual,
    comissao_valor_aplicado: 0,
    comissao_assistente_percentual_aplicada: regraServico.comissaoAssistentePercentual,
    comissao_assistente_valor_aplicado: 0,
    base_calculo_aplicada: regraServico.baseCalculo,
    desconta_taxa_maquininha_aplicada: regraServico.descontaTaxaMaquininha,
  };

  return payloadBase;
}
