import {
  criarContextoCaixa,
  processarAcaoCaixa,
} from "@/lib/caixa/processar/dispatcher";
import type {
  AcaoCaixa,
  CaixaProcessarBody,
  CaixaProcessarContext,
} from "@/lib/caixa/processar/types";

export function createCaixaService() {
  return {
    criarContexto: (params: { idSalao: string; acao: AcaoCaixa }) =>
      criarContextoCaixa(params),

    processarAcao: (params: {
      ctx: CaixaProcessarContext;
      body: CaixaProcessarBody;
      acao: AcaoCaixa;
    }) => processarAcaoCaixa(params),
  };
}

export type CaixaService = ReturnType<typeof createCaixaService>;
