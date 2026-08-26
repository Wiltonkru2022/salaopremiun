import "server-only";

import { isGoogleCalendarConfigured } from "@/lib/google-calendar/oauth";
import {
  getOperationalComponent,
  getOperationalProbeKey,
  listOperationalComponents,
  type OperationalComponentDefinition,
} from "@/lib/monitoring/operational-components";
import { getDatabaseAdmin } from "@/lib/db/admin";

export type ProbeStatus = "ok" | "warning" | "critical" | "unknown";

type ProbeResult = {
  status: ProbeStatus;
  score: number;
  latencyMs: number | null;
  reason: string;
  evidence?: Record<string, unknown>;
};

type ProbeSummary = {
  componentKey: string;
  status: ProbeStatus;
  reason: string;
};

const OPERATIONAL_PROBE_CONCURRENCY = 4;
const DATABASE_PROBE_TIMEOUT_MS = 10_000;
const deploymentId = () => process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || null;
const commitSha = () => process.env.VERCEL_GIT_COMMIT_SHA || null;

function appOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const normalized = String(raw || "").trim().replace(/\/$/, "");
  if (!normalized) return "";
  return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
}

async function timed(operation: () => PromiseLike<unknown> | unknown, timeoutMs: number) {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const result = await Promise.race([
      Promise.resolve(operation()),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("probe_timeout")), timeoutMs);
      }),
    ]);
    return { result: result as any, latencyMs: Date.now() - started };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function recordProbe(component: OperationalComponentDefinition, result: ProbeResult) {
  const db = getDatabaseAdmin() as any;
  const { error } = await db.rpc("fn_operational_record_probe", {
    p_component_key: component.componentKey,
    p_probe_key: getOperationalProbeKey(component),
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
    p_probe_version: "operational-health-v5-neon",
  });
  if (error) throw error;
}

async function databaseProbe(table: string, timeoutMs: number): Promise<ProbeResult> {
  try {
    const db = getDatabaseAdmin() as any;
    const { result, latencyMs } = await timed(
      () => db.from(table).select("id").limit(1),
      Math.max(timeoutMs, DATABASE_PROBE_TIMEOUT_MS)
    );
    if (result.error) throw result.error;
    return {
      status: "ok",
      score: latencyMs < 1500 ? 100 : 85,
      latencyMs,
      reason: "Leitura canário no Neon concluída.",
      evidence: { table, readable: true, provider: "neon" },
    };
  } catch (error) {
    return {
      status: "critical",
      score: 20,
      latencyMs: null,
      reason: error instanceof Error ? error.message : "Falha na leitura canário do Neon.",
      evidence: { table, readable: false, provider: "neon" },
    };
  }
}

