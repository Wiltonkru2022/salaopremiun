import type { ComandaVenda, SalaoInfo } from "@/components/vendas/types";

export const VENDAS_PAGE_SIZE = 10;

export function escapeHtml(value: string | null | undefined) {
  return String(value || "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getFirstJoined<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

export function formatDocumentLabel(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length > 11 ? "CNPJ" : "CPF";
}

export function buildSalaoEndereco(salao?: SalaoInfo | null) {
  if (!salao) return "";
  const linha1 = [
    salao.endereco ? escapeHtml(salao.endereco) : null,
    salao.numero ? `nº ${escapeHtml(salao.numero)}` : null,
    salao.complemento ? escapeHtml(salao.complemento) : null,
  ]
    .filter(Boolean)
    .join(", ");
  const linha2 = [salao.bairro, salao.cidade, salao.estado]
    .map((item) => (item ? escapeHtml(item) : null))
    .filter(Boolean)
    .join(" - ");
  const linha3 = salao.cep ? `CEP ${escapeHtml(salao.cep)}` : "";
  return [linha1, linha2, linha3].filter(Boolean).join("<br />");
}

export function mergeComandaDetalhe(
  venda: ComandaVenda,
  detalheComanda: ComandaVenda | null | undefined
): ComandaVenda {
  if (!detalheComanda) return venda;

  return {
    ...venda,
    ...detalheComanda,
    clientes: detalheComanda.clientes ?? venda.clientes,
  };
}
