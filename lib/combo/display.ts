export type ComboDisplayMeta = {
  isComboItem: boolean;
  comboName: string | null;
  childName: string | null;
  displayTitle: string;
};

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

  const parts = raw.split(" • ").map((part) => part.trim()).filter(Boolean);

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
    childName: parts.slice(1).join(" • ") || null,
    displayTitle: parts.slice(1).join(" • ") || parts[0] || raw,
  };
}
