export type ClientBookingDraft = {
  version: 1;
  idSalao: string;
  profissionalId: string;
  servicoIds: string[];
  selectedDate: string;
  selectedTime: string;
  codigoCupom: string;
  step: "profissional" | "servico" | "horario" | "resumo";
  savedAt: number;
};

const DRAFT_TTL_MS = 30 * 60 * 1000;

function storageKey(idSalao: string) {
  return `sp_cliente_booking_draft:${idSalao}`;
}

export function readClientBookingDraft(idSalao: string): ClientBookingDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey(idSalao));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ClientBookingDraft>;
    if (
      parsed.version !== 1 ||
      parsed.idSalao !== idSalao ||
      !Array.isArray(parsed.servicoIds) ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > DRAFT_TTL_MS
    ) {
      window.sessionStorage.removeItem(storageKey(idSalao));
      return null;
    }

    return {
      version: 1,
      idSalao,
      profissionalId: typeof parsed.profissionalId === "string" ? parsed.profissionalId : "",
      servicoIds: parsed.servicoIds.filter(
        (value): value is string => typeof value === "string"
      ),
      selectedDate: typeof parsed.selectedDate === "string" ? parsed.selectedDate : "",
      selectedTime: typeof parsed.selectedTime === "string" ? parsed.selectedTime : "",
      codigoCupom: typeof parsed.codigoCupom === "string" ? parsed.codigoCupom : "",
      step:
        parsed.step === "servico" ||
        parsed.step === "horario" ||
        parsed.step === "resumo"
          ? parsed.step
          : "profissional",
      savedAt: parsed.savedAt,
    };
  } catch {
    window.sessionStorage.removeItem(storageKey(idSalao));
    return null;
  }
}

export function writeClientBookingDraft(
  draft: Omit<ClientBookingDraft, "version" | "savedAt">
) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    storageKey(draft.idSalao),
    JSON.stringify({ ...draft, version: 1, savedAt: Date.now() })
  );
}

export function clearClientBookingDraft(idSalao: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(storageKey(idSalao));
}
