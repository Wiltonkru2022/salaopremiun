import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  PLANOS_CATALOGO,
  type PlanoCatalogo,
  type PlanoCodigo,
} from "@/lib/plans/catalog";
import { getPlanoRecursoLabel, PLANO_RECURSOS_PADRAO } from "@/lib/plans/access";

type PlanoSaasRow = {
  id: string;
  codigo?: string | null;
  nome?: string | null;
  subtitulo?: string | null;
  descricao?: string | null;
  valor_mensal?: number | string | null;
  preco_anual?: number | string | null;
  limite_usuarios?: number | null;
  limite_profissionais?: number | null;
  trial_dias?: number | null;
  ideal_para?: string | null;
  cta?: string | null;
  destaque?: boolean | null;
  ativo?: boolean | null;
  ordem?: number | null;
  metadata?: Record<string, unknown> | null;
};

type PlanoRecursoRow = {
  id_plano?: string | null;
  recurso_codigo?: string | null;
  habilitado?: boolean | null;
  limite_numero?: number | null;
  observacao?: string | null;
};

export type PlanoCatalogoPublico = PlanoCatalogo & {
  id?: string;
  ativo?: boolean;
  trialDias?: number;
  precoAnual?: number | null;
  cta?: string | null;
  recursosDetalhados: Array<{
    codigo: string;
    label: string;
    habilitado: boolean;
    limiteNumero: number | null;
    observacao: string | null;
  }>;
};

const PLANO_FALLBACK_FOCO: Record<PlanoCodigo, string> = {
  teste_gratis: "Teste completo",
  basico: "Operação pequena",
  pro: "Equipe em crescimento",
  premium: "Tudo liberado",
};

