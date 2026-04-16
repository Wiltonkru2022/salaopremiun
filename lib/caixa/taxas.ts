export type CaixaTaxasConfig = {
  taxa_maquininha_credito?: number | null;
  taxa_maquininha_debito?: number | null;
  taxa_maquininha_pix?: number | null;
  taxa_maquininha_transferencia?: number | null;
  taxa_maquininha_boleto?: number | null;
  taxa_maquininha_outro?: number | null;
  taxa_credito_1x?: number | null;
  taxa_credito_2x?: number | null;
  taxa_credito_3x?: number | null;
  taxa_credito_4x?: number | null;
  taxa_credito_5x?: number | null;
  taxa_credito_6x?: number | null;
  taxa_credito_7x?: number | null;
  taxa_credito_8x?: number | null;
  taxa_credito_9x?: number | null;
  taxa_credito_10x?: number | null;
  taxa_credito_11x?: number | null;
  taxa_credito_12x?: number | null;
  repassa_taxa_cliente?: boolean | null;
};

export function obterTaxaConfigurada(
  formaPagamento: string,
  parcelas: number,
  config: CaixaTaxasConfig | null
) {
  if (!config) return 0;

  if (formaPagamento === "credito") {
    if (parcelas <= 1) {
      return Number(config.taxa_credito_1x ?? config.taxa_maquininha_credito ?? 0);
    }
    if (parcelas === 2) return Number(config.taxa_credito_2x ?? 0);
    if (parcelas === 3) return Number(config.taxa_credito_3x ?? 0);
    if (parcelas === 4) return Number(config.taxa_credito_4x ?? 0);
    if (parcelas === 5) return Number(config.taxa_credito_5x ?? 0);
    if (parcelas === 6) return Number(config.taxa_credito_6x ?? 0);
    if (parcelas === 7) return Number(config.taxa_credito_7x ?? 0);
    if (parcelas === 8) return Number(config.taxa_credito_8x ?? 0);
    if (parcelas === 9) return Number(config.taxa_credito_9x ?? 0);
    if (parcelas === 10) return Number(config.taxa_credito_10x ?? 0);
    if (parcelas === 11) return Number(config.taxa_credito_11x ?? 0);
    if (parcelas >= 12) return Number(config.taxa_credito_12x ?? 0);
  }

  if (formaPagamento === "debito") {
    return Number(config.taxa_maquininha_debito ?? 0);
  }

  if (formaPagamento === "pix") {
    return Number(config.taxa_maquininha_pix ?? 0);
  }

  if (formaPagamento === "transferencia") {
    return Number(config.taxa_maquininha_transferencia ?? 0);
  }

  if (formaPagamento === "boleto") {
    return Number(config.taxa_maquininha_boleto ?? 0);
  }

  if (formaPagamento === "outro") {
    return Number(config.taxa_maquininha_outro ?? 0);
  }

  return 0;
}
