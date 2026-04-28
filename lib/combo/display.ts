export type ComboDisplayMeta = {
  isComboItem: boolean;
  comboName: string | null;
  childName: string | null;
  displayTitle: string;
};

export type ComboGroupedTotal = {
  comboName: string;
  total: number;
  itemCount: number;
  childLabels: string[];
};

const COMBO_SEPARATOR = " â€¢ ";

export function parseComboDisplayMeta(
  descricao: string | null | undefined
): ComboDisplayMeta {
  const raw = String(descricao || "").trim();

  if (!raw) {
    return {
      isComboItem: false,
      comboName: null,
      childName: null,
      displayTitle: "-",
    };
  }

  const parts = raw
    .split(COMBO_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return {
      isComboItem: false,
      comboName: null,
      childName: null,
      displayTitle: raw,
    };
  }

  return {
    isComboItem: true,
    comboName: parts[0] || null,
    childName: parts.slice(1).join(COMBO_SEPARATOR) || null,
    displayTitle: parts.slice(1).join(COMBO_SEPARATOR) || parts[0] || raw,
  };
}

export function groupComboTotals<T>(
  items: T[],
  getDescricao: (item: T) => string | null | undefined,
  getValor: (item: T) => number | null | undefined
): ComboGroupedTotal[] {
  const map = new Map<string, ComboGroupedTotal>();

  for (const item of items) {
    const comboMeta = parseComboDisplayMeta(getDescricao(item));
    if (!comboMeta.isComboItem || !comboMeta.comboName) continue;

    const current = map.get(comboMeta.comboName) || {
      comboName: comboMeta.comboName,
      total: 0,
      itemCount: 0,
      childLabels: [],
    };

    current.total += Number(getValor(item) || 0);
    current.itemCount += 1;

    if (
      comboMeta.displayTitle &&
      !current.childLabels.includes(comboMeta.displayTitle)
    ) {
      current.childLabels.push(comboMeta.displayTitle);
    }

    map.set(comboMeta.comboName, current);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
