export type ProfissionalSession = {
  idUsuario: string;
  idProfissional: string;
  idSalao: string;
  nome: string;
  cpf: string;
  tipo: "profissional";
};

const STORAGE_KEY = "salaopremium_profissional_session";

export function saveProfissionalSession(session: ProfissionalSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getProfissionalSession(): ProfissionalSession | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ProfissionalSession;
  } catch {
    return null;
  }
}

export function clearProfissionalSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}