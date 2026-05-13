import "server-only";

const DEFAULT_ORACLE_VPS_API_URL = "https://api.salaopremiun.com.br";

export type OracleVpsApiStatus =
  | {
      configured: false;
      ok: false;
      error: string;
    }
  | {
      configured: true;
      ok: boolean;
      publicStatus: unknown;
      system: unknown;
      monitoringSummary: unknown;
      monitoringErrors: unknown;
      monitoringPerformance: unknown;
      jobs: unknown;
      checkedAt: string;
      error?: string;
    };

type OracleVpsRequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  protected?: boolean;
  timeoutMs?: number;
  headers?: Record<string, string>;
};

function getOracleVpsConfig() {
  const baseUrl = String(
    process.env.ORACLE_VPS_API_URL || DEFAULT_ORACLE_VPS_API_URL
  ).replace(/\/+$/, "");
  const token = String(process.env.ORACLE_VPS_API_TOKEN || "").trim();

  return {
    baseUrl,
    token,
    configured: Boolean(baseUrl && token),
  };
}

async function requestOracleVps(
  path: string,
  options: OracleVpsRequestOptions = {}
) {
  const config = getOracleVpsConfig();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (options.protected) {
    if (!config.token) {
      throw new Error("ORACLE_VPS_API_TOKEN nao configurado.");
    }

    headers.Authorization = `Bearer ${config.token}`;
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
    signal: AbortSignal.timeout(options.timeoutMs || 7000),
  });

  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `Oracle VPS API respondeu ${response.status}: ${
        typeof data === "string" ? data : JSON.stringify(data)
      }`
    );
  }

  return data;
}

export async function getOracleVpsStatus(): Promise<OracleVpsApiStatus> {
  const config = getOracleVpsConfig();

  if (!config.configured) {
    return {
      configured: false,
      ok: false,
      error:
        "Integração da VPS Oracle ainda não configurada. Defina ORACLE_VPS_API_URL e ORACLE_VPS_API_TOKEN no ambiente.",
    };
  }

  try {
    const [
      publicStatus,
      system,
      monitoringSummary,
      monitoringErrors,
      monitoringPerformance,
      jobs,
    ] = await Promise.all([
      requestOracleVps("/status"),
      requestOracleVps("/admin/system", { protected: true }),
      requestOracleVps("/admin/monitoring/summary", { protected: true }),
      requestOracleVps("/admin/monitoring/errors?limit=5", { protected: true }),
      requestOracleVps("/admin/monitoring/performance", { protected: true }),
      requestOracleVps("/admin/jobs?limit=10", { protected: true }),
    ]);

    return {
      configured: true,
      ok: true,
      publicStatus,
      system,
      monitoringSummary,
      monitoringErrors,
      monitoringPerformance,
      jobs,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      publicStatus: null,
      system: null,
      monitoringSummary: null,
      monitoringErrors: null,
      monitoringPerformance: null,
      jobs: null,
      checkedAt: new Date().toISOString(),
      error:
        error instanceof Error
          ? error.message
          : "Falha ao consultar a VPS Oracle.",
    };
  }
}

export async function sendOracleVpsPing(payload?: Record<string, unknown>) {
  const config = getOracleVpsConfig();

  if (!config.configured) {
    return {
      ok: false,
      configured: false,
      error:
        "Integração da VPS Oracle ainda não configurada. Defina ORACLE_VPS_API_URL e ORACLE_VPS_API_TOKEN no ambiente.",
    };
  }

  try {
    const result = await requestOracleVps("/jobs/ping", {
      method: "POST",
      protected: true,
      timeoutMs: 5000,
      body: {
        source: "salaopremium-next",
        ...payload,
        sentAt: new Date().toISOString(),
      },
    });

    return {
      ok: true,
      configured: true,
      result,
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao enviar ping para a VPS Oracle.",
    };
  }
}

export async function sendOracleVpsMonitoringEvent(
  payload: Record<string, unknown>
) {
  const config = getOracleVpsConfig();

  if (!config.configured) {
    return { ok: false, configured: false };
  }

  try {
    await requestOracleVps("/monitoring/event", {
      method: "POST",
      protected: true,
      timeoutMs: 2500,
      body: {
        source: "salaopremium-next",
        ...payload,
        mirroredAt: new Date().toISOString(),
      },
    });

    return { ok: true, configured: true };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao espelhar evento para a VPS Oracle.",
    };
  }
}

export async function mirrorAsaasWebhookToOracleVps(
  payload: Record<string, unknown>
) {
  const config = getOracleVpsConfig();
  const asaasWebhookToken = String(process.env.ASAAS_WEBHOOK_TOKEN || "").trim();

  if (!config.configured || !asaasWebhookToken) {
    return { ok: false, configured: config.configured };
  }

  try {
    const result = await requestOracleVps("/webhooks/asaas", {
      method: "POST",
      timeoutMs: 2500,
      body: {
        source: "salaopremium-next",
        mode: "mirror",
        mirroredAt: new Date().toISOString(),
        payload,
      },
      headers: {
        "asaas-access-token": asaasWebhookToken,
      },
    });

    return {
      ok: true,
      configured: true,
      result,
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao espelhar webhook Asaas para a VPS Oracle.",
    };
  }
}

export async function queueOracleVpsBackup(payload?: Record<string, unknown>) {
  return requestOracleVps("/jobs/backup/supabase", {
    method: "POST",
    protected: true,
    timeoutMs: 5000,
    body: {
      mode: "metadata_only",
      source: "salaopremium-next",
      ...payload,
    },
  });
}

export async function queueOracleVpsNotificationProcessing(
  payload?: Record<string, unknown>
) {
  return requestOracleVps("/jobs/notifications/process", {
    method: "POST",
    protected: true,
    timeoutMs: 5000,
    body: {
      dryRun: true,
      source: "salaopremium-next",
      ...payload,
    },
  });
}

export async function queueOracleVpsReport(payload?: Record<string, unknown>) {
  return requestOracleVps("/jobs/reports/generate", {
    method: "POST",
    protected: true,
    timeoutMs: 5000,
    body: {
      dryRun: true,
      source: "salaopremium-next",
      ...payload,
    },
  });
}

async function getOracleVpsProtectedReport(path: string) {
  const config = getOracleVpsConfig();

  if (!config.configured) {
    return {
      configured: false,
      ok: false,
      error:
        "Integração da VPS Oracle ainda não configurada. Defina ORACLE_VPS_API_URL e ORACLE_VPS_API_TOKEN no ambiente.",
    };
  }

  try {
    const result = await requestOracleVps(path, {
      protected: true,
      timeoutMs: 5000,
    });

    return {
      configured: true,
      ok: true,
      result,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao consultar relatório na VPS Oracle.",
    };
  }
}

export async function getOracleVpsSalesReport() {
  return getOracleVpsProtectedReport("/relatorios/vendas");
}

export async function getOracleVpsProfessionalsReport() {
  return getOracleVpsProtectedReport("/relatorios/profissionais");
}
