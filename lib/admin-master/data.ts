import { syncAdminMasterAlerts } from "@/lib/admin-master/alerts-sync";
import {
  getAdminMasterOperationalSnapshot,
  type AdminMasterOperationalSnapshot,
} from "@/lib/admin-master/operability";
import { getPlanoAccessSnapshot } from "@/lib/plans/access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  extractWebhookSourceId,
  formatWebhookDate,
  formatWebhookDiagnosticDetail,
  syncAdminMasterWebhookEvents,
} from "@/lib/admin-master/webhooks-sync";
import { getRenovacaoAutomaticaInfo } from "@/lib/assinaturas/renovacao-automatica";
import { listAdminTickets } from "@/lib/support/tickets";

export type AdminKpi = {
  label: string;
  value: string;
  hint: string;
  tone?: "dark" | "green" | "amber" | "red" | "blue";
};

export type AdminSectionDiagnostic = {
  label: string;
  value: string;
  detail: string;
  tone?: AdminKpi["tone"];
  href?: string;
};

export type AdminTableRow = Record<string, string | number | boolean | null>;

export type AdminSectionData = {
  title: string;
  description: string;
  kpis: AdminKpi[];
  diagnostics?: AdminSectionDiagnostic[];
  rows: AdminTableRow[];
  columns: string[];
  actions: string[];
};

export type AdminMasterAuditEntry = {
  id: string;
  acao: string;
  entidade: string;
  descricao: string;
  criadoEm: string;
};

export type AdminMasterShellData = {
  alertasCriticos: number;
  ticketsAbertos: number;
  auditoriaRecente: AdminMasterAuditEntry[];
};

export type AdminMasterDashboardData = {
  kpis: AdminKpi[];
  planos: AdminTableRow[];
  recentes: AdminTableRow[];
  cancelados: number;
  operational: AdminMasterOperationalSnapshot;
  digitalizacao: AdminTableRow[];
};

type CountResult = {
  count: number | null;
  error: unknown;
};

