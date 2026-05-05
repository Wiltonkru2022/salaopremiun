import type {
  Permissoes,
  PlanoRecursos,
} from "@/components/layout/navigation";

export const PAINEL_SESSION_STORAGE_KEY = "salaopremium:painel:session";

export type PainelPlanoLimites = {
  usuarios?: number | null;
  profissionais?: number | null;
  clientes?: number | null;
  servicos?: number | null;
  agendamentosMensais?: number | null;
};

export type PainelPlanoUso = {
  usuarios?: number;
  profissionais?: number;
  clientes?: number;
  servicos?: number;
  agendamentosMensais?: number;
};

export type PainelSessionSnapshot = {
  idSalao: string;
  idUsuario: string;
  userName: string;
  userEmail: string;
  nivel: string;
  permissoes: Permissoes;
  planoRecursos?: PlanoRecursos;
  salaoNome?: string;
  salaoResponsavel?: string;
  salaoLogoUrl?: string | null;
  planoCodigo?: string;
  planoNome?: string;
  planoLimites?: PainelPlanoLimites;
  planoUso?: PainelPlanoUso;
  assinaturaStatus?: string | null;
};

export function readPainelSessionSnapshot(): PainelSessionSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(PAINEL_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PainelSessionSnapshot;
  } catch {
    return null;
  }
}
