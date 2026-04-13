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