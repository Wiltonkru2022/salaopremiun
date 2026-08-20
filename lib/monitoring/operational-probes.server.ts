import "server-only";

import {
  getOperationalComponent,
  listOperationalComponents,
  type OperationalComponentDefinition,
} from "@/lib/monitoring/operational-components";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ProbeStatus = "ok" | "warning" | "critical" | "unknown";

type ProbeResult = {
  status: ProbeStatus;
  score: number;
  latencyMs: number | null;
  reason: string;
  evidence?: Record<string, unknown>;
};

const deploymentId = () => process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || null;
const commitSha = () => process.env.VERCEL_GIT_COMMIT_SHA || null;

function appOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return String(raw || "").replace(/\/$/, "");
}

async function timed<T>(operation: () => Promise<T>, timeoutMs: number) {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const result = await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("probe_timeout")), timeoutMs);
      }),
    ]);
    return { result, latencyMs: Date.now() - started };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function recordProbe(component: OperationalComponentDefinition, result: ProbeResult) {
  if (!component.probeKey) return;
  const supabase = getSupabaseAdmin() as any;
  const { error } = await supabase.rpc("fn_operational_record_probe", {
    p_component_key: component.componentKey,
    p_probe_key: component.probeKey,
    p_name: component.name,
    p_status: result.status,
    p_score: result.score,
    p_latency_ms: result.latencyMs,
    p_motivo: result.reason,
    p_evidence: result.evidence || {},
    p_deployment_id: deploymentId(),
    p_commit_sha: commitSha(),
    p_intervalo_esperado_segundos: component.expectedIntervalSeconds,
    p_freshness_ttl_segundos: component.freshnessTtlSeconds,
    p_sucessos_para_recuperar: 3,
    p_falhas_para_degradar: component.criticality === "critical" ? 1 : 2,
    p_probe_version: "operational-health-v1",
  });
  if (error) throw error;
}

async function databaseProbe(table: string, timeoutMs: number): Promise<ProbeResult> {
  try {
    const supabase = getSupabaseAdmin() as any;
    const { result, latencyMs } = await timed(
      () => supabase.from(table).select("id").limit(1),
      timeoutMs
    );
    if (result.error) throw result.error;
    return { status: "ok", score: latencyMs < 1500 ? 100 : 85, latencyMs, reason: "Leitura canário concluída.", evidence: { table, readable: true } };
  } catch (error) {
    return { status: "critical", score: 20, latencyMs: null, reason: error instanceof Error ? error.message : "Falha na leitura canário.", evidence: { table, readable: false } };
  }
}

async function httpProbe(path: string, timeoutMs: number): Promise<ProbeResult> {
  const origin = appOrigin();
  if (!origin) return { status: "unknown", score: 0, latencyMs: null, reason: "Origem pública não configurada." };
  try {
    const { result: response, latencyMs } = await timed(
      () => fetch(`${origin}${path}`, { method: "GET", cache: "no-store", redirect: "manual", headers: { "User-Agent": "SalaoPremium-OperationalProbe/1.0" } }),
      timeoutMs
    );
    const acceptable = response.status >= 200 && response.status < 400;
    return {
      status: acceptable ? "ok" : response.status >= 500 ? "critical" : "warning",
      score: acceptable ? (latencyMs < 2000 ? 100 : 82) : response.status >= 500 ? 25 : 65,
      latencyMs,
      reason: acceptable ? `HTTP ${response.status} dentro do esperado.` : `HTTP ${response.status} fora do esperado.`,
      evidence: { path, status: response.status },
    };
  } catch (error) {
    return { status: "critical", score: 20, latencyMs: null, reason: error instanceof Error ? error.message : "Probe HTTP falhou.", evidence: { path } };
  }
}

async function supabaseAuthProbe(timeoutMs: number): Promise<ProbeResult> {
  try {
    const supabase = getSupabaseAdmin();
    const { result, latencyMs } = await timed(
      () => supabase.auth.admin.listUsers({ page: 1, perPage: 1 }),
      timeoutMs
    );
    if (result.error) throw result.error;
    return { status: "ok", score: 100, latencyMs, reason: "Supabase Auth respondeu ao probe administrativo.", evidence: { configured: true } };
  } catch (error) {
    return { status: "critical", score: 20, latencyMs: null, reason: error instanceof Error ? error.message : "Supabase Auth indisponível.", evidence: { configured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) } };
  }
}

