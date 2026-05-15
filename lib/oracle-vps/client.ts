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
      backups: unknown;
      reprocess: unknown;
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

export async function requestOracleVpsProtected<T = unknown>(
  path: string,
  options: Omit<OracleVpsRequestOptions, "protected"> = {}
): Promise<T> {
  return requestOracleVps(path, {
    ...options,
    protected: true,
  }) as Promise<T>;
}

type OracleVpsOperationalCheck = {
  modulo: string;
  rota: string;
  ok: boolean;
  status: "online" | "falhou" | "nao_configurado";
  detalhe: string;
  amostra?: string;
};

function buildQuery(params: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim()) {
      query.set(key, String(value));
    }
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

async function checkOracleVpsGet(params: {
  modulo: string;
  path: string;
  amostra?: string;
}): Promise<OracleVpsOperationalCheck> {
  const config = getOracleVpsConfig();

  if (!config.configured) {
    return {
      modulo: params.modulo,
      rota: params.path,
      ok: false,
      status: "nao_configurado",
      detalhe: "Variáveis da VPS não configuradas.",
      amostra: params.amostra,
    };
  }

  try {
    await requestOracleVps(params.path, {
      protected: true,
      timeoutMs: 6000,
    });

    return {
      modulo: params.modulo,
      rota: params.path,
      ok: true,
      status: "online",
      detalhe: "Respondendo com dados reais.",
      amostra: params.amostra,
    };
  } catch (error) {
    return {
      modulo: params.modulo,
      rota: params.path,
      ok: false,
      status: "falhou",
      detalhe:
        error instanceof Error
          ? error.message
          : "Falha ao consultar rota operacional.",
      amostra: params.amostra,
    };
  }
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
      backups,
      reprocess,
    ] = await Promise.all([
      requestOracleVps("/status"),
      requestOracleVps("/admin/system", { protected: true }),
      requestOracleVps("/admin/monitoring/summary", { protected: true }),
      requestOracleVps("/admin/monitoring/errors?limit=5", { protected: true }),
      requestOracleVps("/admin/monitoring/performance", { protected: true }),
      requestOracleVps("/admin/jobs?limit=10", { protected: true }),
      requestOracleVps("/backup", { protected: true }),
      requestOracleVps("/admin/reprocess", { protected: true }),
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
      backups,
      reprocess,
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
      backups: null,
      reprocess: null,
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

export async function sendOracleVpsSecurityEvent(
  payload: Record<string, unknown>
) {
  const config = getOracleVpsConfig();

  if (!config.configured) {
    return { ok: false, configured: false };
  }

  try {
    await requestOracleVps("/monitoring/security-event", {
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
          : "Falha ao espelhar evento de seguranca para a VPS Oracle.",
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

export async function processAsaasWebhookOnOracleVps(
  body: Record<string, unknown>
) {
  const config = getOracleVpsConfig();
  const asaasWebhookToken = String(process.env.ASAAS_WEBHOOK_TOKEN || "").trim();

  if (!config.configured || !asaasWebhookToken) {
    return { ok: false, configured: config.configured, error: "VPS ou token Asaas não configurado." };
  }

  try {
    const result = await requestOracleVps("/webhooks/asaas", {
      method: "POST",
      timeoutMs: 10000,
      body,
      headers: {
        "asaas-access-token": asaasWebhookToken,
      },
    });

    return { ok: true, configured: true, result };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao processar webhook Asaas na VPS Oracle.",
    };
  }
}

export async function queueOracleVpsBackup(payload?: Record<string, unknown>) {
  return requestOracleVps("/backup/executar", {
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

export async function queueOracleVpsCleanup(payload?: Record<string, unknown>) {
  return requestOracleVps("/admin/cleanup", {
    method: "POST",
    protected: true,
    timeoutMs: 5000,
    body: {
      source: "salaopremium-next",
      ...payload,
    },
  });
}

export async function getOracleVpsSecurityEvents(params?: {
  limit?: number;
  risco?: string | null;
  evento?: string | null;
  tipoUsuario?: string | null;
}) {
  const query = buildQuery({
    limit: params?.limit || 80,
    risco: params?.risco || null,
    evento: params?.evento || null,
    tipo_usuario: params?.tipoUsuario || null,
  });

  return requestOracleVps(`/admin/security/events${query}`, {
    protected: true,
    timeoutMs: 7000,
  }) as Promise<{
    ok: boolean;
    service: string;
    provider: string;
    total: number;
    byRisk?: Record<string, number>;
    byEvent?: Record<string, number>;
    items?: Record<string, unknown>[];
  }>;
}

export async function queueOracleVpsSecurityCleanup(
  payload?: Record<string, unknown>
) {
  return requestOracleVps("/admin/security/cleanup", {
    method: "POST",
    protected: true,
    timeoutMs: 7000,
    body: {
      source: "salaopremium-next",
      securityRetentionDays: 90,
      ...payload,
    },
  });
}

export async function queueOracleVpsNotificationProcessing(
  payload?: Record<string, unknown>
) {
  return requestOracleVps("/notificacoes/processar", {
    method: "POST",
    protected: true,
    timeoutMs: 5000,
    body: {
      limit: 50,
      source: "salaopremium-next",
      ...payload,
    },
  });
}

export async function queueOracleVpsTrialAlerts(
  payload?: Record<string, unknown>
) {
  return requestOracleVps("/jobs/trial-alerts/process", {
    method: "POST",
    protected: true,
    timeoutMs: 12000,
    body: {
      limit: 80,
      source: "salaopremium-next",
      ...payload,
    },
  });
}

export async function sendOracleVpsTrialAlertNow(
  payload: Record<string, unknown>
) {
  return requestOracleVps("/trial-alerts/send-now", {
    method: "POST",
    protected: true,
    timeoutMs: 12000,
    body: {
      source: "salaopremium-next",
      ...payload,
    },
  });
}

export async function extendOracleVpsTrial(
  payload: Record<string, unknown>
) {
  return requestOracleVps("/trial-alerts/extend", {
    method: "POST",
    protected: true,
    timeoutMs: 12000,
    body: {
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

export async function getOracleVpsOperationalSnapshot(params?: {
  idSalao?: string | null;
  salaoNome?: string | null;
}) {
  const idSalao = String(params?.idSalao || "").trim();
  const amostra = params?.salaoNome
    ? `${params.salaoNome} (${idSalao || "sem id"})`
    : idSalao || "sem salão de amostra";

  if (!idSalao) {
    return {
      ok: false,
      checkedAt: new Date().toISOString(),
      amostra,
      total: 0,
      online: 0,
      failed: 0,
      items: [
        {
          modulo: "Amostra",
          rota: "-",
          ok: false,
          status: "falhou" as const,
          detalhe: "Nenhum salão encontrado para testar as APIs operacionais.",
          amostra,
        },
      ] satisfies OracleVpsOperationalCheck[],
    };
  }

  const query = buildQuery({ id_salao: idSalao, limit: 5 });
  const checks = await Promise.all([
    checkOracleVpsGet({
      modulo: "Caixa",
      path: `/caixa${query}`,
      amostra,
    }),
    checkOracleVpsGet({
      modulo: "Vendas",
      path: `/vendas${query}`,
      amostra,
    }),
    checkOracleVpsGet({
      modulo: "Comissões",
      path: `/comissoes${query}`,
      amostra,
    }),
    checkOracleVpsGet({
      modulo: "Relatório financeiro",
      path: `/relatorio-financeiro${query}`,
      amostra,
    }),
    checkOracleVpsGet({
      modulo: "Notificações",
      path: `/notificacoes${query}`,
      amostra,
    }),
    checkOracleVpsGet({
      modulo: "App Cliente",
      path: "/app-cliente/saloes?limit=3",
      amostra,
    }),
    checkOracleVpsGet({
      modulo: "App Profissional",
      path: `/app-profissional/agenda${buildQuery({
        id_salao: idSalao,
        id_profissional: "health-check",
        limit: 1,
      })}`,
      amostra,
    }),
    checkOracleVpsGet({
      modulo: "Backup",
      path: "/backup",
      amostra,
    }),
    checkOracleVpsGet({
      modulo: "Reprocessamento",
      path: "/admin/reprocess",
      amostra,
    }),
    checkOracleVpsGet({
      modulo: "Limpeza de logs",
      path: "/admin/jobs?limit=5",
      amostra,
    }),
  ]);

  const online = checks.filter((item) => item.ok).length;

  return {
    ok: online === checks.length,
    checkedAt: new Date().toISOString(),
    amostra,
    total: checks.length,
    online,
    failed: checks.length - online,
    items: checks,
  };
}

async function safeOracleVpsPost(
  path: string,
  payload: Record<string, unknown>,
  timeoutMs = 2500
) {
  const config = getOracleVpsConfig();

  if (!config.configured) {
    return { ok: false, configured: false };
  }

  try {
    const result = await requestOracleVps(path, {
      method: "POST",
      protected: true,
      timeoutMs,
      body: {
        source: "salaopremium-next",
        mirroredAt: new Date().toISOString(),
        ...payload,
      },
    });

    return { ok: true, configured: true, result };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao enviar operação para a VPS Oracle.",
    };
  }
}

export async function mirrorOracleVpsCaixaOperation(payload: {
  idSalao?: string;
  acao?: string;
  requestBody?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
}) {
  if (payload.acao === "fechar_caixa") {
    const sessao = (payload.requestBody?.sessao || {}) as Record<string, unknown>;
    return safeOracleVpsPost("/caixa/fechar", {
      id_salao: payload.idSalao,
      id_sessao: sessao.idSessao || null,
      valor_fechamento_informado: sessao.valorFechamento || 0,
      acao: payload.acao,
      response: payload.responseBody || null,
    });
  }

  return safeOracleVpsPost("/webhooks/internal", {
    type: "caixa:processar",
    id_salao: payload.idSalao || null,
    acao: payload.acao || null,
    request: payload.requestBody || null,
    response: payload.responseBody || null,
  });
}

export async function mirrorOracleVpsVendaOperation(payload: {
  idSalao?: string;
  acao?: string;
  idComanda?: string;
  responseBody?: Record<string, unknown>;
}) {
  return safeOracleVpsPost("/webhooks/internal", {
    type: "vendas:processar",
    id_salao: payload.idSalao || null,
    acao: payload.acao || null,
    id_comanda: payload.idComanda || null,
    response: payload.responseBody || null,
  });
}

export async function mirrorOracleVpsComissoesOperation(payload: {
  idSalao?: string;
  acao?: string;
  ids?: string[];
  responseBody?: Record<string, unknown>;
}) {
  return safeOracleVpsPost("/comissoes/calcular", {
    id_salao: payload.idSalao,
    acao: payload.acao || null,
    ids: payload.ids || [],
    response: payload.responseBody || null,
  });
}

export async function mirrorOracleVpsNotificationProcessing(
  payload: Record<string, unknown>
) {
  return safeOracleVpsPost(
    "/notificacoes/processar",
    {
      limit: 50,
      ...payload,
    },
    5000
  );
}
