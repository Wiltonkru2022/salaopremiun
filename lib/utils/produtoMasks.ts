export function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

export function maskMoneyInput(value: string) {
  const digits = onlyDigits(value);

  if (!digits) return "";

  const numberValue = Number(digits) / 100;

  return numberValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseMoneyToNumber(value: string) {
  if (!value) return 0;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function maskPhone(value: string) {
  const v = onlyDigits(value).slice(0, 11);

  if (v.length <= 2) return v;
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7, 11)}`;
}

export function calculateMargin(precoVenda: number, custoReal: number) {
  if (!precoVenda || precoVenda <= 0) return 0;
  if (!custoReal || custoReal <= 0) return 0;
  return Number((((precoVenda - custoReal) / custoReal) * 100).toFixed(2));
}

export function calculateCostPerDose(custoReal: number, quantidadeEmbalagem: number, dosePadrao: number) {
  if (!custoReal || !quantidadeEmbalagem || !dosePadrao) return 0;
  if (quantidadeEmbalagem <= 0 || dosePadrao <= 0) return 0;

  const custoUnitario = custoReal / quantidadeEmbalagem;
  return Number((custoUnitario * dosePadrao).toFixed(4));
}