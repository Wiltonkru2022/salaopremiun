import { getResumoAssinatura } from "@/lib/assinatura-utils";

export type ProxyAssinaturaRow = {
  status: string | null;
  vencimento_em: string | null;
  trial_fim_em: string | null;
};

export function getProxyResumoAssinatura(assinatura: ProxyAssinaturaRow) {
  return getResumoAssinatura({
    status: assinatura.status,
    vencimentoEm: assinatura.vencimento_em,
    trialFimEm: assinatura.trial_fim_em,
  });
}
