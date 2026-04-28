type ComboComponentBase = {
  id: string;
  nome: string;
  ordem?: number | null;
  preco_base?: number | null;
  percentual_rateio?: number | null;
};

export type ComboComponentResolved = ComboComponentBase & {
  precoBase: number;
  percentualRateio: number;
};

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export function buildComboResumo(nomes: string[]) {
  const clean = nomes.map((item) => String(item || "").trim()).filter(Boolean);

  if (clean.length === 0) return "";
  if (clean.length <= 3) return clean.join(" + ");

  return `${clean.slice(0, 3).join(" + ")} +${clean.length - 3}`;
}

export function normalizeComboComponents<T extends ComboComponentBase>(
  items: T[]
): ComboComponentResolved[] {
  const ordered = [...items].sort((a, b) => {
    const ordemA = Number(a.ordem ?? 0);
    const ordemB = Number(b.ordem ?? 0);
    if (ordemA !== ordemB) return ordemA - ordemB;
    return String(a.nome || "").localeCompare(String(b.nome || ""));
  });

  const totalBase = ordered.reduce(
    (acc, item) => acc + Math.max(Number(item.preco_base ?? 0), 0),
    0
  );
  const totalPercentual = ordered.reduce(
    (acc, item) => acc + Math.max(Number(item.percentual_rateio ?? 0), 0),
    0
  );

  return ordered.map((item) => {
    const precoBase = Math.max(Number(item.preco_base ?? 0), 0);
    const percentualRateio =
      totalPercentual > 0
        ? Math.max(Number(item.percentual_rateio ?? 0), 0)
        : totalBase > 0
          ? Number(((precoBase / totalBase) * 100).toFixed(6))
          : Number((100 / Math.max(ordered.length, 1)).toFixed(6));

    return {
      ...item,
      precoBase,
      percentualRateio,
    };
  });
}

export function allocateComboUnitPrices(
  comboUnitPrice: number,
  items: ComboComponentResolved[]
) {
  if (items.length === 0) return [] as number[];

  let acumulado = 0;

  return items.map((item, index) => {
    if (index === items.length - 1) {
      return roundMoney(comboUnitPrice - acumulado);
    }

    const valor = roundMoney(comboUnitPrice * (item.percentualRateio / 100));
    acumulado = roundMoney(acumulado + valor);
    return valor;
  });
}

export function intersectLinkedProfessionals(
  componentIds: string[],
  vinculadosPorServico: Map<string, string[]>
) {
  if (componentIds.length === 0) return [] as string[];

  const listas = componentIds
    .map((id) => vinculadosPorServico.get(id) || [])
    .filter((lista) => lista.length > 0);

  if (listas.length === 0) return [] as string[];

  return listas.reduce<string[]>((acc, listaAtual, index) => {
    if (index === 0) return [...listaAtual];
    const permitidos = new Set(listaAtual);
    return acc.filter((id) => permitidos.has(id));
  }, []);
}
