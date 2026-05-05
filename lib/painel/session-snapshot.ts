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
