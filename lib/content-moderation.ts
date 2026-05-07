const BLOCKED_COMMENT_TERMS = [
  "arrombado",
  "babaca",
  "bosta",
  "caralho",
  "desgracado",
  "desgraçado",
  "fdp",
  "filho da puta",
  "merda",
  "porra",
  "puta",
  "puto",
  "vagabunda",
  "vagabundo",
];

function normalizeModerationText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasBlockedReviewLanguage(value: string) {
  const normalized = normalizeModerationText(value);
  if (!normalized) return false;

  return BLOCKED_COMMENT_TERMS.some((term) => {
    const normalizedTerm = normalizeModerationText(term);
    return new RegExp(`(^|\\s)${normalizedTerm}(\\s|$)`).test(normalized);
  });
}
