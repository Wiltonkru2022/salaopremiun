import "server-only";

import { recordNeonEvent } from "@/lib/neon/observability.server";
import { reconcileOperationalIncidents } from "@/lib/monitoring/operational-reconciler.server";
import { syncOperationalComponentRegistry } from "@/lib/monitoring/operational-registry.server";
import { runOperationalProbes } from "@/lib/monitoring/operational-probes.server";
import { syncOperationalSecurityPosture } from "@/lib/monitoring/security-posture.server";
import { sendPendingPublicStatusNotifications } from "@/lib/monitoring/status-subscriptions.server";
import { getDatabaseAdmin } from "@/lib/db/admin";

const CRON_NAME = "operational_health";

async function recordCron(
  status: string,
  resumo: string,
  payload: Record<string, unknown>,
  errorText?: string | null
) {
  const storedInNeon = await recordNeonEvent({
    componentKey: "cron.operational_health",
    eventType: `cron_${status}`,
    level: status === "erro" ? "error" : "info",
    message: resumo,
    metadata: {
      cronName: CRON_NAME,
      status,
      payload,
      errorText: errorText || null,
    },
  });

  if (storedInNeon) return;

  const supabase = getDatabaseAdmin() as any;
  await supabase.from("eventos_cron").insert({
    nome: CRON_NAME,
    status,
    resumo,
    payload_json: payload,
    erro_texto: errorText || null,
    finalizado_em: status === "executando" ? null : new Date().toISOString(),
  });
}

export async function runOperationalHealthCycle() {
  await recordCron("executando", "Iniciando ciclo de saúde operacional.", {
    version: "operational-health-v1",
  });

  try {
    const registry = await syncOperationalComponentRegistry();
    const [probes, securityPosture] = await Promise.all([
      runOperationalProbes(),
      syncOperationalSecurityPosture(),
    ]);
    const reconciliation = await reconcileOperationalIncidents();
    const notifications = await sendPendingPublicStatusNotifications();
    const byStatus = probes.reduce<Record<string, number>>((acc, probe) => {
      acc[probe.status] = (acc[probe.status] || 0) + 1;
      return acc;
    }, {});
    const payload = {
      registry,
      probes: byStatus,
      securityPosture,
      reconciliation,
      notifications,
    };

    await recordCron(
      "sucesso",
      `Saúde operacional atualizada: ${probes.length} probes, ${reconciliation.autoResolved} incidente(s) resolvido(s) automaticamente.`,
      payload
    );

    return { ok: true, ...payload };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha no ciclo de saúde operacional.";

    await recordCron(
      "erro",
      "Ciclo de saúde operacional falhou.",
      {},
      message.slice(0, 500)
    );
    throw error;
  }
}
