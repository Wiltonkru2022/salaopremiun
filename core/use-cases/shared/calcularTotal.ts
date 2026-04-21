type ItemCalculavel = {
  quantidade?: number | string | null;
  valor?: number | string | null;
  preco?: number | string | null;
  valor_unitario?: number | string | null;
  valor_total?: number | string | null;
  total?: number | string | null;
  desconto?: number | string | null;
  acrescimo?: number | string | null;
};

export function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calcularTotalItens<T extends ItemCalculavel>(itens: readonly T[] = []) {
  return itens.reduce((acc, item) => {
    const quantidade = Math.max(toNumber(item.quantidade, 1), 0);
    const valorUnitario = toNumber(
      item.valor_total ?? item.total ?? item.valor_unitario ?? item.valor ?? item.preco,
      0
    );
    return acc + valorUnitario * quantidade;
  }, 0);
}

export function aplicarAjustesFinanceiros(params: {
  subtotal: number;
  desconto?: number | string | null;
  acrescimo?: number | string | null;
}) {
  const subtotal = toNumber(params.subtotal, 0);
  const desconto = toNumber(params.desconto, 0);
  const acrescimo = toNumber(params.acrescimo, 0);
  return Math.max(subtotal - desconto + acrescimo, 0);
}
