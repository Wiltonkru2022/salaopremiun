import { getResumoAssinatura } from "@/lib/assinatura-utils";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type PlanoRecursoCodigo =
  | "agenda"
  | "agendamentos_mensais"
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
    clientes: number | null;
    servicos: number | null;
    agendamentosMensais: number | null;
  };
  uso: {
    usuarios: number;
    profissionais: number;
    clientes: number;
    servicos: number;
    agendamentosMensais: number;
  };
  recursos: Record<string, boolean>;
  recursosBloqueados: string[];
};

export const PLANO_RECURSOS_PADRAO: PlanoRecursoCodigo[] = [
  "agenda",
  "agendamentos_mensais",
  "clientes",
  "profissionais",
  "usuarios",
  "servicos",
  "servicos_extras",
  "produtos",
  "estoque",
  "caixa",
  "comandas",
  "vendas",
  "comissoes_basicas",
  "comissoes_avancadas",
  "relatorios_basicos",
  "relatorios_avancados",
  "dashboard_avancado",
  "whatsapp",
  "campanhas",
  "app_profissional",
  "marketing",
  "recursos_beta",
  "suporte_prioritario",
];

export const PLANO_RECURSO_LABELS: Record<PlanoRecursoCodigo, string> = {
  agenda: "Agenda",
  agendamentos_mensais: "Agendamentos mensais",
  clientes: "Clientes",
  profissionais: "Profissionais",
  usuarios: "Usuarios do sistema",
  servicos: "Servicos",
  servicos_extras: "Servicos extras",
  produtos: "Produtos",
  estoque: "Estoque",
  caixa: "Caixa",
  comandas: "Comandas",
  vendas: "Vendas",
  comissoes_basicas: "Comissoes basicas",
  comissoes_avancadas: "Comissoes avancadas",
  relatorios_basicos: "Relatorios basicos",
  relatorios_avancados: "Relatorios avancados",
  dashboard_avancado: "Dashboard avancado",
  whatsapp: "WhatsApp",
  campanhas: "Campanhas",
  app_profissional: "App profissional",
  marketing: "Marketing",
  recursos_beta: "Recursos beta",
  suporte_prioritario: "Suporte prioritario",
};

export const PLANO_RECURSO_GROUPS: Record<PlanoRecursoCodigo, string> = {
  agenda: "Operacao",
  agendamentos_mensais: "Operacao",
  clientes: "Operacao",
  profissionais: "Operacao",
  usuarios: "Gestao",
  servicos: "Operacao",
  servicos_extras: "Operacao",
  produtos: "Produtos e estoque",
  estoque: "Produtos e estoque",
  caixa: "Financeiro",
  comandas: "Financeiro",
  vendas: "Financeiro",
  comissoes_basicas: "Comissoes",
  comissoes_avancadas: "Comissoes",
  relatorios_basicos: "Relatorios",
  relatorios_avancados: "Relatorios",
  dashboard_avancado: "Relatorios",
  whatsapp: "Comunicacao",
  campanhas: "Comunicacao",
  app_profissional: "Equipe",
  marketing: "Comunicacao",
  recursos_beta: "Premium",
  suporte_prioritario: "Premium",
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

type UsageLimitKey =
  | "usuarios"
  | "profissionais"
  | "clientes"
  | "servicos"
  | "agendamentosMensais";

const STATUS_RESTRITO = new Set(["vencida", "cancelada", "bloqueada", "suspensa"]);

function normalizePlano(plano?: string | null) {
  const normalized = String(plano || "teste_gratis")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");

  const codigo = normalized.startsWith("plano_")
    ? normalized.replace(/^plano_/, "")
    : normalized;

  if (!codigo || codigo === "trial" || codigo === "testegratis" || codigo === "gratis") {
    return "teste_gratis";
  }

  return codigo;
}

function isUnlimited(value?: number | null) {
  return value == null || value >= 999;
}

function normalizeLimit(value?: number | null) {
  return isUnlimited(value) ? null : Number(value ?? 0);
}

function getPlanoRecursoLimit(
  recursosRows: PlanoRecursoRow[],
  recursoCodigo: string
) {
  const row = recursosRows.find((item) => item.recurso_codigo === recursoCodigo);
  return normalizeLimit(row?.limite_numero ?? null);
}

export function getPlanoRecursoLabel(recurso: string) {
  return (
    (PLANO_RECURSO_LABELS as Record<string, string>)[recurso] ||
    recurso.replace(/_/g, " ")
  );
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
    clientesResult,
    servicosResult,
    agendamentosResult,
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
      supabaseAdmin
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .eq("id_salao", idSalao)
        .eq("ativo", "true"),
      supabaseAdmin
        .from("servicos")
        .select("id", { count: "exact", head: true })
        .eq("id_salao", idSalao)
        .eq("ativo", true),
      supabaseAdmin
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .eq("id_salao", idSalao)
        .gte(
          "data",
          new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString()
            .slice(0, 10)
        )
        .lte(
          "data",
          new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
            .toISOString()
            .slice(0, 10)
        ),
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

  PLANO_RECURSOS_PADRAO.forEach((codigo) => {
    if (!(codigo in recursos)) {
      recursos[codigo] = false;
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
  const recursosRowsNormalized = (recursosRows || []) as PlanoRecursoRow[];
  const limiteClientes = getPlanoRecursoLimit(recursosRowsNormalized, "clientes");
  const limiteServicos = getPlanoRecursoLimit(recursosRowsNormalized, "servicos");
  const limiteAgendamentosMensais = getPlanoRecursoLimit(
    recursosRowsNormalized,
    "agendamentos_mensais"
  );

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
      usuarios: normalizeLimit(limiteUsuarios),
      profissionais: normalizeLimit(limiteProfissionais),
      clientes: limiteClientes,
      servicos: limiteServicos,
      agendamentosMensais: limiteAgendamentosMensais,
    },
    uso: {
      usuarios: usuariosResult.count || 0,
      profissionais: profissionaisResult.count || 0,
      clientes: clientesResult.count || 0,
      servicos: servicosResult.count || 0,
      agendamentosMensais: agendamentosResult.count || 0,
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
      reason: `${getPlanoRecursoLabel(recurso)} nao esta liberado no plano atual.`,
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

export async function assertCanMutatePlanFeature(
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

  if (result.snapshot.modoRestrito) {
    throw new PlanAccessError(
      "Sua assinatura esta em modo restrito. Regularize o plano para realizar novas operacoes.",
      "SUBSCRIPTION_RESTRICTED"
    );
  }

  return result.snapshot;
}

export async function assertCanCreateWithinLimit(
  idSalao: string,
  tipo: UsageLimitKey
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

  if (snapshot.modoRestrito) {
    throw new PlanAccessError(
      "Sua assinatura esta em modo restrito. Regularize o plano para criar novos registros.",
      "SUBSCRIPTION_RESTRICTED"
    );
  }

  if (limite != null && uso >= limite) {
    throw new PlanAccessError(
      `Limite do plano atingido: ${uso} de ${limite} ${getPlanoRecursoLabel(
        tipo === "agendamentosMensais" ? "agendamentos_mensais" : tipo
      )}.`,
      "PLAN_LIMIT_REACHED"
    );
  }

  return snapshot;
}

export async function assertCanCreateAgendaInCurrentMonth(idSalao: string) {
  return assertCanCreateWithinLimit(idSalao, "agendamentosMensais");
}
