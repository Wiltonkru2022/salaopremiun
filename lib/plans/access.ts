import { getResumoAssinatura } from "@/lib/assinatura-utils";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type PlanoRecursoCodigo =
  | "agenda"
  | "clientes"
  | "profissionais"
  | "usuarios"
  | "servicos"
  | "servicos_extras"
  | "produtos"
  | "estoque"
  | "caixa"
  | "comandas"
  | "vendas"
  | "comissoes_basicas"
  | "comissoes_avancadas"
  | "relatorios_basicos"
  | "relatorios_avancados"
  | "dashboard_avancado"
  | "whatsapp"
  | "campanhas"
  | "app_profissional"
  | "marketing"
  | "recursos_beta"
  | "suporte_prioritario";

export type PlanoAccessSnapshot = {
  idSalao: string;
  planoCodigo: string;
  planoNome: string;
  assinaturaStatus: string;
  salaoStatus: string;
  bloqueioTotal: boolean;
  modoRestrito: boolean;
  bloqueioMotivo: string | null;
  limites: {
    usuarios: number | null;
    profissionais: number | null;
  };
  uso: {
    usuarios: number;
    profissionais: number;
  };
  recursos: Record<string, boolean>;
  recursosBloqueados: string[];
};

export class PlanAccessError extends Error {
  status = 402;
  code: string;

  constructor(message: string, code = "PLAN_ACCESS_DENIED") {
    super(message);
    this.name = "PlanAccessError";
    this.code = code;
  }
}

type AssinaturaRow = {
  plano?: string | null;
  status?: string | null;
  vencimento_em?: string | null;
  trial_fim_em?: string | null;
  limite_usuarios?: number | null;
  limite_profissionais?: number | null;
};

type SalaoRow = {
  id: string;
  plano?: string | null;
  status?: string | null;
  limite_usuarios?: number | null;
  limite_profissionais?: number | null;
};

type PlanoRow = {
  id: string;
  codigo: string;
  nome: string;
  limite_usuarios?: number | null;
  limite_profissionais?: number | null;
};

type PlanoRecursoRow = {
  recurso_codigo: string;
  habilitado: boolean | null;
  limite_numero?: number | null;
};

type ExtraRow = {
  recurso_codigo: string;
  habilitado: boolean | null;
};

const STATUS_RESTRITO = new Set(["vencida", "cancelada", "bloqueada", "suspensa"]);