async function httpProbe(path: string, timeoutMs: number): Promise<ProbeResult> {
  const origin = appOrigin();
  if (!origin) {
    return { status: "unknown", score: 0, latencyMs: null, reason: "Origem pública não configurada." };
  }
  try {
    const { result: response, latencyMs } = await timed(
      () =>
        fetch(`${origin}${path}`, {
          method: "GET",
          cache: "no-store",
          redirect: "manual",
          headers: { "User-Agent": "SalaoPremium-OperationalProbe/5.0" },
        }),
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
    return {
      status: "critical",
      score: 20,
      latencyMs: null,
      reason: error instanceof Error ? error.message : "Probe HTTP falhou.",
      evidence: { path },
    };
  }
}

async function clerkAuthProbe(timeoutMs: number): Promise<ProbeResult> {
  const configured = Boolean(
    process.env.CLERK_SECRET_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  );
  if (!configured) {
    return {
      status: "critical",
      score: 20,
      latencyMs: null,
      reason: "Clerk não está configurado neste runtime.",
      evidence: { configured: false, provider: "clerk" },
    };
  }
  const http = await httpProbe("/login", timeoutMs);
  return {
    ...http,
    reason:
      http.status === "ok"
        ? "Rota de login Clerk respondeu e a configuração está presente."
        : http.reason,
    evidence: { ...(http.evidence || {}), configured: true, provider: "clerk" },
  };
}

async function cloudinaryProbe(): Promise<ProbeResult> {
  const configured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
  return configured
    ? {
        status: "ok",
        score: 90,
        latencyMs: 0,
        reason: "Cloudinary está configurado para armazenamento de mídia.",
        evidence: { configured: true, provider: "cloudinary" },
      }
    : {
        status: "warning",
        score: 55,
        latencyMs: null,
        reason: "Configuração Cloudinary incompleta.",
        evidence: { configured: false, provider: "cloudinary" },
      };
}

async function syncProbe(timeoutMs: number): Promise<ProbeResult> {
  const result = await databaseProbe("agendamentos", timeoutMs);
  return {
    ...result,
    reason:
      result.status === "ok"
        ? "Sincronização por API/Neon disponível; apps usam atualização periódica sem canal Realtime externo."
        : result.reason,
    evidence: { ...(result.evidence || {}), mode: "api_polling" },
  };
}

async function asaasProbe(timeoutMs: number): Promise<ProbeResult> {
  const baseUrl = String(process.env.ASAAS_BASE_URL || "").replace(/\/$/, "");
  const apiKey = process.env.ASAAS_API_KEY;
  if (!baseUrl || !apiKey) {
    return { status: "unknown", score: 0, latencyMs: null, reason: "Configuração Asaas incompleta." };
  }
  try {
    const { result: response, latencyMs } = await timed(
      () =>
        fetch(`${baseUrl}/myAccount/accountNumber`, {
          method: "GET",
          cache: "no-store",
          headers: {
            accept: "application/json",
            access_token: apiKey,
            "User-Agent": "SalaoPremium-OperationalProbe/5.0",
          },
        }),
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
    return { status: "critical", score: 20, latencyMs: null, reason: error instanceof Error ? error.message : "Asaas indisponível." };
  }
}

async function brevoProbe(timeoutMs: number): Promise<ProbeResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { status: "unknown", score: 0, latencyMs: null, reason: "BREVO_API_KEY não configurada." };
  try {
    const { result: response, latencyMs } = await timed(
      () => fetch("https://api.brevo.com/v3/account", { method: "GET", cache: "no-store", headers: { accept: "application/json", "api-key": apiKey } }),
      timeoutMs
    );
    return { status: response.ok ? "ok" : response.status >= 500 ? "critical" : "warning", score: response.ok ? 100 : 55, latencyMs, reason: response.ok ? "Brevo respondeu ao endpoint read-only da conta." : `Brevo respondeu HTTP ${response.status}.` };
  } catch (error) {
    return { status: "critical", score: 20, latencyMs: null, reason: error instanceof Error ? error.message : "Brevo indisponível." };
  }
}

async function whatsappProbe(timeoutMs: number): Promise<ProbeResult> {
  const token = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.META_WHATSAPP_API_VERSION || "v23.0";
  if (!token || !phoneId) {
    return { status: "unknown", score: 0, latencyMs: null, reason: "WhatsApp Meta API não está completamente configurada." };
  }
  try {
    const { result: response, latencyMs } = await timed(
      () => fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(phoneId)}?fields=id`, { method: "GET", cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
      timeoutMs
    );
    return { status: response.ok ? "ok" : response.status >= 500 ? "critical" : "warning", score: response.ok ? 100 : 55, latencyMs, reason: response.ok ? "WhatsApp Meta API respondeu ao probe read-only." : `WhatsApp respondeu HTTP ${response.status}.` };
  } catch (error) {
    return { status: "critical", score: 20, latencyMs: null, reason: error instanceof Error ? error.message : "WhatsApp indisponível." };
  }
}

async function pushProbe(timeoutMs: number): Promise<ProbeResult> {
  const configured = Boolean(
    process.env.WEB_PUSH_PUBLIC_KEY &&
      process.env.WEB_PUSH_PRIVATE_KEY &&
      process.env.WEB_PUSH_SUBJECT
  );
  if (!configured) return { status: "unknown", score: 0, latencyMs: null, reason: "VAPID não está completamente configurado." };
  try {
    const db = getDatabaseAdmin() as any;
    const { result, latencyMs } = await timed(
      () => db.from("push_delivery_log").select("status, created_at").gte("created_at", new Date(Date.now() - 86400000).toISOString()).order("created_at", { ascending: false }).limit(50),
      timeoutMs
    );
    if (result.error) throw result.error;
    const rows = result.data || [];
    if (!rows.length) return { status: "unknown", score: 70, latencyMs, reason: "VAPID configurado, mas sem entrega recente." };
    const failures = rows.filter((row: any) => /falh|erro|failed/i.test(String(row.status || ""))).length;
    return { status: failures >= Math.max(3, Math.ceil(rows.length * 0.3)) ? "warning" : "ok", score: failures ? 82 : 100, latencyMs, reason: failures ? "Há falhas recentes de push abaixo do limiar crítico." : "Entregas recentes de push sem falha na amostra." };
  } catch (error) {
    return { status: "warning", score: 60, latencyMs: null, reason: error instanceof Error ? error.message : "Não foi possível avaliar entregas push." };
  }
}

async function webhookProbe(timeoutMs: number): Promise<ProbeResult> {
  try {
    const db = getDatabaseAdmin() as any;
    const { result, latencyMs } = await timed(
      () => db.from("asaas_webhook_eventos").select("status_processamento, ultimo_recebido_em").gte("ultimo_recebido_em", new Date(Date.now() - 86400000).toISOString()).order("ultimo_recebido_em", { ascending: false }).limit(80),
      timeoutMs
    );
    if (result.error) throw result.error;
    const rows = result.data || [];
    if (!rows.length) return { status: "unknown", score: 70, latencyMs, reason: "Nenhum webhook Asaas nas últimas 24h." };
    const errors = rows.filter((row: any) => String(row.status_processamento || "").toLowerCase() === "erro").length;
    const ratio = errors / rows.length;
    return { status: errors >= 5 || ratio >= 0.25 ? "critical" : errors ? "warning" : "ok", score: errors ? Math.max(35, 100 - Math.round(ratio * 100)) : 100, latencyMs, reason: errors ? `${errors} webhook(s) com erro na amostra recente.` : "Webhooks recentes processados sem erro." };
  } catch (error) {
    return { status: "critical", score: 25, latencyMs: null, reason: error instanceof Error ? error.message : "Falha ao consultar webhooks." };
  }
}

async function googleCalendarProbe(timeoutMs: number): Promise<ProbeResult> {
  if (!isGoogleCalendarConfigured()) {
    return { status: "unknown", score: 0, latencyMs: null, reason: "Google Calendar não está completamente configurado." };
  }
  return databaseProbe("saloes_google_calendar_connections", timeoutMs);
}

async function cronProbe(timeoutMs: number): Promise<ProbeResult> {
  try {
    const db = getDatabaseAdmin() as any;
    const { result, latencyMs } = await timed(
      () => db.from("eventos_cron").select("nome, status, iniciado_em").order("iniciado_em", { ascending: false }).limit(40),
      timeoutMs
    );
    if (result.error) throw result.error;
    const rows = result.data || [];
    if (!rows.length) return { status: "unknown", score: 65, latencyMs, reason: "Ainda não há evidência recente de cron." };
    const failures = rows.filter((row: any) => /erro|falha|failed/i.test(String(row.status || ""))).length;
    return { status: failures ? "warning" : "ok", score: failures ? 60 : 100, latencyMs, reason: failures ? "Existe cron recente com falha." : "Crons recentes sem falha na amostra." };
  } catch (error) {
    return { status: "warning", score: 55, latencyMs: null, reason: error instanceof Error ? error.message : "Falha ao consultar crons." };
  }
}

async function professionalAuthProbe(component: OperationalComponentDefinition) {
  if (!process.env.PROFISSIONAL_SESSION_SECRET) {
    return { status: "critical", score: 20, latencyMs: null, reason: "PROFISSIONAL_SESSION_SECRET não configurada." } satisfies ProbeResult;
  }
  return httpProbe("/app-profissional/login", component.timeoutMs);
}

async function deploymentProbe(): Promise<ProbeResult> {
  const configured = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL);
  return configured
    ? { status: "ok", score: 100, latencyMs: 0, reason: "Runtime identifica o deployment atual." }
    : { status: "unknown", score: 0, latencyMs: null, reason: "Metadados de deployment não disponíveis neste runtime." };
}

async function runProbe(component: OperationalComponentDefinition): Promise<ProbeResult> {
  switch (component.componentKey) {
    case "platform.site": return httpProbe("/", component.timeoutMs);
    case "platform.api": return httpProbe("/api/healthz", component.timeoutMs);
    case "platform.assets": return httpProbe("/favicon.ico", component.timeoutMs);
    case "infra.vercel.runtime": return deploymentProbe();
    case "neon.database": return databaseProbe("saloes", component.timeoutMs);
    case "neon.gateway": return databaseProbe("saloes", component.timeoutMs);
    case "clerk.auth": return clerkAuthProbe(component.timeoutMs);
    case "cloudinary.storage": return cloudinaryProbe();
    case "neon.sync": return syncProbe(component.timeoutMs);
    case "client.auth": return httpProbe("/app-cliente/login", component.timeoutMs);
    case "client.registration": return httpProbe("/app-cliente/cadastro", component.timeoutMs);
    case "client.explore":
    case "client.salon": return databaseProbe("saloes", component.timeoutMs);
    case "client.availability":
    case "client.appointments":
    case "professional.agenda":
    case "agenda.core": return databaseProbe("agendamentos", component.timeoutMs);
    case "client.profile":
    case "professional.clients":
    case "crm.core": return databaseProbe("clientes", component.timeoutMs);
    case "client.reviews": return databaseProbe("clientes_avaliacoes", component.timeoutMs);
    case "client.favorites": return databaseProbe("clientes_app_favoritos", component.timeoutMs);
    case "client.pwa": return httpProbe("/app-cliente/manifest.webmanifest", component.timeoutMs);
    case "client.push":
    case "professional.push": return pushProbe(component.timeoutMs);
    case "professional.auth": return professionalAuthProbe(component);
    case "professional.services":
    case "services.core": return databaseProbe("servicos", component.timeoutMs);
    case "professional.pwa": return httpProbe("/app-profissional-manifest.webmanifest", component.timeoutMs);
    case "professional.commands": return databaseProbe("comandas", component.timeoutMs);
    case "professional.cash": return databaseProbe("comanda_pagamentos", component.timeoutMs);
    case "admin.dashboard": return databaseProbe("saloes", component.timeoutMs);
    case "admin.master": return databaseProbe("admin_master_usuarios", component.timeoutMs);
    case "admin.health": return databaseProbe("eventos_sistema", component.timeoutMs);
    case "cash.core": return databaseProbe("comandas", component.timeoutMs);
    case "subscriptions.core": return databaseProbe("assinaturas", component.timeoutMs);
    case "integration.asaas.api": return asaasProbe(component.timeoutMs);
    case "integration.asaas.webhooks": return webhookProbe(component.timeoutMs);
    case "integration.google_calendar": return googleCalendarProbe(component.timeoutMs);
    case "communication.brevo": return brevoProbe(component.timeoutMs);
    case "communication.whatsapp": return whatsappProbe(component.timeoutMs);
    case "communication.push_vapid": return pushProbe(component.timeoutMs);
    case "automation.cron": return cronProbe(component.timeoutMs);
    default:
      return { status: "unknown", score: 0, latencyMs: null, reason: "Componente sem probe sintético ativo; estado depende de telemetria." };
  }
}

function probeExecutionKey(component: OperationalComponentDefinition) {
  switch (component.componentKey) {
    case "neon.database":
    case "neon.gateway":
    case "client.explore":
    case "client.salon":
    case "admin.dashboard": return "db:saloes";
    case "neon.sync":
    case "client.availability":
    case "client.appointments":
    case "professional.agenda":
    case "agenda.core": return "db:agendamentos";
    case "client.profile":
    case "professional.clients":
    case "crm.core": return "db:clientes";
    case "professional.services":
    case "services.core": return "db:servicos";
    case "professional.commands":
    case "cash.core": return "db:comandas";
    case "client.push":
    case "professional.push":
    case "communication.push_vapid": return "push:delivery";
    default: return component.componentKey;
  }
}

export async function runOperationalProbes() {
  const components = listOperationalComponents();
  const results: ProbeSummary[] = [];
  const sharedRuns = new Map<string, Promise<ProbeResult>>();
  let cursor = 0;

  const worker = async () => {
    while (cursor < components.length) {
      const component = components[cursor++];
      if (!component) return;
      const executionKey = probeExecutionKey(component);
      let probePromise = sharedRuns.get(executionKey);
      if (!probePromise) {
        probePromise = runProbe(component);
        sharedRuns.set(executionKey, probePromise);
      }

      let result: ProbeResult;
      try {
        result = await probePromise;
      } catch (error) {
        result = {
          status: "unknown",
          score: 0,
          latencyMs: null,
          reason: error instanceof Error ? error.message : "Falha inesperada ao executar probe.",
          evidence: { executionKey },
        };
      }

      try {
        await recordProbe(component, result);
      } catch (error) {
        console.error("[OPERATIONAL_PROBE_RECORD_FAILED]", {
          componentKey: component.componentKey,
          message: error instanceof Error ? error.message : "Falha ao registrar probe.",
        });
      }

      results.push({ componentKey: component.componentKey, status: result.status, reason: result.reason });
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(OPERATIONAL_PROBE_CONCURRENCY, components.length) },
      () => worker()
    )
  );
  return results;
}

export async function recordUnknownProbeForComponent(componentKey: string, reason: string) {
  const component = getOperationalComponent(componentKey);
  if (!component) return;
  await recordProbe(component, {
    status: "unknown",
    score: 0,
    latencyMs: null,
    reason,
    evidence: {},
  });
}