function normalizePlanoCodigo(value?: string | null): PlanoCodigo | null {
  const codigo = String(value || "").trim().toLowerCase();
  if (codigo === "trial") return "teste_gratis";
  if (codigo in PLANOS_CATALOGO) return codigo as PlanoCodigo;
  return null;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function limitFromResource(
  recursos: PlanoRecursoRow[],
  codigo: string,
  fallback: number | null
) {
  const current = recursos.find((item) => item.recurso_codigo === codigo);
  if (!current || current.limite_numero == null) return fallback;
  return current.limite_numero >= 999 ? null : current.limite_numero;
}

function mapPlanoFromDb(
  row: PlanoSaasRow,
  recursos: PlanoRecursoRow[]
): PlanoCatalogoPublico | null {
  const codigo = normalizePlanoCodigo(row.codigo);
  if (!codigo) return null;

  const fallback = PLANOS_CATALOGO[codigo];
  const recursosDetalhados = PLANO_RECURSOS_PADRAO.map((recursoCodigo) => {
    const current = recursos.find(
      (item) => item.recurso_codigo === recursoCodigo
    );

    return {
      codigo: recursoCodigo,
      label: getPlanoRecursoLabel(recursoCodigo),
      habilitado: current?.habilitado === true,
      limiteNumero: current?.limite_numero ?? null,
      observacao: current?.observacao || null,
    };
  });

  const recursosLiberados = recursosDetalhados
    .filter((item) => item.habilitado)
    .map((item) => item.label);
  const recursosBloqueados = recursosDetalhados
    .filter((item) => !item.habilitado)
    .map((item) => item.label);

  const metadata = row.metadata || {};
  const foco =
    typeof metadata.foco === "string" && metadata.foco.trim()
      ? metadata.foco.trim()
      : PLANO_FALLBACK_FOCO[codigo];

  return {
    ...fallback,
    id: row.id,
    codigo,
    nome: row.nome || fallback.nome,
    subtitulo: row.subtitulo || fallback.subtitulo,
    descricao: row.descricao || fallback.descricao,
    foco,
    idealPara: row.ideal_para || fallback.idealPara,
    valorMensal: toNumber(row.valor_mensal, fallback.valorMensal),
    precoAnual:
      row.preco_anual == null ? null : toNumber(row.preco_anual, 0),
    ordem: row.ordem ?? fallback.ordem,
    destaque: row.destaque ?? fallback.destaque,
    ativo: row.ativo !== false,
    trialDias: row.trial_dias ?? (codigo === "teste_gratis" ? 15 : 0),
    cta: row.cta || null,
    recursosLiberados:
      recursosLiberados.length > 0 ? recursosLiberados : fallback.recursosLiberados,
    recursosBloqueados:
      recursosDetalhados.length > 0 ? recursosBloqueados : fallback.recursosBloqueados,
    recursosDetalhados,
    limites: {
      usuarios:
        row.limite_usuarios == null || row.limite_usuarios >= 999
          ? null
          : row.limite_usuarios,
      profissionais:
        row.limite_profissionais == null || row.limite_profissionais >= 999
          ? null
          : row.limite_profissionais,
      clientes: limitFromResource(recursos, "clientes", fallback.limites.clientes),
      servicos: limitFromResource(recursos, "servicos", fallback.limites.servicos),
      agendamentosMensais: limitFromResource(
        recursos,
        "agendamentos_mensais",
        fallback.limites.agendamentosMensais
      ),
    },
  };
}

function getFallbackPlanos(): PlanoCatalogoPublico[] {
  return Object.values(PLANOS_CATALOGO)
    .map((plano) => ({
      ...plano,
      ativo: true,
      trialDias: plano.codigo === "teste_gratis" ? 15 : 0,
      precoAnual: plano.valorMensal * 12,
      cta: null,
      recursosDetalhados: PLANO_RECURSOS_PADRAO.map((codigo) => ({
        codigo,
        label: getPlanoRecursoLabel(codigo),
        habilitado: plano.recursosLiberados.includes(getPlanoRecursoLabel(codigo)),
        limiteNumero: null,
        observacao: null,
      })),
    }))
    .sort((a, b) => a.ordem - b.ordem);
}

export async function getPlanosSaasCatalogo() {
  try {
    const supabase = getSupabaseAdmin();
    const [{ data: planos, error: planosError }, { data: recursos, error: recursosError }] =
      await Promise.all([
        supabase
          .from("planos_saas")
          .select(
            "id, codigo, nome, subtitulo, descricao, valor_mensal, preco_anual, limite_usuarios, limite_profissionais, trial_dias, ideal_para, cta, destaque, ativo, ordem, metadata"
          )
          .order("ordem", { ascending: true }),
        supabase
          .from("planos_recursos")
          .select("id_plano, recurso_codigo, habilitado, limite_numero, observacao"),
      ]);

    if (planosError || recursosError) {
      throw new Error(planosError?.message || recursosError?.message);
    }

    const recursosRows = (recursos || []) as PlanoRecursoRow[];
    const mapped = ((planos || []) as PlanoSaasRow[])
      .map((plano) =>
        mapPlanoFromDb(
          plano,
          recursosRows.filter((recurso) => recurso.id_plano === plano.id)
        )
      )
      .filter(Boolean) as PlanoCatalogoPublico[];

    return mapped.length > 0 ? mapped.sort((a, b) => a.ordem - b.ordem) : getFallbackPlanos();
  } catch (error) {
    console.warn("Falha ao carregar catálogo de planos do banco:", error);
    return getFallbackPlanos();
  }
}

export async function getPlanoSaasCatalogo(codigo?: string | null) {
  const normalized = normalizePlanoCodigo(codigo) || "teste_gratis";
  const planos = await getPlanosSaasCatalogo();
  return (
    planos.find((plano) => plano.codigo === normalized) ||
    planos.find((plano) => plano.codigo === "teste_gratis") ||
    getFallbackPlanos()[0]
  );
}

export async function getPlanosSaasCobraveisOrdenados() {
  const planos = await getPlanosSaasCatalogo();
  return planos.filter((plano) => plano.codigo !== "teste_gratis" && plano.ativo !== false);
}