function normalizePlano(plano?: string | null) {
  return String(plano || "teste_gratis")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function isUnlimited(value?: number | null) {
  return value == null || value >= 999;
}

export async function getPlanoAccessSnapshot(
  idSalao: string
): Promise<PlanoAccessSnapshot> {
  const supabaseAdmin = getSupabaseAdmin();

  const [{ data: salao }, { data: assinatura }] = await Promise.all([
    supabaseAdmin
      .from("saloes")
      .select("id, plano, status, limite_usuarios, limite_profissionais")
      .eq("id", idSalao)
      .maybeSingle(),
    supabaseAdmin
      .from("assinaturas")
      .select(
        "plano, status, vencimento_em, trial_fim_em, limite_usuarios, limite_profissionais"
      )
      .eq("id_salao", idSalao)
      .maybeSingle(),
  ]);

  const salaoRow = salao as SalaoRow | null;
  const assinaturaRow = assinatura as AssinaturaRow | null;
  const planoCodigo = normalizePlano(assinaturaRow?.plano || salaoRow?.plano);

  const { data: plano } = await supabaseAdmin
    .from("planos_saas")
    .select("id, codigo, nome, limite_usuarios, limite_profissionais")
    .eq("codigo", planoCodigo)
    .maybeSingle();

  const planoRow = plano as PlanoRow | null;
  const idPlano = planoRow?.id || null;

  const [
    { data: recursosRows },
    { data: extrasRows },
    usuariosResult,
    profissionaisResult,
  ] =
    await Promise.all([
      idPlano
        ? supabaseAdmin
            .from("planos_recursos")
            .select("recurso_codigo, habilitado, limite_numero")
            .eq("id_plano", idPlano)
        : Promise.resolve({ data: [] }),
      supabaseAdmin
        .from("saloes_recursos_extras")
        .select("recurso_codigo, habilitado")
        .eq("id_salao", idSalao)
        .eq("habilitado", true)
        .or(`expira_em.is.null,expira_em.gt.${new Date().toISOString()}`),
      supabaseAdmin
        .from("usuarios")
        .select("id", { count: "exact", head: true })
        .eq("id_salao", idSalao)
        .eq("status", "ativo"),
      supabaseAdmin
        .from("profissionais")
        .select("id", { count: "exact", head: true })
        .eq("id_salao", idSalao)
        .eq("ativo", true),
    ]);

  const recursos: Record<string, boolean> = {};

  ((recursosRows || []) as PlanoRecursoRow[]).forEach((item) => {
    recursos[item.recurso_codigo] = Boolean(item.habilitado);
  });

  ((extrasRows || []) as ExtraRow[]).forEach((item) => {
    if (item.habilitado) {
      recursos[item.recurso_codigo] = true;
    }
  });

  const assinaturaStatus = String(assinaturaRow?.status || salaoRow?.status || "")
    .trim()
    .toLowerCase();
  const salaoStatus = String(salaoRow?.status || "").trim().toLowerCase();
  const resumo = getResumoAssinatura({
    status: assinaturaRow?.status || salaoRow?.status,
    vencimentoEm: assinaturaRow?.vencimento_em || null,
    trialFimEm: assinaturaRow?.trial_fim_em || null,
  });

  const bloqueadoManual =
    STATUS_RESTRITO.has(assinaturaStatus) || STATUS_RESTRITO.has(salaoStatus);
  const bloqueioTotal = bloqueadoManual || resumo.bloqueioTotal;
  const modoRestrito = resumo.vencida || bloqueadoManual;

  const limiteUsuarios =
    assinaturaRow?.limite_usuarios ??
    salaoRow?.limite_usuarios ??
    planoRow?.limite_usuarios ??
    null;
  const limiteProfissionais =
    assinaturaRow?.limite_profissionais ??
    salaoRow?.limite_profissionais ??
    planoRow?.limite_profissionais ??
    null;

  return {
    idSalao,
    planoCodigo,
    planoNome: planoRow?.nome || planoCodigo,
    assinaturaStatus,
    salaoStatus,
    bloqueioTotal,
    modoRestrito,
    bloqueioMotivo: bloqueioTotal
      ? "Assinatura ou salao bloqueado para novas operacoes."
      : null,
    limites: {
      usuarios: isUnlimited(limiteUsuarios) ? null : limiteUsuarios,
      profissionais: isUnlimited(limiteProfissionais)
        ? null
        : limiteProfissionais,
    },
    uso: {
      usuarios: usuariosResult.count || 0,
      profissionais: profissionaisResult.count || 0,
    },
    recursos,
    recursosBloqueados: Object.entries(recursos)
      .filter(([, habilitado]) => !habilitado)
      .map(([codigo]) => codigo),
  };
}

export async function canUsePlanFeature(
  idSalao: string,
  recurso: PlanoRecursoCodigo
) {
  const snapshot = await getPlanoAccessSnapshot(idSalao);

  if (snapshot.bloqueioTotal) {
    return {
      allowed: false,
      reason: snapshot.bloqueioMotivo || "Assinatura bloqueada.",
      snapshot,
    };
  }

  if (!snapshot.recursos[recurso]) {
    return {
      allowed: false,
      reason: `Recurso ${recurso} nao liberado no plano atual.`,
      snapshot,
    };
  }

  return { allowed: true, reason: null, snapshot };
}

export async function assertCanUsePlanFeature(
  idSalao: string,
  recurso: PlanoRecursoCodigo
) {
  const result = await canUsePlanFeature(idSalao, recurso);
  if (!result.allowed) {
    throw new PlanAccessError(
      result.reason || "Recurso indisponivel no plano atual.",
      "FEATURE_BLOCKED"
    );
  }
  return result.snapshot;
}

export async function assertCanCreateWithinLimit(
  idSalao: string,
  tipo: "usuarios" | "profissionais"
) {
  const snapshot = await getPlanoAccessSnapshot(idSalao);
  const limite = snapshot.limites[tipo];
  const uso = snapshot.uso[tipo];

  if (snapshot.bloqueioTotal) {
    throw new PlanAccessError(
      snapshot.bloqueioMotivo || "Assinatura bloqueada.",
      "SUBSCRIPTION_BLOCKED"
    );
  }

  if (limite != null && uso >= limite) {
    throw new PlanAccessError(
      `Limite do plano atingido: ${uso} de ${limite} ${tipo}.`,
      "PLAN_LIMIT_REACHED"
    );
  }

  return snapshot;
}