function currency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dateValue(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function dateTimeValue(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function relativeTimeValue(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(date.getTime())) return "-";
  if (diffMs < 60_000) return "agora";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `ha ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `ha ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `ha ${days} d`;

  const months = Math.floor(days / 30);
  return `ha ${months} mes`;
}

function getPayloadText(
  payload: Record<string, unknown> | null | undefined,
  keys: string[]
) {
  if (!payload || typeof payload !== "object") return "";

  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return "";
}

function getAlertDiagnostic(
  descricao?: string | null,
  payload?: Record<string, unknown> | null
) {
  const detail =
    getPayloadText(payload, [
      "latestMessage",
      "message",
      "erro",
      "error",
      "erro_texto",
      "response",
      "status",
    ]) ||
    descricao ||
    "-";

  if (detail === "[object Object]") {
    const latestDetails = payload?.latestDetails;
    if (latestDetails && typeof latestDetails === "object") {
      try {
        return JSON.stringify(latestDetails).slice(0, 180);
      } catch {
        return "Erro sem mensagem legivel.";
      }
    }

    return "Erro sem mensagem legivel.";
  }

  return detail.slice(0, 220);
}

function summarizeSafeJson(value: unknown) {
  if (!value || typeof value !== "object") return "-";

  const text = JSON.stringify(value, (key, current) => {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey.includes("secret") ||
      normalizedKey.includes("token") ||
      normalizedKey.includes("senha") ||
      normalizedKey.includes("password") ||
      normalizedKey.includes("api_key") ||
      normalizedKey.includes("apikey")
    ) {
      return "***";
    }

    return current;
  });

  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function countEnabledPermissions(row: Record<string, unknown>) {
  return Object.entries(row).filter(
    ([key, value]) =>
      typeof value === "boolean" &&
      value === true &&
      !["id"].includes(key)
  ).length;
}

function safeNumber(value: unknown) {
  if (typeof value === "string") {
    const normalized = value
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".");
    const parsedString = Number(normalized || 0);
    return Number.isFinite(parsedString) ? parsedString : 0;
  }

  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percent(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function normalizePhoneForGrouping(value: unknown) {
  return String(value || "").replace(/\D/g, "").trim();
}

function safeCount(result: CountResult) {
  if (result.error) return 0;
  return result.count || 0;
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["ativo", "ativa", "pago"]);
const RISK_SUBSCRIPTION_STATUSES = new Set([
  "vencida",
  "cancelada",
  "bloqueada",
  "inadimplente",
]);
const PENDING_CHARGE_STATUSES = new Set([
  "pending",
  "pendente",
  "aguardando_pagamento",
]);
const PAID_CHARGE_STATUSES = new Set([
  "received",
  "confirmed",
  "pago",
  "paid",
]);

function normalizeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function formatResourceName(value?: string | null) {
  return String(value || "-")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatResourceAvailability(row?: {
  habilitado?: boolean | null;
  limite_numero?: number | null;
  observacao?: string | null;
}) {
  if (!row) return "Nao mapeado";
  if (!row.habilitado) return "Bloqueado";
  if (typeof row.limite_numero === "number" && row.limite_numero > 0) {
    if (row.limite_numero >= 999) return "Ilimitado";
    return `Ate ${row.limite_numero}`;
  }
  return "Liberado";
}

function premiumEnabledSummary(rows: AdminTableRow[], planCodes: string[]) {
  const premiumCode = planCodes.includes("premium")
    ? "premium"
    : planCodes[planCodes.length - 1];

  if (!premiumCode || rows.length === 0) return "-";

  const enabled = rows.filter((row) => {
    const value = String(row[premiumCode] || "");
    return (
      ["Liberado", "Ilimitado"].includes(value) ||
      value.startsWith("Ate ")
    );
  }).length;

  return `${enabled}/${rows.length}`;
}

function daysUntil(value?: string | null) {
  if (!value) return null;

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

async function countSaloesByStatus(status: string) {
  const supabase = getSupabaseAdmin();
  const result = await supabase
    .from("saloes")
    .select("id", { count: "exact", head: true })
    .eq("status", status);
  return safeCount(result);
}

export async function getAdminMasterShellData(): Promise<AdminMasterShellData> {
  const supabase = getSupabaseAdmin();

  const [{ count: alertasCriticos, error: alertasError }, { count: ticketsAbertos, error: ticketsError }, { data: auditoria }] =
    await Promise.all([
      supabase
        .from("alertas_sistema")
        .select("id", { count: "exact", head: true })
        .eq("resolvido", false)
        .in("gravidade", ["alta", "critica"]),
      supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["aberto", "em_atendimento", "aguardando_tecnico"]),
      supabase
        .from("admin_master_auditoria")
        .select("id, acao, entidade, descricao, criado_em")
        .order("criado_em", { ascending: false })
        .limit(6),
    ]);

  return {
    alertasCriticos: alertasError ? 0 : alertasCriticos || 0,
    ticketsAbertos: ticketsError ? 0 : ticketsAbertos || 0,
    auditoriaRecente: ((auditoria || []) as {
      id?: string | null;
      acao?: string | null;
      entidade?: string | null;
      descricao?: string | null;
      criado_em?: string | null;
    }[]).map((item) => ({
      id: String(item.id || `${item.acao || "audit"}-${item.criado_em || ""}`),
      acao: item.acao || "-",
      entidade: item.entidade || "-",
      descricao: item.descricao || "Sem descricao",
      criadoEm: dateTimeValue(item.criado_em),
    })),
  };
}

export async function getAdminMasterDashboard(): Promise<AdminMasterDashboardData> {
  const supabase = getSupabaseAdmin();
  await syncAdminMasterAlerts();
  const operational = await getAdminMasterOperationalSnapshot();
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [
    totalSaloes,
    ativos,
    bloqueados,
    cancelados,
    saloesTrial,
    assinaturasAtivas,
    assinaturasVencidas,
    cobrancasMes,
    cobrancasVencidas,
    checkoutsProcessando,
    checkoutsFalhos,
    ticketsAbertos,
    alertasCriticos,
    totalClientes,
    clientesAppVinculados,
    clientesParaDiagnostico,
    planos,
    recentes,
  ] = await Promise.all([
    supabase.from("saloes").select("id", { count: "exact", head: true }),
    countSaloesByStatus("ativo"),
    countSaloesByStatus("bloqueado"),
    countSaloesByStatus("cancelado"),
    supabase
      .from("assinaturas")
      .select("id", { count: "exact", head: true })
      .in("status", ["teste_gratis", "trial"]),
    supabase
      .from("assinaturas")
      .select("id, valor")
      .in("status", ["ativo", "ativa", "pago"]),
    supabase
      .from("assinaturas")
      .select("id", { count: "exact", head: true })
      .in("status", ["vencida", "bloqueada", "cancelada"]),
    supabase
      .from("assinaturas_cobrancas")
      .select("valor, pago_em, payment_date, confirmed_date, status")
      .gte("created_at", inicioMes.toISOString()),
    supabase
      .from("assinaturas_cobrancas")
      .select("id", { count: "exact", head: true })
      .lt("data_expiracao", new Date().toISOString())
      .in("status", ["pending", "pendente", "aguardando_pagamento"]),
    supabase
      .from("assinatura_checkout_locks")
      .select("id", { count: "exact", head: true })
      .eq("status", "processando"),
    supabase
      .from("assinatura_checkout_locks")
      .select("id", { count: "exact", head: true })
      .in("status", ["erro", "expirado"]),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["aberto", "em_atendimento", "aguardando_tecnico"]),
    supabase
      .from("alertas_sistema")
      .select("id", { count: "exact", head: true })
      .eq("resolvido", false)
      .in("gravidade", ["alta", "critica"]),
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase
      .from("clientes_auth")
      .select("id", { count: "exact", head: true })
      .eq("app_ativo", true)
      .not("app_conta_id", "is", null),
    supabase
      .from("clientes")
      .select("id_salao, nome, telefone, whatsapp")
      .or("telefone.not.is.null,whatsapp.not.is.null")
      .limit(300),
    supabase
      .from("planos_saas")
      .select("codigo, nome, valor_mensal, destaque")
      .eq("ativo", true)
      .order("ordem", { ascending: true }),
    supabase
      .from("saloes")
      .select("id, nome, responsavel, email, plano, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const assinaturasAtivasRows =
    (assinaturasAtivas.data as { valor?: number | string | null }[] | null) ||
    [];
  const cobrancasRows =
    (cobrancasMes.data as { valor?: number | string | null; status?: string | null }[] | null) ||
    [];
  const mrr = assinaturasAtivasRows.reduce(
    (acc, row) => acc + safeNumber(row.valor),
    0
  );
  const receitaMes = cobrancasRows
    .filter((row) =>
      ["received", "confirmed", "pago", "paid"].includes(
        String(row.status || "").toLowerCase()
      )
    )
    .reduce((acc, row) => acc + safeNumber(row.valor), 0);
  const totalClientesCount = safeCount(totalClientes);
  const clientesAppCount = safeCount(clientesAppVinculados);
  const taxaDigitalizacao =
    totalClientesCount > 0 ? (clientesAppCount / totalClientesCount) * 100 : 0;
  const diagnosticoRows =
    ((clientesParaDiagnostico.data || []) as Array<{
      id_salao?: string | null;
      nome?: string | null;
      telefone?: string | null;
      whatsapp?: string | null;
    }>) || [];
  const phoneGroups = new Map<
    string,
    { saloes: Set<string>; nomes: Set<string>; total: number }
  >();

  for (const row of diagnosticoRows) {
    const telefone = normalizePhoneForGrouping(row.whatsapp || row.telefone);
    if (telefone.length < 10) continue;
    const current =
      phoneGroups.get(telefone) ||
      { saloes: new Set<string>(), nomes: new Set<string>(), total: 0 };
    current.total += 1;
    if (row.id_salao) current.saloes.add(row.id_salao);
    const nome = String(row.nome || "").trim().toLowerCase();
    if (nome) current.nomes.add(nome);
    phoneGroups.set(telefone, current);
  }

  const digitalizacao = Array.from(phoneGroups.entries())
    .filter(([, group]) => group.saloes.size > 1 && group.nomes.size > 1)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8)
    .map(([telefone, group]) => ({
      telefone,
      saloes: group.saloes.size,
      nomes: group.nomes.size,
      cadastros: group.total,
      sinal: "Conferir nomes diferentes",
    }));

  return {
    kpis: [
      {
        label: "Total de saloes",
        value: String(safeCount(totalSaloes)),
        hint: `${ativos} ativos, ${bloqueados} bloqueados`,
        tone: "dark",
      },
      {
        label: "Trials ativos",
        value: String(safeCount(saloesTrial)),
        hint: "Oportunidade de conversão",
        tone: "blue",
      },
      {
        label: "MRR atual",
        value: currency(mrr),
        hint: `${safeCount(assinaturasVencidas)} assinaturas em risco`,
        tone: "green",
      },
      {
        label: "Receita do mes",
        value: currency(receitaMes),
        hint: `${safeCount(cobrancasVencidas)} cobranças vencidas`,
        tone: "amber",
      },
      {
        label: "Checkouts assinatura",
        value: String(safeCount(checkoutsProcessando)),
        hint: `${safeCount(checkoutsFalhos)} com erro/expirado`,
        tone: safeCount(checkoutsFalhos) > 0 ? "red" : "blue",
      },
      {
        label: "Tickets abertos",
        value: String(safeCount(ticketsAbertos)),
        hint: "Suporte pendente",
        tone: "red",
      },
      {
        label: "Alertas criticos",
        value: String(safeCount(alertasCriticos)),
        hint: "Operacao e webhooks",
        tone: "red",
      },
      {
        label: "Taxa de digitalizacao",
        value: percent(taxaDigitalizacao),
        hint: `${clientesAppCount} de ${totalClientesCount} clientes conectados ao app`,
        tone: taxaDigitalizacao >= 35 ? "green" : "blue",
      },
    ] satisfies AdminKpi[],
    planos: (planos.data || []) as AdminTableRow[],
    recentes: ((recentes.data || []) as {
      id: string;
      nome?: string | null;
      responsavel?: string | null;
      email?: string | null;
      plano?: string | null;
      status?: string | null;
      created_at?: string | null;
    }[]).map((row) => ({
      id: row.id,
      salao: row.nome || "-",
      responsavel: row.responsavel || "-",
      email: row.email || "-",
      plano: row.plano || "-",
      status: row.status || "-",
      criado: dateValue(row.created_at),
    })),
    cancelados,
    operational,
    digitalizacao,
  };
}

export async function getAdminMasterSaloes() {
  const supabase = getSupabaseAdmin();
  const { data: saloes } = await supabase
    .from("saloes")
    .select(
      "id, nome, responsavel, email, telefone, whatsapp, cidade, estado, plano, status, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const saloesRows =
    ((saloes || []) as {
      id: string;
      nome?: string | null;
      responsavel?: string | null;
      email?: string | null;
      telefone?: string | null;
      whatsapp?: string | null;
      cidade?: string | null;
      estado?: string | null;
      plano?: string | null;
      status?: string | null;
      created_at?: string | null;
    }[]) || [];
  const salaoIds = saloesRows.map((salao) => salao.id);

  const [{ data: assinaturas }, { data: scores }] = await Promise.all([
    salaoIds.length
      ? supabase
          .from("assinaturas")
          .select("id_salao, plano, status, vencimento_em, trial_fim_em")
          .in("id_salao", salaoIds)
      : Promise.resolve({ data: [] as Array<{ id_salao: string }> }),
    salaoIds.length
      ? supabase
          .from("score_onboarding_salao")
          .select("id_salao, score_total, atualizado_em")
          .in("id_salao", salaoIds)
      : Promise.resolve({ data: [] as Array<{ id_salao: string }> }),
  ]);

  const assinaturaBySalao = new Map(
    ((assinaturas || []) as { id_salao: string }[]).map((item) => [
      item.id_salao,
      item,
    ])
  );
  const scoreBySalao = new Map(
    ((scores || []) as { id_salao: string }[]).map((item) => [
      item.id_salao,
      item,
    ])
  );

  return saloesRows.map((salao) => {
    const assinatura = assinaturaBySalao.get(salao.id) as
      | {
          plano?: string | null;
          status?: string | null;
          vencimento_em?: string | null;
          trial_fim_em?: string | null;
        }
      | undefined;
    const score = scoreBySalao.get(salao.id) as
      | { score_total?: number | null }
      | undefined;

    return {
      id: salao.id,
      salao: salao.nome || "-",
      responsavel: salao.responsavel || "-",
      email: salao.email || "-",
      telefone: salao.whatsapp || salao.telefone || "-",
      cidade: [salao.cidade, salao.estado].filter(Boolean).join("/") || "-",
      plano: assinatura?.plano || salao.plano || "-",
      assinatura: assinatura?.status || "-",
      vencimento: dateValue(assinatura?.vencimento_em || assinatura?.trial_fim_em),
      status: salao.status || "-",
      score: score?.score_total ?? 0,
      criado: dateValue(salao.created_at),
      acao: "Abrir salao",
      acao_tipo: "salao_detail",
      acao_id: salao.id,
    };
  });
}

export async function getAdminMasterSalaoDetail(idSalao: string) {
  const supabase = getSupabaseAdmin();
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [
    { data: salao },
    { data: assinatura },
    { data: tickets },
    { data: cobrancas },
    { data: anotacoes },
    { data: tags },
    { data: scoreSaude },
    { data: eventos24h },
    { data: alertasAtivos },
    access,
  ] = await Promise.all([
    supabase
      .from("saloes")
      .select("bairro, cep, cidade, complemento, cpf_cnpj, created_at, email, endereco, estado, id, inscricao_estadual, limite_profissionais, limite_usuarios, logo_url, nome, nome_fantasia, numero, plano, razao_social, renovacao_automatica, responsavel, status, telefone, tipo_pessoa, trial_ativo, trial_fim_em, trial_inicio_em, updated_at, whatsapp")
      .eq("id", idSalao)
      .maybeSingle(),
    supabase
      .from("assinaturas")
      .select("asaas_credit_card_brand, asaas_credit_card_last4, asaas_credit_card_token, asaas_credit_card_tokenized_at, asaas_customer_id, asaas_payment_id, asaas_subscription_id, asaas_subscription_status, created_at, forma_pagamento_atual, gateway, id, id_cobranca_atual, id_salao, limite_profissionais, limite_usuarios, pago_em, plano, referencia_atual, renovacao_automatica, status, trial_ativo, trial_fim_em, trial_inicio_em, updated_at, valor, vencimento_em")
      .eq("id_salao", idSalao)
      .maybeSingle(),
    supabase
      .from("tickets")
      .select("id, numero, assunto, status, prioridade, criado_em")
      .eq("id_salao", idSalao)
      .order("criado_em", { ascending: false })
      .limit(10),
    supabase
      .from("assinaturas_cobrancas")
      .select("id, referencia, descricao, valor, status, data_expiracao, pago_em")
      .eq("id_salao", idSalao)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("admin_master_anotacoes_salao")
      .select("id, titulo, nota, criada_em")
      .eq("id_salao", idSalao)
      .order("criada_em", { ascending: false })
      .limit(10),
    supabase
      .from("admin_master_salao_tags")
      .select("admin_master_tags_salao(nome, cor)")
      .eq("id_salao", idSalao),
    supabase
      .from("score_saude_salao")
      .select("score_total, uso_recente, inadimplencia_risco, tickets_abertos, risco_cancelamento, atualizado_em")
      .eq("id_salao", idSalao)
      .maybeSingle(),
    supabase
      .from("eventos_sistema")
      .select("id, modulo, tipo_evento, severidade, mensagem, rota, acao, response_ms, sucesso, created_at")
      .eq("id_salao", idSalao)
      .gte("created_at", last24h)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("alertas_sistema")
      .select("id, tipo, gravidade, titulo, descricao, origem_modulo, criado_em, atualizado_em, resolvido")
      .eq("id_salao", idSalao)
      .eq("resolvido", false)
      .order("criado_em", { ascending: false })
      .limit(12),
    getPlanoAccessSnapshot(idSalao),
  ]);

  const eventosRows = ((eventos24h || []) as Array<{
    id?: string | null;
    modulo?: string | null;
    tipo_evento?: string | null;
    severidade?: string | null;
    mensagem?: string | null;
    rota?: string | null;
    acao?: string | null;
    response_ms?: number | null;
    sucesso?: boolean | null;
    created_at?: string | null;
  }>).map((evento) => ({
    horario: dateTimeValue(evento.created_at),
    modulo: evento.modulo || "-",
    tipo: evento.tipo_evento || "-",
    severidade: evento.severidade || "-",
    rota: evento.rota || "-",
    acao: evento.acao || "-",
    tempo: evento.response_ms ? `${Math.round(evento.response_ms)} ms` : "-",
    resultado: evento.sucesso === false ? "Falhou" : "OK",
    detalhe: evento.mensagem || "-",
  }));

  const alertasRows = ((alertasAtivos || []) as Array<{
    id?: string | null;
    tipo?: string | null;
    gravidade?: string | null;
    titulo?: string | null;
    descricao?: string | null;
    origem_modulo?: string | null;
    criado_em?: string | null;
  }>).map((alerta) => ({
    criado: dateTimeValue(alerta.criado_em),
    gravidade: alerta.gravidade || "-",
    origem: alerta.origem_modulo || "-",
    titulo: alerta.titulo || alerta.tipo || "-",
    detalhe: alerta.descricao || "-",
    acao: "Criar ticket",
    acao_tipo: "alert_ticket",
    acao_id: alerta.id || "",
  }));

  const score = (scoreSaude || {}) as {
    score_total?: number | null;
    uso_recente?: number | null;
    inadimplencia_risco?: number | null;
    tickets_abertos?: number | null;
    risco_cancelamento?: number | null;
    atualizado_em?: string | null;
  };

  return {
    salao: salao as Record<string, unknown> | null,
    assinatura: assinatura as Record<string, unknown> | null,
    tickets: (tickets || []) as AdminTableRow[],
    cobrancas: (cobrancas || []) as AdminTableRow[],
    anotacoes: (anotacoes || []) as AdminTableRow[],
    scoreSaude: {
      score_total: score.score_total ?? null,
      uso_recente: score.uso_recente ?? null,
      inadimplencia_risco: score.inadimplencia_risco ?? null,
      tickets_abertos: score.tickets_abertos ?? null,
      risco_cancelamento: score.risco_cancelamento ?? null,
      atualizado_em: dateTimeValue(score.atualizado_em),
    },
    eventos24h: eventosRows,
    alertasAtivos: alertasRows,
    tags: ((tags || []) as { admin_master_tags_salao?: { nome?: string; cor?: string } | { nome?: string; cor?: string }[] | null }[]).map(
      (item) => {
        const tag = Array.isArray(item.admin_master_tags_salao)
          ? item.admin_master_tags_salao[0]
          : item.admin_master_tags_salao;

        return {
          nome: tag?.nome || "-",
          cor: tag?.cor || "-",
        };
      }
    ),
    access,
  };
}

export async function getAdminMasterPlanosSection(): Promise<AdminSectionData> {
  const supabase = getSupabaseAdmin();
  const [{ data: planos }, { data: recursos }, { data: assinaturas }, { data: saloes }] = await Promise.all([
    supabase
      .from("planos_saas")
      .select(
        "id, codigo, nome, subtitulo, valor_mensal, preco_anual, limite_usuarios, limite_profissionais, destaque, ativo, trial_dias, ideal_para, cta, ordem"
      )
      .order("ordem", { ascending: true }),
    supabase
      .from("planos_recursos")
      .select("id_plano, recurso_codigo, habilitado, limite_numero, observacao"),
    supabase
      .from("assinaturas")
      .select("plano, status, valor"),
    supabase
      .from("saloes")
      .select("plano, status"),
  ]);

  const recursosRows = (recursos || []) as {
    id_plano: string;
    recurso_codigo: string;
    habilitado: boolean | null;
    limite_numero?: number | null;
    observacao?: string | null;
  }[];
  const assinaturasRows = ((assinaturas || []) as {
    plano?: string | null;
    status?: string | null;
    valor?: number | string | null;
  }[]);
  const saloesRows = ((saloes || []) as {
    plano?: string | null;
    status?: string | null;
  }[]);
  const assinaturasAtivasPorPlano = new Map<string, number>();
  const mrrPorPlano = new Map<string, number>();
  const saloesPorPlano = new Map<string, number>();

  for (const assinatura of assinaturasRows) {
    const planoCodigo = normalizeStatus(assinatura.plano);
    if (!planoCodigo) continue;

    if (ACTIVE_SUBSCRIPTION_STATUSES.has(normalizeStatus(assinatura.status))) {
      assinaturasAtivasPorPlano.set(
        planoCodigo,
        (assinaturasAtivasPorPlano.get(planoCodigo) || 0) + 1
      );
      mrrPorPlano.set(
        planoCodigo,
        (mrrPorPlano.get(planoCodigo) || 0) + safeNumber(assinatura.valor)
      );
    }
  }

  for (const salao of saloesRows) {
    const planoCodigo = normalizeStatus(salao.plano);
    if (!planoCodigo) continue;
    saloesPorPlano.set(planoCodigo, (saloesPorPlano.get(planoCodigo) || 0) + 1);
  }

  const rows = ((planos || []) as {
    id: string;
    codigo?: string | null;
    nome?: string | null;
    subtitulo?: string | null;
    valor_mensal?: number | string | null;
    preco_anual?: number | string | null;
    limite_usuarios?: number | null;
    limite_profissionais?: number | null;
    destaque?: boolean | null;
    ativo?: boolean | null;
    trial_dias?: number | null;
    ideal_para?: string | null;
    cta?: string | null;
    ordem?: number | null;
  }[]).map((plano) => {
    const habilitados = recursosRows.filter(
      (recurso) => recurso.id_plano === plano.id && recurso.habilitado
    ).length;
    const bloqueados = recursosRows.filter(
      (recurso) => recurso.id_plano === plano.id && !recurso.habilitado
    ).length;
    const codigo = normalizeStatus(plano.codigo);
    const mensal = safeNumber(plano.valor_mensal);
    const anual = safeNumber(plano.preco_anual);
    const anualCheio = mensal * 12;
    const descontoAnual =
      anual > 0 && anualCheio > 0
        ? Math.max(0, ((anualCheio - anual) / anualCheio) * 100)
        : 0;

    return {
      codigo: plano.codigo || "-",
      plano: plano.nome || "-",
      mensal: currency(mensal),
      anual: anual > 0 ? currency(anual) : "-",
      desconto_anual: descontoAnual > 0 ? percent(descontoAnual) : "-",
      usuarios: plano.limite_usuarios ?? "-",
      profissionais: plano.limite_profissionais ?? "-",
      recursos: habilitados,
      bloqueados,
      saloes: saloesPorPlano.get(codigo) || 0,
      assinaturas_ativas: assinaturasAtivasPorPlano.get(codigo) || 0,
      mrr: currency(mrrPorPlano.get(codigo) || 0),
      ideal: plano.ideal_para || "-",
      cta: plano.cta || "-",
      trial: plano.trial_dias ? `${plano.trial_dias}d` : "-",
      destaque: plano.destaque ? "Sim" : "Nao",
      ativo: plano.ativo ? "Ativo" : "Inativo",
    };
  });
  const activeRows = rows.filter((row) => row.ativo === "Ativo");
  const totalMrr = Array.from(mrrPorPlano.values()).reduce((acc, value) => acc + value, 0);
  const destaque = rows.find((row) => row.destaque === "Sim");
  const planosComBloqueios = rows.filter((row) => safeNumber(row.bloqueados) > 0).length;

  return {
    title: "Planos e recursos",
    description:
      "Motor comercial do SalãoPremium com limites, recursos liberados e bloqueios por plano.",
    kpis: [
      {
        label: "Planos ativos",
        value: String(activeRows.length),
        hint: "Trial, Básico, Pro e Premium",
        tone: "blue",
      },
      {
        label: "Recursos mapeados",
        value: String(recursosRows.length),
        hint: "Planos_recursos centralizado",
        tone: "green",
      },
      {
        label: "Plano destaque",
        value: String(destaque?.plano || "-"),
        hint: "Usado para venda e upgrade",
        tone: "dark",
      },
      {
        label: "MRR por plano",
        value: currency(totalMrr),
        hint: "Receita ativa distribuida nos planos",
        tone: "green",
      },
      {
        label: "Planos com bloqueios",
        value: String(planosComBloqueios),
        hint: "Diferenciais reais para upgrade",
        tone: planosComBloqueios > 0 ? "amber" : "green",
      },
    ],
    diagnostics: [
      {
        label: "Oferta principal",
        value: String(destaque?.plano || "Definir"),
        detail:
          destaque?.cta && destaque.cta !== "-"
            ? `CTA atual: ${destaque.cta}`
            : "Defina um CTA comercial claro no plano destaque para melhorar conversão.",
        tone: destaque ? "green" : "amber",
        href: "/admin-master/planos",
      },
      {
        label: "Upgrade path",
        value: `${planosComBloqueios} diferencial(is)`,
        detail:
          "Recursos bloqueados por plano precisam ser intencionais: eles formam o argumento de upgrade no painel e na venda.",
        tone: planosComBloqueios > 0 ? "blue" : "amber",
        href: "/admin-master/recursos",
      },
      {
        label: "Preco anual",
        value: rows.some((row) => row.desconto_anual !== "-") ? "Configurado" : "Revisar",
        detail:
          "Plano anual com desconto claro aumenta previsibilidade de caixa e reduz churn mensal.",
        tone: rows.some((row) => row.desconto_anual !== "-") ? "green" : "amber",
      },
    ],
    rows,
    columns: [
      "codigo",
      "plano",
      "mensal",
      "anual",
      "desconto_anual",
      "usuarios",
      "profissionais",
      "recursos",
      "bloqueados",
      "saloes",
      "assinaturas_ativas",
      "mrr",
      "ideal",
      "ativo",
    ],
    actions: [
      "Ajustar matriz de recursos",
      "Ver saloes no plano",
      "Auditar",
    ],
  };
}

export async function getAdminMasterRecursosSection(): Promise<AdminSectionData> {
  const supabase = getSupabaseAdmin();
  const [{ data: planos }, { data: recursos }] = await Promise.all([
    supabase
      .from("planos_saas")
      .select("id, codigo, nome, ativo, ordem")
      .order("ordem", { ascending: true }),
    supabase
      .from("planos_recursos")
      .select("id_plano, recurso_codigo, habilitado, limite_numero, observacao"),
  ]);

  const planRows = ((planos || []) as {
    id: string;
    codigo?: string | null;
    nome?: string | null;
    ativo?: boolean | null;
    ordem?: number | null;
  }[]).filter((plano) => plano.ativo !== false);
  const resourceRows = ((recursos || []) as {
    id_plano?: string | null;
    recurso_codigo?: string | null;
    habilitado?: boolean | null;
    limite_numero?: number | null;
    observacao?: string | null;
  }[]);
  const planById = new Map(planRows.map((plano) => [plano.id, plano]));
  const resourcesByCode = new Map<
    string,
    Map<string, (typeof resourceRows)[number]>
  >();

  for (const recurso of resourceRows) {
    if (!recurso.id_plano || !recurso.recurso_codigo) continue;
    const plano = planById.get(recurso.id_plano);
    if (!plano?.codigo) continue;
    const code = recurso.recurso_codigo;
    if (!resourcesByCode.has(code)) {
      resourcesByCode.set(code, new Map());
    }
    resourcesByCode.get(code)?.set(plano.codigo, recurso);
  }

  const planCodes = planRows
    .map((plano) => String(plano.codigo || "").trim())
    .filter(Boolean);
  const paidPlanCodes = planCodes.filter(
    (codigo) => !["teste_gratis", "trial", "gratis"].includes(codigo)
  );
  const rows = Array.from(resourcesByCode.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([recursoCodigo, byPlan]) => {
      const enabledPlans = paidPlanCodes.filter(
        (codigo) => byPlan.get(codigo)?.habilitado
      );
      const firstEnabledPlan =
        enabledPlans[0] ||
        planCodes.find((codigo) => byPlan.get(codigo)?.habilitado) ||
        null;
      const premiumEnabled =
        byPlan.get("premium")?.habilitado ||
        byPlan.get(paidPlanCodes[paidPlanCodes.length - 1] || "")?.habilitado;
      const observacao =
        Array.from(byPlan.values()).find((item) => item.observacao)?.observacao ||
        "-";
      const row: AdminTableRow = {
        recurso: formatResourceName(recursoCodigo),
        codigo: recursoCodigo,
        entrada: firstEnabledPlan ? formatResourceName(firstEnabledPlan) : "-",
        status: enabledPlans.length === paidPlanCodes.length
          ? "Base"
          : premiumEnabled
            ? "Upgrade"
            : enabledPlans.length > 0
              ? "Parcial"
              : "Bloqueado",
        observacao,
      };

      for (const codigo of planCodes) {
        row[codigo] = formatResourceAvailability(byPlan.get(codigo));
      }

      return row;
    });
  const distinctResources = rows.length;
  const upgradeResources = rows.filter((row) => row.status === "Upgrade").length;
  const blockedResources = rows.filter((row) => row.status === "Bloqueado").length;
  const unmappedSlots = rows.reduce(
    (acc, row) =>
      acc +
      planCodes.filter((codigo) => String(row[codigo] || "") === "Nao mapeado")
        .length,
    0
  );

  return {
    title: "Matriz de recursos",
    description:
      "Mapa de liberacao por plano para garantir promessa comercial, bloqueios de upgrade e limites operacionais coerentes.",
    kpis: [
      {
        label: "Recursos",
        value: String(distinctResources),
        hint: `${planCodes.length} planos ativos mapeados`,
        tone: "dark",
      },
      {
        label: "Diferenciais upgrade",
        value: String(upgradeResources),
        hint: "Liberados somente em planos superiores",
        tone: upgradeResources > 0 ? "blue" : "amber",
      },
      {
        label: "Bloqueados",
        value: String(blockedResources),
        hint: "Recursos sem plano pago liberado",
        tone: blockedResources > 0 ? "red" : "green",
      },
      {
        label: "Lacunas matriz",
        value: String(unmappedSlots),
        hint: "Celulas sem configuracao explicita",
        tone: unmappedSlots > 0 ? "amber" : "green",
      },
    ],
    diagnostics: [
      {
        label: "Regra de venda",
        value: "1 matriz",
        detail:
          "Tudo que aparece para o cliente deve existir aqui: limites, bloqueios e diferenciais de upgrade.",
        tone: "blue",
      },
      {
        label: "Premium",
        value: premiumEnabledSummary(rows, planCodes),
        detail:
          "Premium deve concentrar os recursos mais fortes para sustentar maior ticket mensal.",
        tone: "green",
      },
      {
        label: "Governanca",
        value: unmappedSlots > 0 ? "Revisar" : "Completa",
        detail:
          "Evite recurso sem mapeamento: isso causa divergencia entre venda, acesso e suporte.",
        tone: unmappedSlots > 0 ? "amber" : "green",
      },
    ],
    rows,
    columns: ["recurso", ...planCodes, "entrada", "status", "observacao"],
    actions: [
      "Editar preco e limites",
      "Ver saloes no plano",
      "Auditar",
    ],
  };
}

async function getAdminMasterFinanceiroSection(): Promise<AdminSectionData> {
  const supabase = getSupabaseAdmin();
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [
    { data: assinaturasContexto },
    { data: assinaturasAtivasValor },
    { count: assinaturasEmRiscoCount },
    { data: cobrancas },
    { data: checkoutLocks },
  ] = await Promise.all([
      supabase
        .from("assinaturas")
        .select("id_salao, plano, status, valor, vencimento_em, trial_fim_em, updated_at")
        .order("updated_at", { ascending: false })
        .limit(150),
      supabase
        .from("assinaturas")
        .select("valor")
        .in("status", ["ativo", "ativa", "pago"]),
      supabase
        .from("assinaturas")
        .select("id", { count: "exact", head: true })
        .in("status", ["vencida", "cancelada", "bloqueada", "inadimplente"]),
      supabase
        .from("assinaturas_cobrancas")
        .select(
          "id_salao, referencia, valor, status, forma_pagamento, gateway, data_expiracao, pago_em, payment_date, confirmed_date, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("assinatura_checkout_locks")
        .select("id_salao, status, id_cobranca, asaas_payment_id, erro_texto, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(100),
    ]);

  const assinaturaRows =
    ((assinaturasContexto || []) as {
      id_salao?: string | null;
      plano?: string | null;
      status?: string | null;
      valor?: number | string | null;
      vencimento_em?: string | null;
      trial_fim_em?: string | null;
    }[]) || [];
  const cobrancaRows = ((cobrancas || []) as {
    id_salao?: string | null;
    referencia?: string | null;
    valor?: number | string | null;
    status?: string | null;
    forma_pagamento?: string | null;
    gateway?: string | null;
    data_expiracao?: string | null;
    pago_em?: string | null;
    payment_date?: string | null;
    confirmed_date?: string | null;
    created_at?: string | null;
  }[]) || [];
  const checkoutRows = ((checkoutLocks || []) as {
    id_salao?: string | null;
    status?: string | null;
    id_cobranca?: string | null;
    asaas_payment_id?: string | null;
    erro_texto?: string | null;
  }[]) || [];
  const salaoIds = Array.from(
    new Set(
      [
        ...assinaturaRows.map((item) => item.id_salao),
        ...cobrancaRows.map((item) => item.id_salao),
        ...checkoutRows.map((item) => item.id_salao),
      ].filter(Boolean)
    )
  ) as string[];
  const { data: saloes } = salaoIds.length
    ? await supabase
        .from("saloes")
        .select("id, nome, plano, status")
        .in("id", salaoIds)
        .limit(salaoIds.length)
    : {
        data: [] as Array<{
          id: string;
          nome?: string | null;
          plano?: string | null;
          status?: string | null;
        }>,
      };

  const salaoById = new Map(
    ((saloes || []) as {
      id: string;
      nome?: string | null;
      plano?: string | null;
      status?: string | null;
    }[]).map((salao) => [
      salao.id,
      {
        nome: salao.nome || salao.id,
        plano: salao.plano || "-",
        status: salao.status || "-",
      },
    ])
  );

  const assinaturaBySalao = new Map<string, (typeof assinaturaRows)[number]>();
  for (const assinatura of assinaturaRows) {
    if (assinatura.id_salao && !assinaturaBySalao.has(assinatura.id_salao)) {
      assinaturaBySalao.set(assinatura.id_salao, assinatura);
    }
  }

  const mrr = (((assinaturasAtivasValor || []) as { valor?: number | string | null }[]) || [])
    .reduce((acc, assinatura) => acc + safeNumber(assinatura.valor), 0);
  const receitaMes = cobrancaRows
    .filter((cobranca) => {
      if (!PAID_CHARGE_STATUSES.has(normalizeStatus(cobranca.status))) {
        return false;
      }
      const paidAt =
        cobranca.pago_em ||
        cobranca.payment_date ||
        cobranca.confirmed_date ||
        cobranca.created_at;
      return paidAt ? new Date(paidAt) >= inicioMes : false;
    })
    .reduce((acc, cobranca) => acc + safeNumber(cobranca.valor), 0);
  const pendenteValor = cobrancaRows
    .filter((cobranca) =>
      PENDING_CHARGE_STATUSES.has(normalizeStatus(cobranca.status))
    )
    .reduce((acc, cobranca) => acc + safeNumber(cobranca.valor), 0);
  const previsao30Dias = cobrancaRows
    .filter((cobranca) => {
      const dias = daysUntil(cobranca.data_expiracao);
      return (
        PENDING_CHARGE_STATUSES.has(normalizeStatus(cobranca.status)) &&
        typeof dias === "number" &&
        dias >= 0 &&
        dias <= 30
      );
    })
    .reduce((acc, cobranca) => acc + safeNumber(cobranca.valor), 0);
  const cobrancasAtrasadas = cobrancaRows.filter((cobranca) => {
    const dias = daysUntil(cobranca.data_expiracao);
    return (
      PENDING_CHARGE_STATUSES.has(normalizeStatus(cobranca.status)) &&
      typeof dias === "number" &&
      dias < 0
    );
  });
  const atrasadoValor = cobrancasAtrasadas.reduce(
    (acc, cobranca) => acc + safeNumber(cobranca.valor),
    0
  );
  const assinaturasEmRisco = assinaturasEmRiscoCount || 0;
  const valorAssinaturasEmRisco = assinaturaRows
    .filter((assinatura) =>
      RISK_SUBSCRIPTION_STATUSES.has(normalizeStatus(assinatura.status))
    )
    .reduce((acc, assinatura) => acc + safeNumber(assinatura.valor), 0);
  const mrrAnualizado = mrr * 12;
  const checkoutsComFalha = checkoutRows.filter((checkout) =>
    ["erro", "expirado"].includes(normalizeStatus(checkout.status))
  ).length;
  const checkoutsParaReconciliar = checkoutRows.filter(
    (checkout) =>
      Boolean(checkout.asaas_payment_id) &&
      !checkout.id_cobranca &&
      ["erro", "expirado"].includes(normalizeStatus(checkout.status))
  ).length;
  const taxaRecebimento =
    cobrancaRows.length > 0
      ? (cobrancaRows.filter((cobranca) =>
          PAID_CHARGE_STATUSES.has(normalizeStatus(cobranca.status))
        ).length /
          cobrancaRows.length) *
        100
      : 0;

  const rows = cobrancaRows.slice(0, 120).map((cobranca) => {
    const salao = cobranca.id_salao ? salaoById.get(cobranca.id_salao) : null;
    const assinatura = cobranca.id_salao
      ? assinaturaBySalao.get(cobranca.id_salao)
      : null;
    const status = normalizeStatus(cobranca.status);
    const diasParaExpirar = daysUntil(cobranca.data_expiracao);
    const atrasada =
      PENDING_CHARGE_STATUSES.has(status) &&
      typeof diasParaExpirar === "number" &&
      diasParaExpirar < 0;
    const paidAt =
      cobranca.pago_em ||
      cobranca.payment_date ||
      cobranca.confirmed_date ||
      null;

    return {
      salao: salao?.nome || cobranca.id_salao || "-",
      plano: assinatura?.plano || salao?.plano || "-",
      valor: currency(safeNumber(cobranca.valor)),
      status: cobranca.status || "-",
      forma: cobranca.forma_pagamento || cobranca.gateway || "-",
      vencimento: dateValue(cobranca.data_expiracao),
      recebido: dateValue(paidAt),
      referencia: cobranca.referencia || "-",
      sinal: PAID_CHARGE_STATUSES.has(status)
        ? "Receita confirmada"
        : atrasada
          ? `Inadimplente ha ${Math.abs(diasParaExpirar || 0)}d`
          : PENDING_CHARGE_STATUSES.has(status)
            ? "Aguardando pagamento"
            : "Acompanhar",
        acao: atrasada && cobranca.id_salao ? "Criar ticket" : "Abrir salão",
      acao_tipo:
        atrasada && cobranca.id_salao
          ? "salao_ticket_financeiro"
          : cobranca.id_salao
            ? "salao_detail"
            : null,
      acao_id: cobranca.id_salao || null,
    };
  });

  return {
    title: "Financeiro SaaS",
    description:
      "Cockpit de receita do Admin Master: MRR, caixa recebido, pendencias, inadimplencia e reconciliacao de checkout.",
    kpis: [
      {
        label: "MRR atual",
        value: currency(mrr),
        hint: `${currency(mrrAnualizado)} anualizado`,
        tone: "green",
      },
      {
        label: "Receita mes",
        value: currency(receitaMes),
        hint: "Cobrancas confirmadas no mes atual",
        tone: "blue",
      },
      {
        label: "Pendentes",
        value: currency(pendenteValor),
        hint: `${currency(previsao30Dias)} vence em ate 30 dias`,
        tone: pendenteValor > 0 ? "amber" : "green",
      },
      {
        label: "Em atraso",
        value: currency(atrasadoValor),
        hint: `${cobrancasAtrasadas.length} cobrança(s) vencida(s)`,
        tone: atrasadoValor > 0 ? "red" : "green",
      },
      {
        label: "Assinaturas em risco",
        value: String(assinaturasEmRisco),
        hint: `${currency(valorAssinaturasEmRisco)} de exposicao`,
        tone: assinaturasEmRisco > 0 ? "red" : "green",
      },
    ],
    diagnostics: [
      {
        label: "Caixa do mes",
        value: currency(receitaMes),
        detail:
          "Receita confirmada precisa bater com cobranças pagas e manter o webhook Asaas sem redirecionamento.",
        tone: "blue",
        href: "/admin-master/assinaturas/cobrancas",
      },
      {
        label: "Recebimento",
        value: percent(taxaRecebimento),
        detail:
          "Percentual recebido nas últimas cobranças listadas. Queda aqui vira ação de cobrança e suporte.",
        tone: taxaRecebimento >= 70 ? "green" : "amber",
      },
      {
        label: "Forecast 30 dias",
        value: currency(previsao30Dias),
        detail:
          "Valor pendente com vencimento nos proximos 30 dias. Use junto com renovacao automatica para evitar susto no caixa.",
        tone: previsao30Dias > 0 ? "blue" : "green",
        href: "/admin-master/assinaturas",
      },
      {
        label: "Reconciliacao",
        value: `${checkoutsParaReconciliar}/${checkoutsComFalha}`,
        detail:
          "Checkout com pagamento no provedor e sem cobrança local precisa ser tratado antes de vender em escala.",
        tone: checkoutsParaReconciliar > 0 ? "red" : "green",
        href: "/admin-master/operacao",
      },
    ],
    rows,
    columns: [
      "salao",
      "plano",
      "valor",
      "status",
      "forma",
      "vencimento",
      "recebido",
      "referencia",
      "sinal",
      "acao",
    ],
    actions: [
      "Ver inadimplentes",
      "Abrir cobranças",
      "Abrir relatorios",
      "Reconciliar checkout",
    ],
  };
}

function formatAdminTableValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Sim" : "Nao";
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const looksLikeDate =
      /^\d{4}-\d{2}-\d{2}T/.test(value) ||
      /^\d{4}-\d{2}-\d{2}$/.test(value);

    return looksLikeDate ? dateTimeValue(value) : value;
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value).slice(0, 120);
  }

  return value ? String(value) : "-";
}

function buildGenericRowAction(section: string, row: Record<string, unknown>) {
  const id = typeof row.id === "string" ? row.id : null;
  const idSalao = typeof row.id_salao === "string" ? row.id_salao : null;

  if ((section === "tickets" || section === "suporte") && id) {
    return {
      acao: "Abrir ticket",
      acao_tipo: "ticket_detail",
      acao_id: id,
    };
  }

  if ((section === "checklists" || section === "relatorios") && idSalao) {
    return {
      acao: "Abrir salao",
      acao_tipo: "salao_detail",
      acao_id: idSalao,
    };
  }

  if (section === "whatsapp" && idSalao) {
    return {
      acao: "Abrir salao",
      acao_tipo: "salao_detail",
      acao_id: idSalao,
    };
  }

  return null;
}

export async function getAdminMasterSection(
  section: string
): Promise<AdminSectionData> {
  const supabase = getSupabaseAdmin();

  if (section === "suporte") {
    const { items, metrics } = await listAdminTickets();

    return {
      title: "Suporte",
      description:
        "Tickets, clientes com problema, prioridades, última resposta e operação de atendimento.",
      kpis: [
        {
          label: "Tickets",
          value: String(metrics.total),
          hint: "Historico recente do suporte",
          tone: "dark",
        },
        {
          label: "Em andamento",
          value: String(metrics.abertos),
          hint: "Chamados ainda nao encerrados",
          tone: "amber",
        },
        {
          label: "Aguardando cliente",
          value: String(metrics.aguardandoCliente),
          hint: "Retorno pendente do salao",
          tone: "blue",
        },
      ],
      rows: items.map((item) => ({
        ticket: `#${item.numero}`,
        salao: item.salaoNome || item.salaoId || "-",
        assunto: item.assunto,
        solicitante: item.solicitanteNome,
        prioridade: item.prioridade,
        status: item.status,
        atualizado: item.ultimaInteracaoLabel,
        acao: "Abrir ticket",
        acao_tipo: "ticket_detail",
        acao_id: item.id,
      })),
      columns: [
        "ticket",
        "salao",
        "assunto",
        "solicitante",
        "prioridade",
        "status",
        "atualizado",
        "acao",
      ],
      actions: ["Abrir tickets", "Abrir saloes", "Abrir alertas"],
    };
  }

  if (section === "saloes") {
    const rows = await getAdminMasterSaloes();
    return {
      title: "Salões clientes",
      description:
        "Controle de clientes, status, assinatura, score de onboarding e acoes administrativas.",
      kpis: [
        {
          label: "Salões listados",
          value: String(rows.length),
          hint: "Ultimos 100 saloes",
          tone: "dark",
        },
        {
          label: "Ativos",
          value: String(rows.filter((row) => row.status === "ativo").length),
          hint: "Status do salao",
          tone: "green",
        },
        {
          label: "Em trial",
          value: String(
            rows.filter((row) =>
              ["teste_gratis", "trial"].includes(
                String(row.assinatura || "").toLowerCase()
              )
            ).length
          ),
          hint: "Converter para pago",
          tone: "blue",
        },
      ],
      rows,
      columns: [
        "salao",
        "responsavel",
        "email",
        "telefone",
        "plano",
        "assinatura",
        "vencimento",
        "score",
        "acao",
      ],
      actions: [
        "Abrir saloes",
        "Abrir saloes excluidos",
        "Abrir tickets",
        "Abrir financeiro",
      ],
    };
  }

  if (section === "notificacoes") {
    const [{ data: notificacoes }, { data: destinos }] = await Promise.all([
      supabase
        .from("notificacoes_globais")
        .select(
          "id, titulo, descricao, tipo, publico_tipo, status, agendada_em, enviada_em, criada_em, link_url"
        )
        .order("criada_em", { ascending: false })
        .limit(100),
      supabase
        .from("notificacoes_destinos")
        .select("id_notificacao, id_salao, status, entregue_em, lida_em, clicada_em")
        .limit(1000),
    ]);

    const destinoStats = new Map<
      string,
      { total: number; entregues: number; lidas: number; cliques: number; falhas: number }
    >();

    for (const destino of (destinos || []) as {
      id_notificacao?: string | null;
      status?: string | null;
      entregue_em?: string | null;
      lida_em?: string | null;
      clicada_em?: string | null;
    }[]) {
      if (!destino.id_notificacao) continue;
      const stats =
        destinoStats.get(destino.id_notificacao) ||
        { total: 0, entregues: 0, lidas: 0, cliques: 0, falhas: 0 };
      const status = normalizeStatus(destino.status);

      stats.total += 1;
      if (destino.entregue_em || ["entregue", "lida", "clicada"].includes(status)) {
        stats.entregues += 1;
      }
      if (destino.lida_em || ["lida", "clicada"].includes(status)) stats.lidas += 1;
      if (destino.clicada_em || status === "clicada") stats.cliques += 1;
      if (["erro", "falha", "failed"].includes(status)) stats.falhas += 1;
      destinoStats.set(destino.id_notificacao, stats);
    }

    const rows = ((notificacoes || []) as {
      id?: string | null;
      titulo?: string | null;
      descricao?: string | null;
      tipo?: string | null;
      publico_tipo?: string | null;
      status?: string | null;
      agendada_em?: string | null;
      enviada_em?: string | null;
      criada_em?: string | null;
      link_url?: string | null;
    }[]).map((item) => {
      const stats = item.id ? destinoStats.get(item.id) : null;
      const status = normalizeStatus(item.status);
      const agendadaPara = daysUntil(item.agendada_em);
      const leitura =
        stats && stats.total > 0 ? `${Math.round((stats.lidas / stats.total) * 100)}%` : "-";
      const cliques =
        stats && stats.total > 0 ? `${Math.round((stats.cliques / stats.total) * 100)}%` : "-";

      let proximaAcao = "Monitorar leitura";
      if (status === "rascunho") proximaAcao = "Revisar e agendar";
      if (status === "agendada" && typeof agendadaPara === "number" && agendadaPara < 0) {
        proximaAcao = "Verificar envio atrasado";
      }
      if (stats?.falhas) proximaAcao = "Auditar falhas de entrega";
      if (status === "enviada" && !stats?.total) proximaAcao = "Confirmar destinos";

      return {
        titulo: item.titulo || "-",
        tipo: item.tipo || "-",
        publico: item.publico_tipo || "-",
        status: item.status || "-",
        criada: dateTimeValue(item.criada_em),
        agendada: dateTimeValue(item.agendada_em),
        enviada: dateTimeValue(item.enviada_em),
        destinos: stats?.total || 0,
        leitura,
        cliques,
        sinal: stats?.falhas ? `${stats.falhas} falha(s)` : proximaAcao,
        acao: item.id ? "Detalhes" : "-",
        acao_tipo: item.id ? "notificacao_detail" : null,
        acao_id: item.id || null,
      };
    });

    const agendadas = rows.filter((row) => normalizeStatus(row.status) === "agendada").length;
    const enviadas = rows.filter((row) => normalizeStatus(row.status) === "enviada").length;
    const falhas = Array.from(destinoStats.values()).reduce((acc, stats) => acc + stats.falhas, 0);
    const totalDestinos = Array.from(destinoStats.values()).reduce(
      (acc, stats) => acc + stats.total,
      0
    );
    const totalLidas = Array.from(destinoStats.values()).reduce(
      (acc, stats) => acc + stats.lidas,
      0
    );
    const leituraMedia =
      totalDestinos > 0 ? `${Math.round((totalLidas / totalDestinos) * 100)}%` : "0%";

    return {
        title: "Notificações globais",
        description:
          "Comunicados para salões com leitura, cliques, falhas de entrega e próxima ação operacional.",
      kpis: [
        {
            label: "Notificações",
          value: String(rows.length),
            hint: "Últimas criadas",
          tone: "dark",
        },
        {
          label: "Agendadas",
          value: String(agendadas),
          hint: "Aguardando disparo",
          tone: agendadas > 0 ? "blue" : "dark",
        },
        {
          label: "Enviadas",
          value: String(enviadas),
          hint: "Ja disparadas",
          tone: "green",
        },
        {
          label: "Falhas",
          value: String(falhas),
          hint: "Destinos com problema",
          tone: falhas > 0 ? "red" : "green",
        },
        {
          label: "Leitura media",
          value: leituraMedia,
          hint: `${totalLidas} de ${totalDestinos} destino(s)`,
          tone: totalDestinos > 0 ? "blue" : "dark",
        },
      ],
      diagnostics: [
        {
          label: "Entrega",
          value: falhas > 0 ? "Revisar" : "Saudavel",
          detail:
            falhas > 0
              ? "Existem destinos com falha. Audite antes de disparar comunicados criticos."
              : "Nao ha falha de destino registrada no recorte atual.",
          tone: falhas > 0 ? "red" : "green",
          href: "/admin-master/logs",
        },
        {
          label: "Campanhas",
          value: "Conversao",
          detail:
            "Use notificações globais para avisos institucionais; campanha deve ter objetivo, período e público claros.",
          tone: "blue",
          href: "/admin-master/campanhas",
        },
        {
          label: "Nova mensagem",
          value: "Pronta",
          detail:
              "O botão de nova notificação abre o fluxo seguro para criar aviso em PT-BR e segmentar salões.",
          tone: "green",
          href: "/admin-master/notificacoes/nova",
        },
      ],
      rows,
      columns: [
        "titulo",
        "tipo",
        "publico",
        "status",
        "criada",
        "agendada",
        "enviada",
        "destinos",
        "leitura",
        "cliques",
        "sinal",
        "acao",
      ],
      actions: ["Nova notificacao", "Ver campanhas", "Abrir logs", "Auditar"],
    };
  }

  if (section === "campanhas") {
    const { data } = await supabase
      .from("campanhas")
      .select("id, nome, tipo, publico_tipo, objetivo, status, inicio_em, fim_em, criada_em")
      .order("criada_em", { ascending: false })
      .limit(100);

    const rows = ((data || []) as {
      id?: string | null;
      nome?: string | null;
      tipo?: string | null;
      publico_tipo?: string | null;
      objetivo?: string | null;
      status?: string | null;
      inicio_em?: string | null;
      fim_em?: string | null;
      criada_em?: string | null;
    }[]).map((item) => {
      const status = normalizeStatus(item.status);
      const diasInicio = daysUntil(item.inicio_em);
      const diasFim = daysUntil(item.fim_em);

      let sinal = "Monitorar resultado";
      if (!item.objetivo) sinal = "Definir objetivo";
      if (status === "rascunho") sinal = "Preparar publico";
      if (typeof diasInicio === "number" && diasInicio > 0) {
        sinal = `Comeca em ${diasInicio}d`;
      }
      if (typeof diasFim === "number" && diasFim < 0) {
        sinal = "Encerrada";
      }

      return {
        nome: item.nome || "-",
        tipo: item.tipo || "-",
        publico: item.publico_tipo || "-",
        objetivo: item.objetivo || "Sem objetivo",
        status: item.status || "-",
        inicio: dateValue(item.inicio_em),
        fim: dateValue(item.fim_em),
        sinal,
        acao: item.id ? "Detalhes" : "-",
        acao_tipo: item.id ? "campanha_detail" : null,
        acao_id: item.id || null,
      };
    });

    const ativas = rows.filter((row) => normalizeStatus(row.status) === "ativa").length;
    const rascunhos = rows.filter((row) => normalizeStatus(row.status) === "rascunho").length;
    const semObjetivo = rows.filter((row) => row.objetivo === "Sem objetivo").length;
    const futuras = rows.filter((row) => String(row.sinal).startsWith("Comeca")).length;

    return {
      title: "Campanhas",
      description:
        "Painel de crescimento com objetivo, publico, periodo e sinais de acao para campanhas comerciais.",
      kpis: [
        {
          label: "Campanhas",
          value: String(rows.length),
          hint: "Historico recente",
          tone: "dark",
        },
        {
          label: "Ativas",
          value: String(ativas),
          hint: "Em execucao",
          tone: ativas > 0 ? "green" : "dark",
        },
        {
          label: "Futuras",
          value: String(futuras),
          hint: "Agendadas para iniciar",
          tone: futuras > 0 ? "blue" : "dark",
        },
        {
          label: "Rascunhos",
          value: String(rascunhos),
          hint: "Precisam preparo",
          tone: rascunhos > 0 ? "amber" : "green",
        },
        {
          label: "Sem objetivo",
          value: String(semObjetivo),
          hint: "Nao da para medir campanha sem meta",
          tone: semObjetivo > 0 ? "red" : "green",
        },
      ],
      diagnostics: [
        {
          label: "Regra de qualidade",
          value: semObjetivo > 0 ? "Ajustar" : "Ok",
          detail:
            semObjetivo > 0
              ? "Campanha sem objetivo vira disparo solto. Defina conversão, retenção ou recuperação antes de ativar."
              : "As campanhas listadas possuem objetivo registrado.",
          tone: semObjetivo > 0 ? "amber" : "green",
        },
        {
            label: "Notificações",
          value: "Canal",
          detail:
            "Campanha precisa conversar com notificações globais, WhatsApp e métricas para não virar página sem efeito.",
          tone: "blue",
          href: "/admin-master/notificacoes",
        },
        {
          label: "Relatorios",
          value: "Medir",
          detail:
            "Depois de publicar, acompanhe salões impactados, leitura e conversão no painel de relatórios.",
          tone: "dark",
          href: "/admin-master/relatorios",
        },
      ],
      rows,
      columns: ["nome", "tipo", "publico", "objetivo", "status", "inicio", "fim", "sinal", "acao"],
       actions: ["Ver notificações", "Abrir relatórios", "Auditar"],
    };
  }

  if (section === "whatsapp") {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ data: envios }, { data: filas }, { data: saldos }, { data: templates }] =
      await Promise.all([
        supabase
          .from("whatsapp_envios")
          .select(
            "id, id_salao, tipo, destino, template, status, custo_creditos, erro_texto, criado_em, enviado_em"
          )
          .order("criado_em", { ascending: false })
          .limit(120),
        supabase
          .from("whatsapp_filas")
          .select("id, id_salao, status, tentativas, ultimo_erro, criado_em, processado_em")
          .order("criado_em", { ascending: false })
          .limit(120),
        supabase
          .from("whatsapp_pacote_saloes")
          .select("id, id_salao, creditos_total, creditos_usados, creditos_saldo, status, expira_em")
          .order("comprado_em", { ascending: false })
          .limit(200),
        supabase
          .from("whatsapp_templates")
          .select("id, nome, categoria, ativo, criado_em")
          .order("criado_em", { ascending: false })
          .limit(80),
      ]);

    const salaoIds = Array.from(
      new Set(
        [
          ...((envios || []) as { id_salao?: string | null }[]).map((row) => row.id_salao),
          ...((filas || []) as { id_salao?: string | null }[]).map((row) => row.id_salao),
          ...((saldos || []) as { id_salao?: string | null }[]).map((row) => row.id_salao),
        ].filter(Boolean)
      )
    ) as string[];
    const { data: saloes } = salaoIds.length
      ? await supabase.from("saloes").select("id, nome").in("id", salaoIds).limit(salaoIds.length)
      : { data: [] as Array<{ id: string; nome?: string | null }> };
    const salaoById = new Map(
      ((saloes || []) as { id: string; nome?: string | null }[]).map((salao) => [
        salao.id,
        salao.nome || salao.id,
      ])
    );

    type WhatsAppAdminRow = AdminTableRow & { _sort: string };
    const envioRows = ((envios || []) as {
      id?: string | null;
      id_salao?: string | null;
      tipo?: string | null;
      destino?: string | null;
      template?: string | null;
      status?: string | null;
      custo_creditos?: number | null;
      erro_texto?: string | null;
      criado_em?: string | null;
      enviado_em?: string | null;
    }[]).map((row): WhatsAppAdminRow => ({
      _sort: row.criado_em || "",
      tipo: "envio",
      salao: row.id_salao ? salaoById.get(row.id_salao) || row.id_salao : "-",
      status: row.status || "-",
      destino: row.destino || "-",
      detalhe: row.erro_texto || row.template || row.tipo || "-",
      creditos: row.custo_creditos || 0,
      criado: dateTimeValue(row.criado_em),
      sinal: row.erro_texto ? "Falha de envio" : row.enviado_em ? "Enviado" : "Aguardando",
      acao: row.id ? "Detalhes" : row.id_salao ? "Abrir salao" : "-",
      acao_tipo: row.id ? "whatsapp_detail" : row.id_salao ? "salao_detail" : null,
      acao_id: row.id ? `envio:${row.id}` : row.id_salao || null,
    }));
    const filaRows = ((filas || []) as {
      id?: string | null;
      id_salao?: string | null;
      status?: string | null;
      tentativas?: number | null;
      ultimo_erro?: string | null;
      criado_em?: string | null;
      processado_em?: string | null;
    }[]).map((row): WhatsAppAdminRow => ({
      _sort: row.criado_em || "",
      tipo: "fila",
      salao: row.id_salao ? salaoById.get(row.id_salao) || row.id_salao : "-",
      status: row.status || "-",
      destino: "-",
      detalhe: row.ultimo_erro || `${row.tentativas || 0} tentativa(s)`,
      creditos: 0,
      criado: dateTimeValue(row.criado_em),
      sinal: row.ultimo_erro ? "Reprocessar" : row.processado_em ? "Processada" : "Pendente",
      acao: row.id ? "Detalhes" : row.id_salao ? "Abrir salao" : "-",
      acao_tipo: row.id ? "whatsapp_detail" : row.id_salao ? "salao_detail" : null,
      acao_id: row.id ? `fila:${row.id}` : row.id_salao || null,
    }));
    const saldoRows = ((saldos || []) as {
      id_salao?: string | null;
      id?: string | null;
      creditos_total?: number | null;
      creditos_usados?: number | null;
      creditos_saldo?: number | null;
      status?: string | null;
      expira_em?: string | null;
    }[])
      .filter((row) => safeNumber(row.creditos_saldo) <= 10 || normalizeStatus(row.status) !== "ativo")
      .map((row): WhatsAppAdminRow => ({
        _sort: row.expira_em || "",
        tipo: "saldo",
        salao: row.id_salao ? salaoById.get(row.id_salao) || row.id_salao : "-",
        status: row.status || "-",
        destino: "-",
        detalhe: `Saldo ${row.creditos_saldo || 0} de ${row.creditos_total || 0}`,
        creditos: row.creditos_usados || 0,
        criado: dateValue(row.expira_em),
        sinal: safeNumber(row.creditos_saldo) <= 10 ? "Créditos baixos" : "Acompanhar",
        acao: row.id ? "Detalhes" : row.id_salao ? "Abrir salao" : "-",
        acao_tipo: row.id ? "whatsapp_detail" : row.id_salao ? "salao_detail" : null,
        acao_id: row.id ? `saldo:${row.id}` : row.id_salao || null,
      }));
    const rows = [...filaRows, ...saldoRows, ...envioRows]
      .sort((a, b) => String(b._sort).localeCompare(String(a._sort)))
      .slice(0, 140)
      .map(({ _sort: _sort, ...row }) => row);

    const envios24h = envioRows.filter((row) => String(row._sort) >= last24h).length;
    const falhas24h = envioRows.filter(
      (row) => String(row._sort) >= last24h && String(row.sinal) === "Falha de envio"
    ).length;
    const filaPendente = filaRows.filter((row) =>
      ["pendente", "retry", "erro"].includes(normalizeStatus(row.status))
    ).length;
    const saldosBaixos = saldoRows.filter((row) => row.sinal === "Créditos baixos").length;
    const templatesAtivos = ((templates || []) as { ativo?: boolean | null }[]).filter(
      (template) => template.ativo !== false
    ).length;

    return {
      title: "WhatsApp e pacotes",
      description:
        "Controle de envios, filas, saldo de creditos, templates e riscos de comunicacao por salao.",
      kpis: [
        {
          label: "Envios 24h",
          value: String(envios24h),
          hint: "Mensagens recentes",
          tone: "blue",
        },
        {
          label: "Falhas 24h",
          value: String(falhas24h),
          hint: "Precisam auditoria",
          tone: falhas24h > 0 ? "red" : "green",
        },
        {
          label: "Fila pendente",
          value: String(filaPendente),
          hint: "Mensagens ainda nao processadas",
          tone: filaPendente > 0 ? "amber" : "green",
        },
        {
          label: "Saldo baixo",
          value: String(saldosBaixos),
          hint: "Salões com até 10 créditos",
          tone: saldosBaixos > 0 ? "amber" : "green",
        },
        {
          label: "Templates ativos",
          value: String(templatesAtivos),
          hint: "Modelos prontos para uso",
          tone: templatesAtivos > 0 ? "green" : "amber",
        },
      ],
      diagnostics: [
        {
          label: "Fila",
          value: filaPendente > 0 ? "Acompanhar" : "Ok",
          detail:
            filaPendente > 0
              ? "Existe fila pendente ou com erro. Revise antes de prometer disparo para o salao."
              : "Fila de WhatsApp sem pendencia critica no recorte atual.",
          tone: filaPendente > 0 ? "amber" : "green",
          href: "/admin-master/logs",
        },
        {
          label: "Créditos",
          value: `${saldosBaixos} baixo(s)`,
          detail:
            "Salões com poucos créditos podem parar comunicação automática; use pacotes antes de falhar atendimento.",
          tone: saldosBaixos > 0 ? "amber" : "green",
          href: "/admin-master/whatsapp/pacotes",
        },
        {
          label: "Templates",
          value: String(templatesAtivos),
          detail:
            "Templates ativos reduzem erro de texto e ajudam padronizar avisos de agenda, recuperacao e campanhas.",
          tone: templatesAtivos > 0 ? "blue" : "amber",
          href: "/admin-master/whatsapp/templates",
        },
      ],
      rows,
      columns: [
        "tipo",
        "salao",
        "status",
        "destino",
        "detalhe",
        "creditos",
        "criado",
        "sinal",
        "acao",
      ],
      actions: ["Ver pacotes WhatsApp", "Ver templates WhatsApp", "Abrir logs", "Auditar"],
    };
  }

  if (section === "feature-flags") {
    const [{ data: flags }, { data: releases }] = await Promise.all([
      supabase
        .from("feature_flags")
        .select("id, nome, descricao, status_global, tipo_liberacao, planos_json, data_inicio, data_fim, criado_em")
        .order("criado_em", { ascending: false })
        .limit(100),
      supabase
        .from("feature_flag_saloes")
        .select("id_feature_flag, id_salao, ativo, criado_em")
        .limit(1000),
    ]);

    const releasesByFlag = new Map<string, { total: number; ativos: number }>();
    for (const release of (releases || []) as {
      id_feature_flag?: string | null;
      ativo?: boolean | null;
    }[]) {
      if (!release.id_feature_flag) continue;
      const current = releasesByFlag.get(release.id_feature_flag) || { total: 0, ativos: 0 };
      current.total += 1;
      if (release.ativo !== false) current.ativos += 1;
      releasesByFlag.set(release.id_feature_flag, current);
    }

    const rows = ((flags || []) as {
      id?: string | null;
      nome?: string | null;
      descricao?: string | null;
      status_global?: boolean | null;
      tipo_liberacao?: string | null;
      planos_json?: unknown;
      data_inicio?: string | null;
      data_fim?: string | null;
      criado_em?: string | null;
    }[]).map((flag) => {
      const stats = flag.id ? releasesByFlag.get(flag.id) : null;
      const fim = daysUntil(flag.data_fim);
      const planos = Array.isArray(flag.planos_json)
        ? flag.planos_json.join(", ")
        : summarizeSafeJson(flag.planos_json);
      let sinal = "Controlada";

      if (flag.status_global) sinal = "Global ativa";
      if (flag.tipo_liberacao === "salao" && !stats?.ativos) sinal = "Sem salao liberado";
      if (typeof fim === "number" && fim < 0) sinal = "Janela expirada";
      if (typeof fim === "number" && fim >= 0 && fim <= 7) sinal = `Expira em ${fim}d`;

      return {
        recurso: flag.nome || "-",
        liberacao: flag.tipo_liberacao || "-",
        global: flag.status_global ? "Ativa" : "Nao",
        planos: planos || "-",
        saloes: stats?.ativos || 0,
        inicio: dateValue(flag.data_inicio),
        fim: dateValue(flag.data_fim),
        sinal,
        detalhe: flag.descricao || "-",
        acao: "Auditar",
      };
    });

    const globais = rows.filter((row) => row.global === "Ativa").length;
    const expiradas = rows.filter((row) => row.sinal === "Janela expirada").length;
    const semSalao = rows.filter((row) => row.sinal === "Sem salao liberado").length;
    const expirando = rows.filter((row) => String(row.sinal).startsWith("Expira em")).length;

    return {
      title: "Feature flags",
      description:
        "Controle de liberações por plano, salão e janela de teste para evitar recurso solto em produção.",
      kpis: [
        { label: "Flags", value: String(rows.length), hint: "Recursos cadastrados", tone: "dark" },
        { label: "Globais", value: String(globais), hint: "Ativas para todos", tone: globais > 0 ? "amber" : "green" },
        { label: "Expiradas", value: String(expiradas), hint: "Janela terminou", tone: expiradas > 0 ? "red" : "green" },
        { label: "Expirando", value: String(expirando), hint: "Proximos 7 dias", tone: expirando > 0 ? "amber" : "green" },
        { label: "Sem salao", value: String(semSalao), hint: "Flag por salao sem destino", tone: semSalao > 0 ? "amber" : "green" },
      ],
      diagnostics: [
        {
          label: "Risco de produção",
          value: globais > 0 ? "Acompanhar" : "Baixo",
          detail:
            "Flag global altera todos os saloes. Use apenas quando o recurso ja passou por teste controlado.",
          tone: globais > 0 ? "amber" : "green",
        },
        {
          label: "Limpeza",
          value: `${expiradas} expirada(s)`,
          detail:
            expiradas > 0
              ? "Revise flags com data final vencida para nao deixar regra antiga interferindo no sistema."
              : "Nenhuma janela expirada no recorte atual.",
          tone: expiradas > 0 ? "red" : "green",
          href: "/admin-master/logs",
        },
        {
          label: "Matriz de recursos",
          value: "Planos",
          detail:
            "Quando uma flag virar recurso fixo, mova para planos/recursos em vez de manter excecao manual.",
          tone: "blue",
          href: "/admin-master/recursos",
        },
      ],
      rows,
      columns: ["recurso", "liberacao", "global", "planos", "saloes", "inicio", "fim", "sinal", "detalhe", "acao"],
      actions: ["Ajustar matriz de recursos", "Abrir logs", "Auditar"],
    };
  }

  if (section === "usuarios-admin") {
    const [{ data: admins }, { data: permissions }, { data: audits }] = await Promise.all([
      supabase
        .from("admin_master_usuarios")
        .select("id, nome, email, perfil, status, ultimo_acesso_em, criado_em, atualizado_em")
        .order("atualizado_em", { ascending: false })
        .limit(100),
      supabase
        .from("admin_master_permissoes")
        .select(
          "id, id_admin_master_usuario, dashboard_ver, saloes_ver, saloes_editar, saloes_entrar_como, financeiro_ver, relatorios_ver, assinaturas_ver, assinaturas_ajustar, cobrancas_ver, cobrancas_reprocessar, planos_editar, recursos_editar, produto_ver, operacao_ver, operacao_reprocessar, tickets_ver, tickets_editar, suporte_ver, notificacoes_editar, campanhas_editar, comunicacao_ver, whatsapp_ver, whatsapp_editar, feature_flags_editar, usuarios_admin_ver, usuarios_admin_editar, auditoria_ver, criado_em, atualizado_em"
        )
        .limit(200),
      supabase
        .from("admin_master_auditoria")
        .select("id_admin_usuario, acao, criado_em")
        .order("criado_em", { ascending: false })
        .limit(300),
    ]);

    const permissionsByAdmin = new Map(
      ((permissions || []) as Record<string, unknown>[]).map((row) => [
        String(row.id_admin_master_usuario || ""),
        row,
      ])
    );
    const auditCountByAdmin = new Map<string, number>();
    for (const audit of (audits || []) as { id_admin_usuario?: string | null }[]) {
      if (!audit.id_admin_usuario) continue;
      auditCountByAdmin.set(
        audit.id_admin_usuario,
        (auditCountByAdmin.get(audit.id_admin_usuario) || 0) + 1
      );
    }

    const rows = ((admins || []) as {
      id?: string | null;
      nome?: string | null;
      email?: string | null;
      perfil?: string | null;
      status?: string | null;
      ultimo_acesso_em?: string | null;
      criado_em?: string | null;
      atualizado_em?: string | null;
    }[]).map((admin) => {
      const perms = admin.id ? permissionsByAdmin.get(admin.id) : null;
      const enabled = perms ? countEnabledPermissions(perms) : 0;
      const lastAccessDays = daysUntil(admin.ultimo_acesso_em);
      let sinal = "Ok";

      if (normalizeStatus(admin.status) !== "ativo") sinal = "Sem acesso ativo";
      else if (!perms) sinal = "Sem permissoes";
      else if (enabled >= 22) sinal = "Acesso amplo";
      else if (typeof lastAccessDays === "number" && lastAccessDays < -30) sinal = "Inativo ha 30d";

      return {
        nome: admin.nome || "-",
        email: admin.email || "-",
        perfil: admin.perfil || "-",
        status: admin.status || "-",
        permissoes: enabled,
        auditoria: admin.id ? auditCountByAdmin.get(admin.id) || 0 : 0,
        ultimo_acesso: dateTimeValue(admin.ultimo_acesso_em),
        atualizado: dateTimeValue(admin.atualizado_em),
        sinal,
        acao: "Auditar",
      };
    });

    const ativos = rows.filter((row) => normalizeStatus(row.status) === "ativo").length;
    const acessoAmplo = rows.filter((row) => row.sinal === "Acesso amplo").length;
    const semPermissoes = rows.filter((row) => row.sinal === "Sem permissoes").length;
    const inativos = rows.filter((row) => row.sinal === "Inativo ha 30d").length;

    return {
      title: "Usuarios AdminMaster",
      description:
        "Governanca de admins internos com status, permissoes habilitadas, auditoria recente e risco de acesso.",
      kpis: [
        { label: "Admins", value: String(rows.length), hint: "Usuarios internos", tone: "dark" },
        { label: "Ativos", value: String(ativos), hint: "Podem acessar", tone: "green" },
        { label: "Acesso amplo", value: String(acessoAmplo), hint: "Permissoes sensiveis", tone: acessoAmplo > 0 ? "amber" : "green" },
        { label: "Sem permissao", value: String(semPermissoes), hint: "Cadastro incompleto", tone: semPermissoes > 0 ? "red" : "green" },
        { label: "Inativos", value: String(inativos), hint: "Sem acesso ha 30 dias", tone: inativos > 0 ? "amber" : "green" },
      ],
      diagnostics: [
        {
          label: "Seguranca",
          value: `${acessoAmplo} amplo(s)`,
          detail:
            "Admins com acesso amplo devem ser poucos e auditados. Eles podem mexer em salões, cobranças, planos e usuários.",
          tone: acessoAmplo > 0 ? "amber" : "green",
        },
        {
          label: "Cadastro",
          value: `${semPermissoes} incompleto(s)`,
          detail:
            semPermissoes > 0
              ? "Usuario sem permissao vira erro de acesso. Ajuste antes de pedir que ele investigue chamados."
              : "Todos os admins listados possuem matriz de permissao.",
          tone: semPermissoes > 0 ? "red" : "green",
        },
        {
          label: "Auditoria",
          value: "Obrigatoria",
          detail:
            "Toda ação sensível do AdminMaster deve deixar trilha para diagnóstico e responsabilização.",
          tone: "blue",
          href: "/admin-master/logs",
        },
      ],
      rows,
      columns: ["nome", "email", "perfil", "status", "permissoes", "auditoria", "ultimo_acesso", "atualizado", "sinal", "acao"],
      actions: ["Ver logs", "Auditar"],
    };
  }

  if (section === "configuracoes-globais") {
    const [{ data: configs }, { data: history }, { data: admins }] = await Promise.all([
      supabase
        .from("configuracoes_globais")
        .select("id, chave, descricao, valor_json, atualizado_por, atualizado_em")
        .order("atualizado_em", { ascending: false })
        .limit(120),
      supabase
        .from("configuracoes_globais_historico")
        .select("chave, atualizado_por, atualizado_em")
        .order("atualizado_em", { ascending: false })
        .limit(250),
      supabase
        .from("admin_master_usuarios")
        .select("id, nome")
        .limit(200),
    ]);

    const adminById = new Map(
      ((admins || []) as { id: string; nome?: string | null }[]).map((admin) => [
        admin.id,
        admin.nome || admin.id,
      ])
    );
    const changesByKey = new Map<string, number>();
    for (const item of (history || []) as { chave?: string | null }[]) {
      if (!item.chave) continue;
      changesByKey.set(item.chave, (changesByKey.get(item.chave) || 0) + 1);
    }

    const sensitiveWords = ["manutencao", "bloqueio", "webhook", "asaas", "resend", "push", "seguranca", "auth"];
    const rows = ((configs || []) as {
      chave?: string | null;
      descricao?: string | null;
      valor_json?: unknown;
      atualizado_por?: string | null;
      atualizado_em?: string | null;
    }[]).map((config) => {
      const chave = config.chave || "-";
      const isSensitive = sensitiveWords.some((word) => chave.toLowerCase().includes(word));
      const changes = changesByKey.get(chave) || 0;
      const updatedDays = daysUntil(config.atualizado_em);
      let sinal = isSensitive ? "Sensivel" : "Ok";

      if (changes >= 5) sinal = "Mudanca frequente";
      if (typeof updatedDays === "number" && updatedDays < -90) sinal = "Revisar validade";

      return {
        chave,
        descricao: config.descricao || "-",
        valor: summarizeSafeJson(config.valor_json),
        alteracoes: changes,
        atualizado_por: config.atualizado_por ? adminById.get(config.atualizado_por) || "-" : "-",
        atualizado: dateTimeValue(config.atualizado_em),
        sinal,
        acao: "Auditar",
      };
    });

    const sensiveis = rows.filter((row) => row.sinal === "Sensivel").length;
    const frequentes = rows.filter((row) => row.sinal === "Mudanca frequente").length;
    const revisar = rows.filter((row) => row.sinal === "Revisar validade").length;

    return {
        title: "Configurações globais",
        description:
         "Controle de chaves globais, histórico de alterações, configurações sensíveis e validade operacional.",
      kpis: [
        { label: "Configs", value: String(rows.length), hint: "Chaves globais", tone: "dark" },
        { label: "Sensíveis", value: String(sensiveis), hint: "Podem afetar produção", tone: sensiveis > 0 ? "amber" : "green" },
        { label: "Mudanca frequente", value: String(frequentes), hint: "Historico movimentado", tone: frequentes > 0 ? "amber" : "green" },
        { label: "Revisar", value: String(revisar), hint: "Sem ajuste ha 90 dias", tone: revisar > 0 ? "blue" : "green" },
        { label: "Historico", value: String((history || []).length), hint: "Ultimas alteracoes", tone: "blue" },
      ],
      diagnostics: [
        {
          label: "Segredos",
          value: "Mascarados",
          detail:
            "Valores com token, senha, secret ou api_key aparecem mascarados para reduzir vazamento visual no suporte.",
          tone: "green",
        },
        {
          label: "Mudanca critica",
          value: `${sensiveis} sensível(is)`,
          detail:
            "Config global sensível deve ter motivo, horário e responsável claros antes de mexer em produção.",
          tone: sensiveis > 0 ? "amber" : "green",
          href: "/admin-master/logs",
        },
        {
          label: "Historico",
          value: "Rastreavel",
          detail:
            "O historico ajuda descobrir quem alterou comportamento global quando saloes relatam instabilidade.",
          tone: "blue",
        },
      ],
      rows,
      columns: ["chave", "descricao", "valor", "alteracoes", "atualizado_por", "atualizado", "sinal", "acao"],
      actions: ["Ver logs", "Auditar"],
    };
  }

  if (section === "assinaturas") {
    const { data } = await supabase
      .from("assinaturas")
      .select(
        "id, id_salao, plano, status, valor, vencimento_em, trial_fim_em, renovacao_automatica, asaas_customer_id, forma_pagamento_atual, asaas_credit_card_token, asaas_subscription_id"
      )
      .order("updated_at", { ascending: false })
      .limit(100);

    const assinaturaRows =
      ((data || []) as {
        id_salao?: string | null;
        plano?: string | null;
        status?: string | null;
        valor?: number | string | null;
        vencimento_em?: string | null;
        trial_fim_em?: string | null;
        renovacao_automatica?: boolean | null;
        asaas_customer_id?: string | null;
        forma_pagamento_atual?: string | null;
        asaas_credit_card_token?: string | null;
        asaas_subscription_id?: string | null;
      }[]) || [];
    const salaoIds = Array.from(
      new Set(assinaturaRows.map((item) => item.id_salao).filter(Boolean))
    ) as string[];

    const [{ data: saloes }, { data: cobrancas }] = await Promise.all([
      salaoIds.length
        ? supabase.from("saloes").select("id, nome").in("id", salaoIds).limit(salaoIds.length)
        : Promise.resolve({ data: [] as Array<{ id: string; nome?: string | null }> }),
      salaoIds.length
        ? supabase
            .from("assinaturas_cobrancas")
            .select("id_salao, status, data_expiracao, pago_em, created_at")
            .in("id_salao", salaoIds)
            .order("created_at", { ascending: false })
            .limit(300)
        : Promise.resolve({
            data: [] as Array<{
              id_salao?: string | null;
              status?: string | null;
              data_expiracao?: string | null;
              pago_em?: string | null;
              created_at?: string | null;
            }>,
          }),
    ]);

    const salaoById = new Map(
      ((saloes || []) as { id: string; nome?: string | null }[]).map((salao) => [
        salao.id,
        salao.nome || salao.id,
      ])
    );
    const latestChargeBySalao = new Map<
      string,
      {
        status?: string | null;
        data_expiracao?: string | null;
        pago_em?: string | null;
      }
    >();
    const pendingChargeCountBySalao = new Map<string, number>();

    for (const cobranca of (cobrancas || []) as {
      id_salao?: string | null;
      status?: string | null;
      data_expiracao?: string | null;
      pago_em?: string | null;
    }[]) {
      if (!cobranca.id_salao) continue;

      if (!latestChargeBySalao.has(cobranca.id_salao)) {
        latestChargeBySalao.set(cobranca.id_salao, cobranca);
      }

      if (PENDING_CHARGE_STATUSES.has(normalizeStatus(cobranca.status))) {
        pendingChargeCountBySalao.set(
          cobranca.id_salao,
          (pendingChargeCountBySalao.get(cobranca.id_salao) || 0) + 1
        );
      }
    }

    const parsedRows = assinaturaRows.map((item) => {
      const idSalao = item.id_salao || null;
      const status = normalizeStatus(item.status);
      const vencimentoBase = item.vencimento_em || item.trial_fim_em || null;
      const diasParaVencer = daysUntil(vencimentoBase);
      const renovacaoInfo = getRenovacaoAutomaticaInfo({
        assinaturaExiste: true,
        asaasCustomerId: item.asaas_customer_id,
        formaPagamentoAtual: item.forma_pagamento_atual,
        renovacaoAutomatica: item.renovacao_automatica,
        asaasCreditCardToken: item.asaas_credit_card_token,
        asaasSubscriptionId: item.asaas_subscription_id,
      });
      const pendingCharges = idSalao
        ? pendingChargeCountBySalao.get(idSalao) || 0
        : 0;
      const latestCharge = idSalao ? latestChargeBySalao.get(idSalao) : null;
      const latestChargeStatus = normalizeStatus(latestCharge?.status);

      let risco = "Saudavel";
      let acao = idSalao ? "Abrir salao" : "-";
      let acaoTipo: string | null = idSalao ? "salao_detail" : null;

      if (RISK_SUBSCRIPTION_STATUSES.has(status)) {
        risco = "Status critico";
        acao = idSalao ? "Criar ticket" : "-";
        acaoTipo = idSalao ? "salao_ticket_assinatura" : null;
      } else if (
        item.renovacao_automatica &&
        !renovacaoInfo.estaProntaParaCobranca
      ) {
        risco = "Auto-renovacao com ajuste";
        acao = idSalao ? "Criar ticket" : "-";
        acaoTipo = idSalao ? "salao_ticket_assinatura" : null;
      } else if (diasParaVencer !== null && diasParaVencer < 0) {
        risco = `Vencida ha ${Math.abs(diasParaVencer)}d`;
        acao = idSalao ? "Criar ticket" : "-";
        acaoTipo = idSalao ? "salao_ticket_assinatura" : null;
      } else if (pendingCharges > 0) {
        risco =
          pendingCharges === 1
            ? "1 cobrança pendente"
            : `${pendingCharges} cobranças pendentes`;
      } else if (diasParaVencer !== null && diasParaVencer === 0) {
        risco = "Vence hoje";
      } else if (diasParaVencer !== null && diasParaVencer <= 7) {
        risco = `Vence em ${diasParaVencer}d`;
      } else if (
        !item.renovacao_automatica &&
        diasParaVencer !== null &&
        diasParaVencer <= 15
      ) {
        risco = "Sem renovacao automatica";
      }

      const proximaAcao = (() => {
        if (RISK_SUBSCRIPTION_STATUSES.has(status)) return "Abrir ticket e revisar acesso";
        if (diasParaVencer !== null && diasParaVencer < 0) return "Cobrar e validar bloqueio";
        if (item.renovacao_automatica && !renovacaoInfo.estaProntaParaCobranca) {
          return "Corrigir renovacao automatica";
        }
        if (pendingCharges > 0) return "Acompanhar cobrança pendente";
        if (!item.renovacao_automatica && diasParaVencer !== null && diasParaVencer <= 15) {
          return "Ativar renovacao ou avisar salao";
        }
        if (diasParaVencer !== null && diasParaVencer <= 7) return "Confirmar pagamento";
        return "Monitorar";
      })();

      let cobranca = "-";
      if (latestCharge) {
        if (PENDING_CHARGE_STATUSES.has(latestChargeStatus)) {
          cobranca = `Pendente até ${dateValue(latestCharge.data_expiracao)}`;
        } else if (PAID_CHARGE_STATUSES.has(latestChargeStatus)) {
          cobranca = `Paga em ${dateValue(latestCharge.pago_em)}`;
        } else {
          cobranca = `${latestCharge.status || "Sem status"} ${dateValue(
            latestCharge.data_expiracao
          )}`;
        }
      }

      return {
        salao: idSalao ? salaoById.get(idSalao) || idSalao : "-",
        plano: item.plano || "-",
        status: item.status || "-",
        valor: currency(safeNumber(item.valor)),
        vencimento: dateValue(vencimentoBase),
        renovacao: item.renovacao_automatica
          ? renovacaoInfo.estaProntaParaCobranca
            ? "Ativa"
            : "Ativa com ajuste"
          : "Desativada",
        cobranca,
        risco,
        proxima_acao: proximaAcao,
        acao,
        acao_tipo: acaoTipo,
        acao_id: idSalao,
        _dias_para_vencer: diasParaVencer,
        _valor_numero: safeNumber(item.valor),
      };
    });

    const rows = parsedRows.map(
      ({ _dias_para_vencer: _diasParaVencer, _valor_numero: _valorNumero, ...row }) => row
    );
    const vencendoSeteDias = parsedRows.filter((row) => {
      const diasParaVencer = row._dias_para_vencer;
      return typeof diasParaVencer === "number" && diasParaVencer >= 0 && diasParaVencer <= 7;
    }).length;
    const emRisco = parsedRows.filter(
      (row) => row.acao_tipo === "salao_ticket_assinatura"
    ).length;
    const valorEmRisco = parsedRows
      .filter((row) => row.acao_tipo === "salao_ticket_assinatura")
      .reduce((acc, row) => acc + safeNumber(row._valor_numero), 0);
    const renovacaoComAjuste = parsedRows.filter(
      (row) => row.risco === "Auto-renovacao com ajuste"
    ).length;
    const semRenovacaoProxima = parsedRows.filter(
      (row) => row.risco === "Sem renovacao automatica"
    ).length;
    const mrr = ((data || []) as { status?: string | null; valor?: number | string | null }[])
      .filter((item) => ACTIVE_SUBSCRIPTION_STATUSES.has(normalizeStatus(item.status)))
      .reduce((acc, item) => acc + safeNumber(item.valor), 0);

    return {
      title: "Assinaturas",
      description:
        "Status comercial do SaaS com urgência por vencimento, cobrança e atalho direto para atuar no salão.",
      kpis: [
        {
          label: "Assinaturas",
          value: String(rows.length),
          hint: "Ultimas atualizadas",
          tone: "dark",
        },
        {
          label: "Ativas",
          value: String(
            rows.filter((row) =>
              ACTIVE_SUBSCRIPTION_STATUSES.has(normalizeStatus(row.status))
            ).length
          ),
          hint: "Liberadas",
          tone: "green",
        },
        {
          label: "Vencendo 7 dias",
          value: String(vencendoSeteDias),
          hint: "Janela para agir antes da ruptura",
          tone: vencendoSeteDias > 0 ? "amber" : "green",
        },
        {
          label: "Em risco",
          value: String(emRisco),
          hint: `${currency(valorEmRisco)} expostos`,
          tone: "red",
        },
        {
          label: "MRR visivel",
          value: currency(mrr),
          hint: "Base ativa acompanhada daqui",
          tone: "blue",
        },
      ],
      diagnostics: [
        {
          label: "Retencao",
          value: `${emRisco} em risco`,
          detail:
            "Assinatura em risco deve virar ticket antes de bloqueio, churn ou perda de receita recorrente.",
          tone: emRisco > 0 ? "red" : "green",
          href: "/admin-master/suporte",
        },
        {
          label: "Vencimento",
          value: `${vencendoSeteDias} em 7d`,
          detail:
            "A janela de sete dias e a melhor hora para confirmar pagamento, cartao e renovacao automatica.",
          tone: vencendoSeteDias > 0 ? "amber" : "green",
          href: "/admin-master/assinaturas/cobrancas",
        },
        {
          label: "MRR",
          value: currency(mrr),
          detail:
            "Este valor considera assinaturas ativas/pagas e ajuda a validar se planos e cobranças estão conversando.",
          tone: "blue",
          href: "/admin-master/financeiro",
        },
        {
          label: "Renovação automática",
          value: `${renovacaoComAjuste} ajuste(s)`,
          detail:
            semRenovacaoProxima > 0
              ? `${semRenovacaoProxima} assinatura(s) vencem em até 15 dias sem renovação automática.`
              : "Sem assinatura proxima exigindo troca manual de renovacao.",
          tone: renovacaoComAjuste || semRenovacaoProxima ? "amber" : "green",
          href: "/admin-master/assinaturas/cobrancas",
        },
      ],
      rows,
      columns: [
        "salao",
        "plano",
        "status",
        "valor",
        "vencimento",
        "renovacao",
        "cobranca",
        "risco",
        "proxima_acao",
        "acao",
      ],
      actions: [
        "Abrir saloes",
        "Abrir cobranças",
        "Abrir planos",
        "Abrir financeiro",
      ],
    };
  }

  if (section === "cobrancas") {
    const [{ data: cobrancas }, { data: checkoutLocks }] = await Promise.all([
      supabase
        .from("assinaturas_cobrancas")
        .select(
          "id, id_salao, referencia, valor, status, forma_pagamento, gateway, data_expiracao, pago_em, created_at, asaas_payment_id, txid, idempotency_key"
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("assinatura_checkout_locks")
        .select(
          "id, id_salao, plano_codigo, billing_type, valor, idempotency_key, status, id_cobranca, asaas_payment_id, erro_texto, expires_at, created_at, updated_at"
        )
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const salaoIds = Array.from(
      new Set(
        [
          ...((cobrancas || []) as { id_salao?: string | null }[]).map((item) => item.id_salao),
          ...((checkoutLocks || []) as { id_salao?: string | null }[]).map(
            (item) => item.id_salao
          ),
        ].filter(Boolean)
      )
    ) as string[];
    const { data: saloes } = salaoIds.length
      ? await supabase.from("saloes").select("id, nome").in("id", salaoIds).limit(salaoIds.length)
      : { data: [] as Array<{ id: string; nome?: string | null }> };

    const salaoById = new Map(
      ((saloes || []) as { id: string; nome?: string | null }[]).map((salao) => [
        salao.id,
        salao.nome || salao.id,
      ])
    );

    type AdminCobrancaRow = AdminTableRow & { _sort: string };

    const cobrancaRows = ((cobrancas || []) as {
      id_salao?: string | null;
      referencia?: string | null;
      valor?: number | string | null;
      status?: string | null;
      forma_pagamento?: string | null;
      gateway?: string | null;
      data_expiracao?: string | null;
      pago_em?: string | null;
      created_at?: string | null;
      asaas_payment_id?: string | null;
      txid?: string | null;
      idempotency_key?: string | null;
    }[]).map((item): AdminCobrancaRow => ({
      _sort: item.created_at || "",
      tipo: "cobranca",
      salao: item.id_salao ? salaoById.get(item.id_salao) || item.id_salao : "-",
      referencia: item.referencia || "-",
      valor: currency(safeNumber(item.valor)),
      status: item.status || "-",
      forma: item.forma_pagamento || "-",
      gateway: item.gateway || "-",
      expira: dateValue(item.data_expiracao),
      criado: dateTimeValue(item.created_at),
      pago: dateValue(item.pago_em),
      sinal: (() => {
        const status = normalizeStatus(item.status);
        const diasParaExpirar = daysUntil(item.data_expiracao);

        if (PAID_CHARGE_STATUSES.has(status)) return "Recebida";
        if (
          PENDING_CHARGE_STATUSES.has(status) &&
          typeof diasParaExpirar === "number" &&
          diasParaExpirar < 0
        ) {
          return `Vencida ha ${Math.abs(diasParaExpirar)}d`;
        }
        if (
          PENDING_CHARGE_STATUSES.has(status) &&
          typeof diasParaExpirar === "number" &&
          diasParaExpirar === 0
        ) {
          return "Vence hoje";
        }
        if (
          PENDING_CHARGE_STATUSES.has(status) &&
          typeof diasParaExpirar === "number" &&
          diasParaExpirar > 0
        ) {
          return `Vence em ${diasParaExpirar}d`;
        }
        if (PENDING_CHARGE_STATUSES.has(status)) return "Aguardando pagamento";
        return "Acompanhar";
      })(),
      detalhe:
        item.asaas_payment_id ||
        item.txid ||
        item.idempotency_key ||
        "-",
      acao: (() => {
        const status = normalizeStatus(item.status);
        const diasParaExpirar = daysUntil(item.data_expiracao);
        const atrasada =
          PENDING_CHARGE_STATUSES.has(status) &&
          typeof diasParaExpirar === "number" &&
          diasParaExpirar < 0;

        if (atrasada && item.id_salao) return "Criar ticket";
        if (item.id_salao) return "Abrir salao";
        return "-";
      })(),
      acao_tipo: (() => {
        const status = normalizeStatus(item.status);
        const diasParaExpirar = daysUntil(item.data_expiracao);
        const atrasada =
          PENDING_CHARGE_STATUSES.has(status) &&
          typeof diasParaExpirar === "number" &&
          diasParaExpirar < 0;

        if (atrasada && item.id_salao) return "salao_ticket_financeiro";
        if (item.id_salao) return "salao_detail";
        return null;
      })(),
      acao_id: item.id_salao || null,
    }));

    const checkoutRows = ((checkoutLocks || []) as {
      id?: string | null;
      id_salao?: string | null;
      plano_codigo?: string | null;
      billing_type?: string | null;
      valor?: number | string | null;
      idempotency_key?: string | null;
      status?: string | null;
      id_cobranca?: string | null;
      asaas_payment_id?: string | null;
      erro_texto?: string | null;
      expires_at?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    }[]).map((item): AdminCobrancaRow => {
      const requiresReconciliation =
        Boolean(item.asaas_payment_id) &&
        !item.id_cobranca &&
        ["erro", "expirado"].includes(String(item.status || "").toLowerCase());
      const detalhe =
        requiresReconciliation
          ? `reconciliar:${item.asaas_payment_id}`
          : item.erro_texto ||
            item.asaas_payment_id ||
            item.id_cobranca ||
            item.idempotency_key ||
            "-";

      const status = requiresReconciliation
        ? "reconciliar"
        : item.status || "-";

      return {
        _sort: item.created_at || item.updated_at || "",
        tipo: "checkout",
        salao: item.id_salao ? salaoById.get(item.id_salao) || item.id_salao : "-",
        referencia: item.idempotency_key || item.id || "-",
        valor: currency(safeNumber(item.valor)),
        status,
        forma: item.billing_type || "-",
        gateway: "asaas",
        expira: dateTimeValue(item.expires_at),
        criado: dateTimeValue(item.created_at),
        pago: "-",
        sinal: requiresReconciliation
          ? "Pagamento sem vinculo"
          : normalizeStatus(status) === "processando"
            ? "Checkout em andamento"
            : normalizeStatus(status) === "erro"
              ? "Falha no checkout"
              : normalizeStatus(status) === "expirado"
                ? "Lock expirado"
                : "Acompanhar",
        detalhe: String(detalhe).slice(0, 90),
        acao: requiresReconciliation
          ? "Criar ticket"
          : item.id_salao
            ? "Abrir salao"
            : "-",
        acao_tipo: requiresReconciliation
          ? "checkout_ticket"
          : item.id_salao
            ? "salao_detail"
            : null,
        acao_id: requiresReconciliation ? item.id || null : item.id_salao || null,
      };
    });

    const rows = [...cobrancaRows, ...checkoutRows]
      .sort((a, b) => String(b._sort).localeCompare(String(a._sort)))
      .slice(0, 120)
      .map(({ _sort: _sort, ...row }) => row);

    const checkoutEmAndamento = checkoutRows.filter(
      (row) => String(row.status).toLowerCase() === "processando"
    ).length;
    const checkoutFalhos = checkoutRows.filter((row) =>
      ["erro", "expirado", "reconciliar"].includes(
        String(row.status).toLowerCase()
      )
    ).length;
    const checkoutsReconciliar = checkoutRows.filter(
      (row) =>
        String(row.status).toLowerCase() !== "concluido" &&
        String(row.detalhe || "").startsWith("reconciliar:")
    ).length;
    const cobrancasPendentes = cobrancaRows.filter((row) =>
      PENDING_CHARGE_STATUSES.has(normalizeStatus(row.status))
    ).length;
    const valorPendente = cobrancaRows
      .filter((row) => PENDING_CHARGE_STATUSES.has(normalizeStatus(row.status)))
      .reduce((acc, row) => acc + safeNumber(row.valor), 0);
    const cobrancasRecebidas = cobrancaRows.filter((row) =>
      PAID_CHARGE_STATUSES.has(normalizeStatus(row.status))
    ).length;
    const valorRecebido = cobrancaRows
      .filter((row) => PAID_CHARGE_STATUSES.has(normalizeStatus(row.status)))
      .reduce((acc, row) => acc + safeNumber(row.valor), 0);
    const cobrancasEmAtraso = cobrancaRows.filter(
      (row) => row.acao_tipo === "salao_ticket_financeiro"
    ).length;
    const valorEmAtraso = cobrancaRows
      .filter((row) => row.acao_tipo === "salao_ticket_financeiro")
      .reduce((acc, row) => acc + safeNumber(row.valor), 0);

    return {
      title: "Cobrancas",
      description:
        "Histórico financeiro com leitura de atraso, pagamento e checkout travado para acelerar cobrança e suporte.",
      kpis: [
        {
          label: "Cobrancas recentes",
          value: String(cobrancaRows.length),
          hint: "Ultimas 100",
          tone: "dark",
        },
        {
          label: "Recebidas",
          value: String(cobrancasRecebidas),
          hint: `${currency(valorRecebido)} confirmado`,
          tone: "green",
        },
        {
          label: "Em atraso",
          value: String(cobrancasEmAtraso),
          hint: `${currency(valorEmAtraso)} em risco`,
          tone: cobrancasEmAtraso > 0 ? "red" : "green",
        },
        {
          label: "Pendente",
          value: currency(valorPendente),
          hint: `${cobrancasPendentes} cobranca(s) aguardando`,
          tone: valorPendente > 0 ? "amber" : "green",
        },
        {
          label: "Falhas checkout",
          value: String(checkoutFalhos),
          hint: `${checkoutsReconciliar} exigem reconciliacao`,
          tone: checkoutFalhos > 0 ? "red" : checkoutEmAndamento > 0 ? "amber" : "green",
        },
      ],
      diagnostics: [
        {
          label: "Recebimento",
          value: `${cobrancasRecebidas}/${cobrancaRows.length}`,
          detail:
            `${currency(valorRecebido)} confirmado contra ${currency(valorPendente)} ainda pendente na fila recente.`,
          tone: cobrancasRecebidas > 0 ? "green" : "amber",
          href: "/admin-master/financeiro",
        },
        {
          label: "Atraso",
          value: String(cobrancasEmAtraso),
          detail:
            `Existe ${currency(valorEmAtraso)} em cobranças vencidas. Cobrança pendente vencida deve abrir ação no salão antes do bloqueio.`,
          tone: cobrancasEmAtraso > 0 ? "red" : "green",
          href: "/admin-master/suporte",
        },
        {
          label: "Checkout",
          value: `${checkoutFalhos} falhas`,
          detail:
            "Falhas ou reconciliacoes indicam dinheiro no caminho que ainda nao virou registro financeiro confiavel.",
          tone: checkoutFalhos > 0 ? "red" : "green",
          href: "/admin-master/operacao",
        },
      ],
      rows,
      columns: [
        "tipo",
        "salao",
        "referencia",
        "valor",
        "status",
        "forma",
        "gateway",
        "expira",
        "criado",
        "sinal",
        "detalhe",
        "acao",
      ],
      actions: [
        "Abrir cobranças",
        "Abrir saloes",
        "Reprocessar webhook",
        "Ver checkout travado",
        "Reconciliar checkout",
      ],
    };
  }

  if (section === "webhooks") {
    let sync = {
      total: 0,
      erros: 0,
      processados: 0,
      pendentes: 0,
    };
    let syncError: string | null = null;

    try {
      sync = await syncAdminMasterWebhookEvents();
    } catch (error) {
      syncError =
        error instanceof Error
          ? error.message
          : "Falha ao sincronizar eventos reais do Asaas.";
    }

    const { data: eventos } = await supabase
      .from("eventos_webhook")
      .select(
        "chave, origem, evento, id_salao, status, tentativas, erro_texto, payload_json, resposta_json, recebido_em, processado_em"
      )
      .order("recebido_em", { ascending: false })
      .limit(150);

    const webhookSalaoIds = Array.from(
      new Set(
        ((eventos || []) as { id_salao?: string | null }[])
          .map((row) => row.id_salao)
          .filter(Boolean)
      )
    ) as string[];
    const { data: saloes } = webhookSalaoIds.length
      ? await supabase
          .from("saloes")
          .select("id, nome")
          .in("id", webhookSalaoIds)
          .limit(webhookSalaoIds.length)
      : { data: [] as Array<{ id: string; nome?: string | null }> };

    const salaoById = new Map(
      ((saloes || []) as { id: string; nome?: string | null }[]).map((salao) => [
        salao.id,
        salao.nome || salao.id,
      ])
    );

    const rows = ((eventos || []) as {
      chave?: string | null;
      origem?: string | null;
      evento?: string | null;
      id_salao?: string | null;
      status?: string | null;
      tentativas?: number | null;
      erro_texto?: string | null;
      payload_json?: Record<string, unknown> | null;
      resposta_json?: Record<string, unknown> | null;
      recebido_em?: string | null;
      processado_em?: string | null;
    }[]).map((row) => {
      const sourceId = extractWebhookSourceId(row.chave);
      const resposta =
        row.resposta_json && typeof row.resposta_json === "object"
          ? row.resposta_json
          : {};
      const paymentId =
        typeof resposta.payment_id === "string" ? resposta.payment_id : null;
      const decisao =
        typeof resposta.decisao === "string" ? resposta.decisao : null;

        return {
          origem: row.origem || "-",
          evento: row.evento || "-",
          salao: row.id_salao ? salaoById.get(row.id_salao) || row.id_salao : "-",
          status: row.status || "-",
          tentativas: safeNumber(row.tentativas),
          recebido: formatWebhookDate(row.recebido_em),
          processado: formatWebhookDate(row.processado_em),
          detalhe: formatWebhookDiagnosticDetail({
            paymentId,
            decisao,
            erro: row.erro_texto,
          }),
          payload_acao: sourceId ? "Ver payload" : "-",
          payload_acao_tipo: sourceId ? "webhook_payload" : null,
          payload_acao_id: sourceId,
          reprocessar_acao: sourceId ? "Reprocessar" : "-",
          reprocessar_acao_tipo: sourceId ? "webhook_reprocess" : null,
          reprocessar_acao_id: sourceId,
        };
      });

    const erros = rows.filter(
      (row) => String(row.status).toLowerCase() === "erro"
    ).length;
    const pendentes = rows.filter(
      (row) => String(row.status).toLowerCase() === "pendente"
    ).length;
    const saloesImpactados = new Set(
      rows
        .map((row) => String(row.salao || "-"))
        .filter((salao) => salao && salao !== "-")
    ).size;

    return {
      title: "Webhooks",
      description:
        "Diagnóstico operacional dos eventos reais do Asaas, com status consolidado, tentativas, decisão aplicada e impacto por salão.",
      kpis: [
        {
          label: "Eventos recentes",
          value: String(rows.length),
          hint: syncError ? "Sincronizacao falhou, exibindo cache local" : `${sync.total} eventos sincronizados`,
          tone: syncError ? "amber" : "dark",
        },
        {
          label: "Com erro",
          value: String(erros),
          hint: `${pendentes} pendentes para acompanhar`,
          tone: erros > 0 ? "red" : "green",
        },
        {
          label: "Salões impactados",
          value: String(saloesImpactados),
          hint: `${sync.processados} processados sem falha`,
          tone: saloesImpactados > 0 ? "blue" : "dark",
        },
        {
          label: "Sincronizacao",
          value: syncError ? "Falhou" : "OK",
          hint: syncError || "Eventos espelhados para o AdminMaster",
          tone: syncError ? "red" : "green",
        },
      ],
      diagnostics: [
        {
          label: "Endpoint Asaas",
          value: "salaopremiun.com.br",
          detail:
            "Configure no Asaas: https://salaopremiun.com.br/api/webhooks/asaas",
          tone: "blue",
          href: "https://salaopremiun.com.br/api/webhooks/asaas",
        },
        {
          label: "Sem redirect",
          value: "Obrigatorio",
          detail:
            "Webhook de pagamento deve responder direto no dominio raiz. 3xx causa penalizacao no Asaas.",
          tone: "green",
        },
        {
          label: "Teste sem token",
          value: "401 esperado",
          detail:
            "Um POST sem asaas-access-token deve chegar no handler e ser recusado com 401, nunca com 307/308.",
          tone: "amber",
        },
      ],
      rows,
      columns: [
        "origem",
        "evento",
        "salao",
        "status",
        "tentativas",
        "recebido",
        "processado",
        "detalhe",
        "payload_acao",
        "reprocessar_acao",
      ],
      actions: [
        "Sincronizar webhooks",
        "Testar endpoint Asaas",
        "Ver payload Asaas",
         "Reprocessar diagnóstico",
        "Abrir logs",
      ],
    };
  }

  if (section === "operacao") {
    let syncError: string | null = null;

    try {
      await syncAdminMasterWebhookEvents();
    } catch (error) {
      syncError =
        error instanceof Error
          ? error.message
          : "Falha ao sincronizar webhooks para operação.";
    }

    const [{ data: crons }, { data: webhooks }, { data: checkoutLocks }] =
      await Promise.all([
      supabase
        .from("eventos_cron")
        .select("nome, status, resumo, erro_texto, iniciado_em, finalizado_em")
        .order("iniciado_em", { ascending: false })
        .limit(40),
      supabase
        .from("eventos_webhook")
        .select(
          "evento, id_salao, status, erro_texto, resposta_json, recebido_em, processado_em"
        )
        .in("status", ["erro", "pendente"])
        .order("recebido_em", { ascending: false })
        .limit(40),
      supabase
        .from("assinatura_checkout_locks")
        .select(
          "id, id_salao, plano_codigo, billing_type, status, id_cobranca, asaas_payment_id, erro_texto, idempotency_key, created_at, updated_at"
        )
        .in("status", ["processando", "erro", "expirado"])
        .order("updated_at", { ascending: false })
        .limit(40),
    ]);

    const operacaoSalaoIds = Array.from(
      new Set(
        [
          ...((webhooks || []) as { id_salao?: string | null }[]).map(
            (row) => row.id_salao
          ),
          ...((checkoutLocks || []) as { id_salao?: string | null }[]).map(
            (row) => row.id_salao
          ),
        ].filter(Boolean)
      )
    ) as string[];
    const { data: saloes } = operacaoSalaoIds.length
      ? await supabase
          .from("saloes")
          .select("id, nome")
          .in("id", operacaoSalaoIds)
          .limit(operacaoSalaoIds.length)
      : { data: [] as Array<{ id: string; nome?: string | null }> };

    const salaoById = new Map(
      ((saloes || []) as { id: string; nome?: string | null }[]).map((salao) => [
        salao.id,
        salao.nome || salao.id,
      ])
    );

    type AdminOperacaoRow = AdminTableRow & { _sort: string };

    const cronRows = ((crons || []) as {
      nome?: string | null;
      status?: string | null;
      resumo?: string | null;
      erro_texto?: string | null;
      iniciado_em?: string | null;
      finalizado_em?: string | null;
    }[]).map((row): AdminOperacaoRow => ({
      _sort: row.finalizado_em || row.iniciado_em || "",
      tipo: "cron",
      salao: "-",
      nome: row.nome || "-",
      status: row.status || "-",
      referencia: "-",
      atualizado: dateTimeValue(row.finalizado_em || row.iniciado_em),
      detalhe: row.erro_texto || row.resumo || "-",
    }));

    const webhookRows = ((webhooks || []) as {
      evento?: string | null;
      id_salao?: string | null;
      status?: string | null;
      erro_texto?: string | null;
      resposta_json?: Record<string, unknown> | null;
      recebido_em?: string | null;
      processado_em?: string | null;
    }[]).map((row): AdminOperacaoRow => {
      const resposta =
        row.resposta_json && typeof row.resposta_json === "object"
          ? row.resposta_json
          : {};
      const paymentId =
        typeof resposta.payment_id === "string" ? resposta.payment_id : null;
      const decisao =
        typeof resposta.decisao === "string" ? resposta.decisao : null;

      return {
        _sort: row.processado_em || row.recebido_em || "",
        tipo: "webhook",
        salao: row.id_salao ? salaoById.get(row.id_salao) || row.id_salao : "-",
        nome: row.evento || "-",
        status: row.status || "-",
        referencia: paymentId || "-",
        atualizado: formatWebhookDate(row.processado_em || row.recebido_em),
        detalhe: formatWebhookDiagnosticDetail({
          paymentId,
          decisao,
          erro: row.erro_texto,
        }),
      };
    });

    const checkoutRows = ((checkoutLocks || []) as {
      id?: string | null;
      id_salao?: string | null;
      plano_codigo?: string | null;
      billing_type?: string | null;
      status?: string | null;
      id_cobranca?: string | null;
      asaas_payment_id?: string | null;
      erro_texto?: string | null;
      idempotency_key?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    }[]).map((row): AdminOperacaoRow => ({
      _sort: row.updated_at || row.created_at || "",
      tipo: "checkout",
      salao: row.id_salao ? salaoById.get(row.id_salao) || row.id_salao : "-",
      nome: row.plano_codigo
        ? `Checkout ${row.plano_codigo}`
        : `Checkout ${row.billing_type || "-"}`,
      status: row.status || "-",
      referencia:
        row.asaas_payment_id ||
        row.id_cobranca ||
        row.idempotency_key ||
        row.id ||
        "-",
      atualizado: dateTimeValue(row.updated_at || row.created_at),
      detalhe: row.erro_texto || row.billing_type || "-",
    }));

    const rows = [...cronRows, ...webhookRows, ...checkoutRows]
      .sort((a, b) => String(b._sort).localeCompare(String(a._sort)))
      .slice(0, 120)
      .map(({ _sort: _sort, ...row }) => row);

    const cronsComErro = cronRows.filter((row) =>
      ["erro", "falha", "failed"].includes(String(row.status).toLowerCase())
    ).length;
    const checkoutsProblematicos = checkoutRows.length;
    const webhooksPendentes = webhookRows.filter(
      (row) => String(row.status).toLowerCase() === "pendente"
    ).length;

    return {
      title: "Operacao",
      description:
        "Visão operacional unificada com crons recentes, checkouts presos e webhooks com erro ou pendentes para suporte e reprocessamento.",
      kpis: [
        {
          label: "Crons com erro",
          value: String(cronsComErro),
          hint: `${cronRows.length} eventos recentes`,
          tone: cronsComErro > 0 ? "red" : "green",
        },
        {
          label: "Webhooks em atencao",
          value: String(webhookRows.length),
          hint: `${webhooksPendentes} pendentes e ${webhookRows.length - webhooksPendentes} com erro`,
          tone: webhookRows.length > 0 ? "amber" : "green",
        },
        {
          label: "Checkouts travados",
          value: String(checkoutsProblematicos),
          hint: "Processando, erro ou expirado",
          tone: checkoutsProblematicos > 0 ? "red" : "green",
        },
        {
          label: "Sync webhooks",
          value: syncError ? "Falhou" : "OK",
          hint: syncError || "Operacao alinhada com Asaas",
          tone: syncError ? "red" : "green",
        },
      ],
      rows,
      columns: [
        "tipo",
        "salao",
        "nome",
        "status",
        "referencia",
        "atualizado",
        "detalhe",
      ],
      actions: [
        "Rodar sincronizacao",
        "Sincronizar webhooks",
        "Reprocessar eventos",
        "Abrir logs",
      ],
    };
  }

  if (section === "financeiro") {
    return getAdminMasterFinanceiroSection();
  }

  if (section === "planos") {
    return getAdminMasterPlanosSection();
  }

  if (section === "recursos") {
    return getAdminMasterRecursosSection();
  }

  if (section === "alertas") {
    const sync = await syncAdminMasterAlerts();
    const { data: alertas } = await supabase
      .from("alertas_sistema")
      .select(
        "id, tipo, gravidade, origem_modulo, id_salao, titulo, descricao, payload_json, resolvido, resolvido_em, criado_em, atualizado_em, automatico, id_ticket"
      )
      .order("resolvido", { ascending: true })
      .order("criado_em", { ascending: false })
      .limit(150);

    const alertasRows =
      ((alertas || []) as {
        id?: string | null;
        tipo?: string | null;
        gravidade?: string | null;
        origem_modulo?: string | null;
        id_salao?: string | null;
        titulo?: string | null;
        descricao?: string | null;
        payload_json?: Record<string, unknown> | null;
        resolvido?: boolean | null;
        resolvido_em?: string | null;
        criado_em?: string | null;
        atualizado_em?: string | null;
        automatico?: boolean | null;
        id_ticket?: string | null;
      }[]) || [];
    const salaoIds = Array.from(
      new Set(alertasRows.map((row) => row.id_salao).filter(Boolean))
    ) as string[];
    const ticketIds = Array.from(
      new Set(alertasRows.map((row) => row.id_ticket).filter(Boolean))
    ) as string[];

    const [{ data: saloes }, { data: tickets }] = await Promise.all([
      salaoIds.length
        ? supabase.from("saloes").select("id, nome").in("id", salaoIds).limit(salaoIds.length)
        : Promise.resolve({ data: [] as Array<{ id: string; nome?: string | null }> }),
      ticketIds.length
        ? supabase
            .from("tickets")
            .select("id, numero, status")
            .in("id", ticketIds)
            .limit(ticketIds.length)
        : Promise.resolve({
            data: [] as Array<{
              id: string;
              numero?: number | string | null;
              status?: string | null;
            }>,
          }),
    ]);

    const salaoById = new Map(
      ((saloes || []) as { id: string; nome?: string | null }[]).map((salao) => [
        salao.id,
        salao.nome || salao.id,
      ])
    );
    const ticketById = new Map(
      ((tickets || []) as { id: string; numero?: number | string | null; status?: string | null }[]).map(
        (ticket) => [
          ticket.id,
          {
            numero: ticket.numero,
            status: ticket.status,
          },
        ]
      )
    );

    const rows = alertasRows.map((row) => ({
      gravidade: row.gravidade || "-",
      titulo: row.titulo || "-",
      salao: row.id_salao ? salaoById.get(row.id_salao) || row.id_salao : "-",
      origem: row.origem_modulo || "-",
      status: row.resolvido
        ? "Resolvido"
        : row.resolvido_em
          ? "Ativo reaberto"
          : "Ativo",
      idade: relativeTimeValue(row.criado_em),
      ultima: relativeTimeValue(row.atualizado_em || row.criado_em),
      resolucao: row.resolvido
        ? dateTimeValue(row.resolvido_em)
        : row.resolvido_em
          ? `Reaberto depois de ${dateTimeValue(row.resolvido_em)}`
          : "-",
      ticket: row.id_ticket
        ? (() => {
            const ticket = ticketById.get(row.id_ticket);
            if (!ticket) return "Vinculado";
            return `#${ticket.numero || "-"} • ${ticket.status || "aberto"}`;
          })()
        : "-",
      automatico: row.automatico ? "Sim" : "Nao",
      criado: dateTimeValue(row.criado_em),
      atualizado: dateTimeValue(row.atualizado_em),
      detalhe: getAlertDiagnostic(row.descricao, row.payload_json),
      ticket_acao: !row.resolvido && !row.id_ticket ? "Criar ticket" : "-",
      ticket_acao_tipo: !row.resolvido && !row.id_ticket ? "alert_ticket" : null,
      ticket_acao_id: !row.resolvido && !row.id_ticket ? row.id || null : null,
      resolver_acao: row.resolvido ? "-" : "Resolver",
      resolver_acao_tipo: row.resolvido ? null : "alert_resolve",
      resolver_acao_id: row.resolvido ? null : row.id || null,
    }));

    const ativos = rows.filter((row) =>
      String(row.status).startsWith("Ativo")
    ).length;
    const ativosReabertos = rows.filter(
      (row) => row.status === "Ativo reaberto"
    ).length;
    const criticos = rows.filter(
      (row) =>
        String(row.status).startsWith("Ativo") &&
        ["alta", "critica"].includes(String(row.gravidade).toLowerCase())
    ).length;
    const comTicket = rows.filter((row) => row.ticket !== "-").length;
    const renovacoesEmRisco =
      sync.renovacoesComConfigInvalida + sync.renovacoesSemCobranca;
    const ativosPorOrigem = rows
      .filter((row) => String(row.status).startsWith("Ativo"))
      .reduce<Record<string, number>>((acc, row) => {
        const origem = String(row.origem || "sistema");
        acc[origem] = (acc[origem] || 0) + 1;
        return acc;
      }, {});
    const focoPrincipal = Object.entries(ativosPorOrigem).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const alertaMaisAntigo = rows.find((row) =>
      String(row.status).startsWith("Ativo")
    );

    return {
      title: "Alertas",
      description:
        "Alertas automáticos do AdminMaster para renovação automática, checkout de assinatura, webhook Asaas, cobranças vencidas e trials terminando, com abertura automática de ticket nos riscos de recorrência.",
      kpis: [
        {
          label: "Alertas ativos",
          value: String(ativos),
          hint: `${rows.length} registros recentes`,
          tone: ativos > 0 ? "amber" : "green",
        },
        {
          label: "Alta ou critica",
          value: String(criticos),
          hint: `${sync.webhooksComErro} webhooks e ${sync.checkoutsFalhos} checkouts com falha`,
          tone: criticos > 0 ? "red" : "green",
        },
        {
          label: "Renovacao em risco",
          value: String(renovacoesEmRisco),
          hint: `${sync.renovacoesComConfigInvalida} sem preparo e ${sync.renovacoesSemCobranca} sem cobrança futura`,
          tone: renovacoesEmRisco > 0 ? "red" : "green",
        },
        {
          label: "Trials vencendo",
          value: String(sync.trialsVencendo),
          hint: `${sync.cobrancasVencidas} cobranças vencidas monitoradas`,
          tone: sync.trialsVencendo > 0 ? "blue" : "dark",
        },
        {
          label: "Com ticket",
          value: String(comTicket),
          hint: `${sync.ticketsAutomaticosCriados} ticket(s) aberto(s) automaticamente nesta sync`,
          tone: comTicket > 0 ? "green" : "dark",
        },
      ],
      diagnostics: [
        {
          label: "Foco principal",
          value: focoPrincipal ? focoPrincipal[0] : "Sem foco ativo",
          detail: focoPrincipal
            ? `${focoPrincipal[1]} alerta(s) ativo(s) nessa origem.`
            : "Nenhum alerta ativo no snapshot atual.",
          tone: focoPrincipal ? "amber" : "green",
        },
        {
          label: "Mais antigo ativo",
          value: alertaMaisAntigo?.idade ? String(alertaMaisAntigo.idade) : "-",
          detail: alertaMaisAntigo
            ? `${alertaMaisAntigo.titulo} - ultima ocorrencia ${alertaMaisAntigo.ultima}.`
            : "Sem alerta ativo aguardando acao.",
          tone: alertaMaisAntigo ? "red" : "green",
        },
        {
          label: "Resolvidos que voltaram",
          value: String(ativosReabertos),
          detail:
            ativosReabertos > 0
              ? "O mesmo erro voltou depois de uma resolução manual. O horário antigo aparece na coluna resolução."
              : "Nenhum alerta ativo está carregando horário antigo de resolução.",
          tone: ativosReabertos > 0 ? "red" : "green",
        },
      ],
      rows,
      columns: [
        "gravidade",
        "titulo",
        "salao",
        "origem",
        "status",
        "idade",
        "ultima",
        "resolucao",
        "ticket",
        "detalhe",
        "ticket_acao",
        "resolver_acao",
      ],
      actions: [
        "Sincronizar alertas",
        "Ver webhooks com erro",
        "Ver checkouts travados",
        "Abrir tickets",
      ],
    };
  }

  if (section === "logs") {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ data: logs }, { data: checkoutLocks }, { data: eventosSistema }] = await Promise.all([
      supabase
        .from("logs_sistema")
        .select(
          "id, gravidade, modulo, id_salao, mensagem, detalhes_json, criado_em"
        )
        .order("criado_em", { ascending: false })
        .limit(120),
      supabase
        .from("assinatura_checkout_locks")
        .select(
          "id, id_salao, plano_codigo, billing_type, status, id_cobranca, asaas_payment_id, erro_texto, idempotency_key, created_at, updated_at"
        )
        .in("status", ["erro", "expirado"])
        .not("asaas_payment_id", "is", null)
        .is("id_cobranca", null)
        .order("updated_at", { ascending: false })
        .limit(60),
      supabase
        .from("eventos_sistema")
        .select(
          "id, id_salao, modulo, tipo_evento, severidade, mensagem, rota, acao, response_ms, sucesso, created_at"
        )
        .gte("created_at", last24h)
        .order("created_at", { ascending: false })
        .limit(180),
    ]);

    const salaoIds = Array.from(
      new Set(
        [
          ...((logs || []) as { id_salao?: string | null }[]).map((row) => row.id_salao),
          ...((checkoutLocks || []) as { id_salao?: string | null }[]).map(
            (row) => row.id_salao
          ),
          ...((eventosSistema || []) as { id_salao?: string | null }[]).map(
            (row) => row.id_salao
          ),
        ].filter(Boolean)
      )
    ) as string[];
    const { data: saloes } = salaoIds.length
      ? await supabase.from("saloes").select("id, nome").in("id", salaoIds).limit(salaoIds.length)
      : { data: [] as Array<{ id: string; nome?: string | null }> };

    const salaoById = new Map(
      ((saloes || []) as { id: string; nome?: string | null }[]).map((salao) => [
        salao.id,
        salao.nome || salao.id,
      ])
    );

    type AdminLogRow = AdminTableRow & { _sort: string };

    const logRows = ((logs || []) as {
      id?: string | null;
      gravidade?: string | null;
      modulo?: string | null;
      id_salao?: string | null;
      mensagem?: string | null;
      detalhes_json?: Record<string, unknown> | null;
      criado_em?: string | null;
    }[]).map((row): AdminLogRow => {
      const detalhes =
        row.detalhes_json && typeof row.detalhes_json === "object"
          ? row.detalhes_json
          : {};
      const referencia =
        typeof detalhes.id_salao_solicitado === "string"
          ? detalhes.id_salao_solicitado
          : typeof detalhes.idempotency_key === "string"
            ? detalhes.idempotency_key
            : row.id || "-";

      return {
        _sort: row.criado_em || "",
        tipo: row.modulo === "tenant_guard" ? "seguranca" : "log",
        gravidade: row.gravidade || "-",
        modulo: row.modulo || "-",
        salao: row.id_salao ? salaoById.get(row.id_salao) || row.id_salao : "-",
        mensagem: row.mensagem || "-",
        referencia,
        criado: dateTimeValue(row.criado_em),
        detalhe: JSON.stringify(detalhes).slice(0, 120),
        acao: "-",
        acao_tipo: null,
        acao_id: null,
      };
    });

    const reconciliationRows = ((checkoutLocks || []) as {
      id?: string | null;
      id_salao?: string | null;
      plano_codigo?: string | null;
      billing_type?: string | null;
      status?: string | null;
      asaas_payment_id?: string | null;
      erro_texto?: string | null;
      idempotency_key?: string | null;
      updated_at?: string | null;
      created_at?: string | null;
    }[]).map((row): AdminLogRow => ({
      _sort: row.updated_at || row.created_at || "",
      tipo: "reconciliacao",
      gravidade: "error",
      modulo: "assinatura_checkout",
      salao: row.id_salao ? salaoById.get(row.id_salao) || row.id_salao : "-",
      mensagem:
        "Pagamento existe no provedor, mas não há cobrança local vinculada.",
      referencia: row.asaas_payment_id || row.idempotency_key || row.id || "-",
      criado: dateTimeValue(row.updated_at || row.created_at),
      detalhe:
        row.erro_texto ||
        `${row.plano_codigo || "-"} / ${row.billing_type || "-"} / ${row.status || "-"}`,
      acao: "Criar ticket",
      acao_tipo: "checkout_ticket",
      acao_id: row.id || null,
    }));

    const monitoringRows = ((eventosSistema || []) as {
      id?: string | null;
      id_salao?: string | null;
      modulo?: string | null;
      tipo_evento?: string | null;
      severidade?: string | null;
      mensagem?: string | null;
      rota?: string | null;
      acao?: string | null;
      response_ms?: number | null;
      sucesso?: boolean | null;
      created_at?: string | null;
    }[]).map((row): AdminLogRow => ({
      _sort: row.created_at || "",
      tipo: row.sucesso === false ? "falha_monitorada" : "evento_monitorado",
      gravidade: row.severidade || (row.sucesso === false ? "error" : "info"),
      modulo: row.modulo || "-",
      salao: row.id_salao ? salaoById.get(row.id_salao) || row.id_salao : "-",
      mensagem: row.mensagem || "-",
      referencia: row.rota || row.acao || row.tipo_evento || row.id || "-",
      criado: dateTimeValue(row.created_at),
      detalhe: [
        row.tipo_evento ? `tipo ${row.tipo_evento}` : null,
        row.acao ? `acao ${row.acao}` : null,
        row.response_ms ? `${Math.round(row.response_ms)} ms` : null,
      ]
        .filter(Boolean)
        .join(" | ") || "-",
      acao: row.id_salao ? "Abrir salao" : "-",
      acao_tipo: row.id_salao ? "salao_detail" : null,
      acao_id: row.id_salao || null,
    }));

    const rows = [...reconciliationRows, ...monitoringRows, ...logRows]
      .sort((a, b) => String(b._sort).localeCompare(String(a._sort)))
      .slice(0, 150)
      .map(({ _sort: _sort, ...row }) => row);

    const tenantGuardCount = logRows.filter(
      (row) => row.modulo === "tenant_guard"
    ).length;
    const errorsCount = rows.filter((row) =>
      ["error", "erro"].includes(String(row.gravidade).toLowerCase())
    ).length;
    const monitoredFailures = monitoringRows.filter((row) =>
      ["error", "erro", "critical"].includes(String(row.gravidade).toLowerCase())
    ).length;
    const slowRoutes = monitoringRows.filter((row) =>
      String(row.detalhe).includes(" ms") &&
      safeNumber(String(row.detalhe).match(/(\d+) ms/)?.[1]) >= 3000
    ).length;
    const modulesCount = new Set(rows.map((row) => String(row.modulo))).size;

    return {
      title: "Logs e investigacao",
      description:
        "Central para descobrir onde o problema nasceu: logs internos, eventos monitorados, rotas lentas, tenant guard e checkouts que precisam de reconciliacao.",
      kpis: [
        {
          label: "Tenant guard",
          value: String(tenantGuardCount),
          hint: "Tentativas bloqueadas por isolamento de salao",
          tone: tenantGuardCount > 0 ? "red" : "green",
        },
        {
          label: "Reconciliacoes",
          value: String(reconciliationRows.length),
          hint: "Pagamento no provedor sem cobrança local",
          tone: reconciliationRows.length > 0 ? "red" : "green",
        },
        {
          label: "Erros recentes",
          value: String(errorsCount),
          hint: `${modulesCount} modulos com eventos`,
          tone: errorsCount > 0 ? "amber" : "green",
        },
        {
          label: "Eventos 24h",
          value: String(monitoringRows.length),
          hint: `${monitoredFailures} falha(s) monitorada(s)`,
          tone: monitoredFailures > 0 ? "amber" : "green",
        },
        {
          label: "Rotas lentas",
          value: String(slowRoutes),
          hint: "Eventos acima de 3000 ms",
          tone: slowRoutes > 0 ? "red" : "green",
        },
      ],
      diagnostics: [
        {
          label: "Como investigar",
          value: "Modulo + rota",
          detail:
            "Comece pelo modulo, confira a rota/referencia e abra o salao quando o evento tiver id_salao. Assim o suporte ve assinatura, alertas e logs juntos.",
          tone: "blue",
          href: "/admin-master/saude",
        },
        {
          label: "Sinal de lentidao",
          value: `${slowRoutes} rota(s)`,
          detail:
            slowRoutes > 0
              ? "Existe pelo menos uma acao acima de 3 segundos nas ultimas 24h."
              : "Nenhuma rota lenta monitorada nas ultimas 24h.",
          tone: slowRoutes > 0 ? "red" : "green",
          href: "/admin-master/saude",
        },
        {
          label: "Falha monitorada",
          value: String(monitoredFailures),
          detail:
            monitoredFailures > 0
              ? "Use a coluna acao para abrir o salao afetado e criar ticket quando for recorrente."
              : "Sem falhas monitoradas no recorte atual.",
          tone: monitoredFailures > 0 ? "amber" : "green",
          href: "/admin-master/tickets",
        },
      ],
      rows,
      columns: [
        "tipo",
        "gravidade",
        "modulo",
        "salao",
        "mensagem",
        "referencia",
        "criado",
        "detalhe",
        "acao",
      ],
      actions: [
        "Abrir logs",
        "Abrir tickets",
        "Reconciliar checkout",
        "Auditar",
      ],
    };
  }

  const map: Record<
    string,
    {
      title: string;
      description: string;
      table: string;
      columns: string[];
      actions: string[];
    }
  > = {
    tickets: {
      title: "Tickets",
      description: "Atendimento, SLA, categorias, prioridades e historico.",
      table: "tickets",
      columns: ["numero", "assunto", "categoria", "prioridade", "status", "criado_em"],
      actions: ["Abrir tickets", "Abrir suporte", "Abrir saloes", "Auditar"],
    },
    notificacoes: {
      title: "Notificações globais",
        description: "Comunicados, manutenção, ofertas e avisos institucionais.",
      table: "notificacoes_globais",
      columns: ["titulo", "tipo", "publico_tipo", "status", "criada_em"],
       actions: ["Abrir notificações", "Ver campanhas", "Auditar"],
    },
    campanhas: {
      title: "Campanhas",
      description: "Promoções, retenção, conversão de trial e recuperação.",
      table: "campanhas",
      columns: ["nome", "tipo", "publico_tipo", "status", "inicio_em", "fim_em"],
       actions: ["Abrir campanhas", "Ver notificações", "Abrir relatórios", "Auditar"],
    },
    alertas: {
      title: "Alertas",
      description: "Riscos, falhas, cobranças, webhooks e operação.",
      table: "alertas_sistema",
      columns: ["tipo", "gravidade", "origem_modulo", "titulo", "resolvido", "criado_em"],
      actions: ["Abrir alertas", "Criar ticket", "Sincronizar alertas", "Abrir suporte"],
    },
    webhooks: {
      title: "Webhooks",
      description: "Eventos recebidos, falhas, tentativas e reprocessamento.",
      table: "eventos_webhook",
      columns: ["origem", "evento", "status", "tentativas", "erro_texto", "recebido_em"],
      actions: ["Abrir webhooks", "Sincronizar webhooks", "Auditar"],
    },
    logs: {
      title: "Logs",
      description: "Logs de sistema, financeiro, suporte e operação.",
      table: "logs_sistema",
      columns: ["gravidade", "modulo", "mensagem", "criado_em"],
      actions: ["Abrir logs", "Abrir tickets", "Auditar"],
    },
    whatsapp: {
      title: "WhatsApp e pacotes",
      description: "Créditos, consumo, templates, filas e cobrança por envio.",
      table: "whatsapp_envios",
      columns: ["tipo", "destino", "template", "status", "custo_creditos", "criado_em"],
      actions: ["Ver WhatsApp", "Ver pacotes WhatsApp", "Ver templates WhatsApp", "Auditar"],
    },
    "feature-flags": {
      title: "Feature flags",
      description: "Liberacoes por plano, salao especifico e recursos beta.",
      table: "feature_flags",
      columns: ["nome", "status_global", "tipo_liberacao", "data_inicio", "data_fim"],
      actions: ["Ver feature flags", "Ajustar matriz de recursos", "Auditar"],
    },
    "usuarios-admin": {
      title: "Usuarios AdminMaster",
      description: "Admins internos, perfis, permissoes e auditoria.",
      table: "admin_master_usuarios",
      columns: ["nome", "email", "perfil", "status", "ultimo_acesso_em"],
      actions: ["Ver admins internos", "Ver logs", "Auditar"],
    },
    checklists: {
      title: "Checklists e trial +7",
      description: "Onboarding, score de saude e extensao automatica de trial.",
      table: "score_onboarding_salao",
      columns: ["id_salao", "score_total", "dias_com_acesso", "modulos_usados", "atualizado_em"],
      actions: ["Recalcular score", "Avaliar trial extra", "Ver criterios"],
    },
    financeiro: {
      title: "Financeiro SaaS",
      description: "MRR, recebimentos, inadimplencia, churn e receita por plano.",
      table: "assinaturas_cobrancas",
      columns: ["referencia", "valor", "status", "forma_pagamento", "data_expiracao", "pago_em"],
      actions: ["Abrir financeiro", "Abrir cobrancas", "Reconciliar checkout"],
    },
    operacao: {
      title: "Operacao",
      description: "Saúde do sistema, crons, sincronizações e reprocessamentos.",
      table: "eventos_cron",
      columns: ["nome", "status", "resumo", "erro_texto", "iniciado_em", "finalizado_em"],
      actions: ["Rodar sincronizacao", "Sincronizar webhooks", "Abrir logs"],
    },
    suporte: {
      title: "Suporte",
      description: "Tickets, clientes com problema, historico e acoes de suporte.",
      table: "tickets",
      columns: ["numero", "assunto", "categoria", "prioridade", "status", "criado_em"],
      actions: ["Abrir suporte", "Abrir tickets", "Abrir saloes"],
    },
    relatorios: {
      title: "Relatorios e growth",
      description: "Crescimento, uso dos saloes, retencao, churn e conversao.",
      table: "score_saude_salao",
      columns: ["id_salao", "score_total", "uso_recente", "inadimplencia_risco", "tickets_abertos"],
      actions: ["Ver crescimento", "Ver uso por modulo", "Abrir relatorios"],
    },
    "configuracoes-globais": {
      title: "Configurações globais",
        description: "Manutenção, banners, onboarding, políticas e templates globais.",
      table: "configuracoes_globais",
      columns: ["chave", "descricao", "atualizado_em"],
      actions: ["Ver configs globais", "Ver logs", "Auditar"],
    },
  };

  const config = map[section] || {
    title: section,
    description: "Módulo AdminMaster preparado para operação.",
    table: "admin_master_auditoria",
    columns: ["acao", "entidade", "descricao", "criado_em"],
    actions: ["Abrir logs", "Auditar"],
  };

  const adminQueryClient = supabase as unknown as {
    from(table: string): {
      select(columns: string): {
        limit(count: number): Promise<{ data: unknown[] | null }>;
      };
    };
  };

  const { data } = await adminQueryClient
    .from(config.table)
    .select(config.columns.join(", "))
    .limit(100);

  const rows = ((data || []) as Record<string, unknown>[]).map((row) => {
    const formattedRow = config.columns.reduce((acc, column) => {
      const value = row[column];
      acc[column] = formatAdminTableValue(value);
      return acc;
    }, {} as AdminTableRow);
    const action = buildGenericRowAction(section, row);

    return action ? { ...formattedRow, ...action } : formattedRow;
  });
  const columns = rows.some((row) => row.acao)
    ? [...config.columns, "acao"]
    : config.columns;

  return {
    title: config.title,
    description: config.description,
    kpis: [
      {
        label: "Registros",
        value: String(rows.length),
        hint: "Ultimos registros do modulo",
        tone: "dark",
      },
      {
        label: "Atalhos reais",
        value: String(config.actions.length),
        hint: "Botões apontam para rotas ou APIs existentes",
        tone: "blue",
      },
      {
        label: "Auditoria",
        value: "Ativa",
        hint: "Acoes criticas devem registrar historico",
        tone: "green",
      },
    ],
    diagnostics: [
      {
        label: "Fonte real",
        value: config.table,
        detail:
          "Esta tela lê os registros diretamente do Supabase usado pelo SalãoPremium.",
        tone: "blue",
      },
      {
        label: "Botões",
        value: "Sem ficção",
        detail:
          "Ações de listagem agora abrem telas reais ou executam endpoints existentes; operações destrutivas ficam no detalhe correto.",
        tone: "green",
      },
      {
        label: "Compatibilidade",
        value: "AdminMaster",
        detail:
          "Linhas com detalhe real mostram atalho de abertura; demais modulos ficam como painel de consulta operacional.",
        tone: "dark",
      },
    ],
    rows,
    columns,
    actions: config.actions,
  };
}