async function storageProbe(timeoutMs: number): Promise<ProbeResult> {
  try {
    const supabase = getSupabaseAdmin();
    const { result, latencyMs } = await timed(() => supabase.storage.listBuckets(), timeoutMs);
    if (result.error) throw result.error;
    return { status: "ok", score: 100, latencyMs, reason: "Storage respondeu à listagem administrativa read-only.", evidence: { reachable: true } };
  } catch (error) {
    return { status: "critical", score: 25, latencyMs: null, reason: error instanceof Error ? error.message : "Storage indisponível.", evidence: { reachable: false } };
  }
}

async function asaasProbe(timeoutMs: number): Promise<ProbeResult> {
  const baseUrl = String(process.env.ASAAS_BASE_URL || "").replace(/\/$/, "");
  const apiKey = process.env.ASAAS_API_KEY;
  if (!baseUrl || !apiKey) {
    return { status: "unknown", score: 0, latencyMs: null, reason: "Configuração Asaas incompleta.", evidence: { configured: false } };
  }
  try {
    const { result: response, latencyMs } = await timed(
      () => fetch(`${baseUrl}/myAccount/accountNumber`, { method: "GET", cache: "no-store", headers: { accept: "application/json", access_token: apiKey, "User-Agent": "SalaoPremium-OperationalProbe/1.0" } }),
      timeoutMs
    );
    return {
      status: response.ok ? "ok" : response.status >= 500 ? "critical" : "warning",
      score: response.ok ? 100 : response.status >= 500 ? 25 : 60,
      latencyMs,
      reason: response.ok ? "Asaas respondeu ao endpoint read-only da conta." : `Asaas respondeu HTTP ${response.status}.`,
      evidence: { configured: true, status: response.status },
    };
  } catch (error) {
    return { status: "critical", score: 20, latencyMs: null, reason: error instanceof Error ? error.message : "Asaas indisponível.", evidence: { configured: true } };
  }
}

async function brevoProbe(timeoutMs: number): Promise<ProbeResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { status: "unknown", score: 0, latencyMs: null, reason: "BREVO_API_KEY não configurada.", evidence: { configured: false } };
  try {
    const { result: response, latencyMs } = await timed(
      () => fetch("https://api.brevo.com/v3/account", { method: "GET", cache: "no-store", headers: { accept: "application/json", "api-key": apiKey } }),
      timeoutMs
    );
    return { status: response.ok ? "ok" : response.status >= 500 ? "critical" : "warning", score: response.ok ? 100 : 55, latencyMs, reason: response.ok ? "Brevo respondeu ao endpoint read-only da conta." : `Brevo respondeu HTTP ${response.status}.`, evidence: { configured: true, status: response.status } };
  } catch (error) {
    return { status: "critical", score: 20, latencyMs: null, reason: error instanceof Error ? error.message : "Brevo indisponível.", evidence: { configured: true } };
  }
}

