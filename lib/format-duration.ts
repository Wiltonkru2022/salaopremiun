export function formatDurationLabel(minutes?: number | string | null) {
  const total = Math.max(0, Math.round(Number(minutes || 0)));
  const safeTotal = total || 60;

  if (safeTotal < 60) {
    return `${safeTotal} min`;
  }

  const hours = Math.floor(safeTotal / 60);
  const remainingMinutes = safeTotal % 60;

  if (!remainingMinutes) {
    return hours === 1 ? "1 hora" : `${hours} horas`;
  }

  return `${hours}h${String(remainingMinutes).padStart(2, "0")} min`;
}
