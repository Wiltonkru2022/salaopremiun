import { Coffee, Package, Receipt, Scissors } from "lucide-react";
import {
  AgendamentoFila,
  ConfigCaixaSalao,
  CatalogoExtra,
  CatalogoProduto,
  CatalogoServico,
  ProfissionalResumo,
} from "./types";

export function parseMoney(value: string) {
  if (!value) return 0;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function moneyMask(value: string) {
  const digits = value.replace(/\D/g, "");
  const number = Number(digits || 0) / 100;

  return number.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function getJoinedName(value: any, fallback = "-") {
  const first = toArray(value)[0];
  return first?.nome || fallback;
}

export function formatCurrency(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

export function tipoItemIcon(tipo: string) {
  if (tipo === "servico") return <Scissors size={14} />;
  if (tipo === "produto") return <Package size={14} />;
  if (tipo === "extra") return <Coffee size={14} />;
  return <Receipt size={14} />;
}

export function getServicoPrice(servico?: CatalogoServico | null) {
  return Number(servico?.preco_padrao ?? servico?.preco ?? 0);
}

export function getProdutoPrice(produto?: CatalogoProduto | null) {
  return Number(produto?.preco_venda ?? produto?.preco ?? produto?.valor ?? 0);
}

export function getExtraPrice(extra?: CatalogoExtra | null) {
  return Number(
    extra?.preco_padrao ??
    extra?.preco_venda ??
    extra?.valor_padrao ??
    extra?.valor ??
    extra?.preco ??
    0
  );
}

export function getServicoComissao(
  servico?: CatalogoServico | null,
  profissional?: ProfissionalResumo | null
) {
  const comissaoServico = Number(
    servico?.comissao_percentual_padrao ?? servico?.comissao_percentual ?? 0
  );

  if (comissaoServico > 0) return comissaoServico;

  return Number(profissional?.comissao_percentual ?? profissional?.comissao ?? 0);
}

export function getServicoComissaoAssistente(servico?: CatalogoServico | null) {
  return Number(servico?.comissao_assistente_percentual ?? 0);
}

export function getServicoBaseCalculo(servico?: CatalogoServico | null) {
  return servico?.base_calculo || "bruto";
}

export function getServicoDescontaTaxa(servico?: CatalogoServico | null) {
  return Boolean(servico?.desconta_taxa_maquininha ?? false);
}

export function agendamentosFiltradosBase(
  lista: AgendamentoFila[],
  term: string
) {
  return lista.filter((item) => {
    const cliente = getJoinedName(item.clientes, "").toLowerCase();
    const servico = getJoinedName(item.servicos, "").toLowerCase();
    return cliente.includes(term) || servico.includes(term);
  });
}

export function obterTaxaConfigurada(
  formaPagamento: string,
  parcelas: number,
  config: ConfigCaixaSalao | null
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