async function whatsappProbe(timeoutMs: number): Promise<ProbeResult> {
  const token = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.META_WHATSAPP_API_VERSION || "v23.0";
  if (!token || !phoneId) return { status: "unknown", score: 0, latencyMs: null, reason: "WhatsApp Meta API não está completamente configurada.", evidence: { configured: false } };
  try {
    const { result: response, latencyMs } = await timed(
      () => fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(phoneId)}?fields=id`, { method: "GET", cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
      timeoutMs
    );
    return { status: response.ok ? "ok" : response.status >= 500 ? "critical" : "warning", score: response.ok ? 100 : 55, latencyMs, reason: response.ok ? "WhatsApp Meta API respondeu ao probe read-only." : `WhatsApp respondeu HTTP ${response.status}.`, evidence: { configured: true, status: response.status, provider: "meta" } };
  } catch (error) {
    return { status: "critical", score: 20, latencyMs: null, reason: error instanceof Error ? error.message : "WhatsApp indisponível.", evidence: { configured: true, provider: "meta" } };
  }
}

async function pushProbe(timeoutMs: number): Promise<ProbeResult> {
  const configured = Boolean(process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY && process.env.WEB_PUSH_SUBJECT);
  if (!configured) return { status: "unknown", score: 0, latencyMs: null, reason: "VAPID não está completamente configurado.", evidence: { configured: false } };
  const started = Date.now();
  try {
    const supabase = getSupabaseAdmin() as any;
    const { result, latencyMs } = await timed(
      () => supabase.from("push_delivery_log").select("status, created_at").gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).order("created_at", { ascending: false }).limit(50),
      timeoutMs
    );
    if (result.error) throw result.error;
    const rows = result.data || [];
    if (!rows.length) return { status: "unknown", score: 70, latencyMs, reason: "VAPID configurado, mas sem entrega recente para provar disponibilidade.", evidence: { configured: true, deliveries24h: 0 } };
    const failures = rows.filter((row: any) => /falh|erro|failed/i.test(String(row.status || ""))).length;
    return { status: failures >= Math.max(3, Math.ceil(rows.length * 0.3)) ? "warning" : "ok", score: failures ? 82 : 100, latencyMs: Date.now() - started, reason: failures ? "Há falhas recentes de push, abaixo do limiar crítico." : "Entregas recentes de push sem falha na amostra.", evidence: { configured: true, sampled: rows.length, failures } };
  } catch (error) {
    return { status: "warning", score: 60, latencyMs: null, reason: error instanceof Error ? error.message : "Não foi possível avaliar entregas push.", evidence: { configured: true } };
  }
}

async function webhookProbe(timeoutMs: number): Promise<ProbeResult> {
  try {
    const supabase = getSupabaseAdmin() as any;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { result, latencyMs } = await timed(
      () => supabase.from("asaas_webhook_eventos").select("status_processamento, ultimo_recebido_em").gte("ultimo_recebido_em", since).order("ultimo_recebido_em", { ascending: false }).limit(80),
      timeoutMs
    );
    if (result.error) throw result.error;
    const rows = result.data || [];
    if (!rows.length) return { status: "unknown", score: 70, latencyMs, reason: "Nenhum webhook Asaas nas últimas 24h; ausência de tráfego não prova saúde.", evidence: { events24h: 0 } };
    const errors = rows.filter((row: any) => String(row.status_processamento || "").toLowerCase() === "erro").length;
    const ratio = errors / rows.length;
    return { status: errors >= 5 || ratio >= 0.25 ? "critical" : errors ? "warning" : "ok", score: errors ? Math.max(35, 100 - Math.round(ratio * 100)) : 100, latencyMs, reason: errors ? `${errors} webhook(s) com erro na amostra recente.` : "Webhooks recentes processados sem erro na amostra.", evidence: { events24h: rows.length, errors, errorRate: Number((ratio * 100).toFixed(1)) } };
  } catch (error) {
    return { status: "critical", score: 25, latencyMs: null, reason: error instanceof Error ? error.message : "Falha ao consultar webhooks.", evidence: {} };
  }
}

async function cronProbe(timeoutMs: number): Promise<ProbeResult> {
  try {
    const supabase = getSupabaseAdmin() as any;
    const expected = ["limpar_observabilidade", "renovar_assinaturas", "security_cleanup", "trial_alerts"];
    const { result, latencyMs } = await timed(
      () => supabase.from("eventos_cron").select("nome, status, iniciado_em, finalizado_em").in("nome", expected).order("iniciado_em", { ascending: false }).limit(40),
      timeoutMs
    );
    if (result.error) throw result.error;
    const rows = result.data || [];
    const latest = new Map<string, any>();
    for (const row of rows) if (!latest.has(row.nome)) latest.set(row.nome, row);
    const missing = expected.filter((name) => !latest.has(name));
    const failures = [...latest.values()].filter((row) => /erro|falha|failed/i.test(String(row.status || "")));
    if (missing.length) return { status: "unknown", score: 65, latencyMs, reason: "Ainda não há evidência recente para todos os crons cadastrados.", evidence: { expected: expected.length, observed: latest.size, missing } };
    if (failures.length) return { status: "warning", score: 65, latencyMs, reason: "Existe cron recente com falha.", evidence: { failures: failures.map((row) => row.nome) } };
    return { status: "ok", score: 100, latencyMs, reason: "Crons cadastrados possuem execução observada sem falha na última amostra.", evidence: { expected: expected.length, observed: latest.size } };
  } catch (error) {
    return { status: "warning", score: 55, latencyMs: null, reason: error instanceof Error ? error.message : "Falha ao consultar crons.", evidence: {} };
  }
}

async function professionalAuthProbe(component: OperationalComponentDefinition) {
  if (!process.env.PROFISSIONAL_SESSION_SECRET) return { status: "critical", score: 20, latencyMs: null, reason: "PROFISSIONAL_SESSION_SECRET não configurada no deployment atual.", evidence: { sessionSecretConfigured: false } } satisfies ProbeResult;
  const http = await httpProbe("/app-profissional/login", component.timeoutMs);
  return { ...http, evidence: { ...(http.evidence || {}), sessionSecretConfigured: true } };
}

async function deploymentProbe(): Promise<ProbeResult> {
  const configured = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL);
  return configured
    ? { status: "ok", score: 100, latencyMs: 0, reason: "Runtime identifica o deployment Vercel atual.", evidence: { environment: process.env.VERCEL_ENV || "production", commitShaPresent: Boolean(commitSha()) } }
    : { status: "unknown", score: 0, latencyMs: null, reason: "Metadados de deployment Vercel não disponíveis neste runtime.", evidence: { environment: "unknown" } };
}

async function runProbe(component: OperationalComponentDefinition): Promise<ProbeResult> {
  switch (component.componentKey) {
    case "platform.site": return httpProbe("/", component.timeoutMs);
    case "platform.api": return httpProbe("/api/healthz", component.timeoutMs);
    case "infra.vercel.runtime": return deploymentProbe();
    case "supabase.database":
    case "supabase.data_api": return databaseProbe("saloes", component.timeoutMs);
    case "supabase.auth": return supabaseAuthProbe(component.timeoutMs);
    case "supabase.storage": return storageProbe(component.timeoutMs);
    case "client.auth": return httpProbe("/app-cliente/login", component.timeoutMs);
    case "client.explore": return databaseProbe("saloes", component.timeoutMs);
    case "client.availability":
    case "client.appointments":
    case "professional.agenda":
    case "agenda.core": return databaseProbe("agendamentos", component.timeoutMs);
    case "professional.auth": return professionalAuthProbe(component);
    case "admin.dashboard": return databaseProbe("saloes", component.timeoutMs);
    case "admin.master": return databaseProbe("admin_master_usuarios", component.timeoutMs);
    case "admin.health": return databaseProbe("eventos_sistema", component.timeoutMs);
    case "cash.core": return databaseProbe("comandas", component.timeoutMs);
    case "subscriptions.core": return databaseProbe("assinaturas", component.timeoutMs);
    case "integration.asaas.api": return asaasProbe(component.timeoutMs);
    case "integration.asaas.webhooks": return webhookProbe(component.timeoutMs);
    case "communication.brevo": return brevoProbe(component.timeoutMs);
    case "communication.whatsapp": return whatsappProbe(component.timeoutMs);
    case "communication.push_vapid": return pushProbe(component.timeoutMs);
    case "automation.cron": return cronProbe(component.timeoutMs);
    default: return { status: "unknown", score: 0, latencyMs: null, reason: "Componente sem probe sintético ativo; estado depende de telemetria.", evidence: { probeKey: component.probeKey || null } };
  }
}

export async function runOperationalProbes() {
  const components = listOperationalComponents().filter((component) => Boolean(component.probeKey));
  const results: Array<{ componentKey: string; status: ProbeStatus; reason: string }> = [];

  for (const component of components) {
    const result = await runProbe(component);
    await recordProbe(component, result);
    results.push({ componentKey: component.componentKey, status: result.status, reason: result.reason });
  }

  return results;
}

export async function recordUnknownProbeForComponent(componentKey: string, reason: string) {
  const component = getOperationalComponent(componentKey);
  if (!component?.probeKey) return;
  await recordProbe(component, { status: "unknown", score: 0, latencyMs: null, reason, evidence: {} });
}
