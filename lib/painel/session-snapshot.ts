import type {
  Permissoes,
  PlanoRecursos,
} from "@/components/layout/navigation";

export const PAINEL_SESSION_STORAGE_KEY = "salaopremium:painel:session";

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
  planoNome?: string;
  assinaturaStatus?: string | null;
};
