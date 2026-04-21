export function formatarMoedaBR(value?: number | string | null) {
  const parsed = Number(value ?? 0);
  const amount = Number.isFinite(parsed) ? parsed : 0;

  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatarPercentualBR(value?: number | string | null) {
  const parsed = Number(value ?? 0);
  const percent = Number.isFinite(parsed) ? parsed : 0;

  return `${percent.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

export function formatarNumeroBR(value?: number | string | null) {
  const parsed = Number(value ?? 0);
  const number = Number.isFinite(parsed) ? parsed : 0;
  return number.toLocaleString("pt-BR");
}
