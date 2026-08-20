import "server-only";

import { reconcileOperationalIncidents } from "@/lib/monitoring/operational-reconciler.server";
import { syncOperationalComponentRegistry } from "@/lib/monitoring/operational-registry.server";
import { runOperationalProbes } from "@/lib/monitoring/operational-probes.server";
import { syncOperationalSecurityPosture } from "@/lib/monitoring/security-posture.server";
import { sendPendingPublicStatusNotifications } from "@/lib/monitoring/status-subscriptions.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const CRON_NAME = "operational_health";

async function startCron() {
  const supabase = getSupabaseAdmin() as any;
  const { data, error } = await supabase
    .from("eventos_cron")
    .insert({
      nome: CRON_NAME,
      status: "executando",
      resumo: "Iniciando ciclo de saúde operacional.",
      payload_json: { version: "operational-health-v1" },
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function finishCron(
  id: string,
  status: string,
  resumo: string,
  payload: Record<string, unknown>,
  errorText?: string | null
) {
  const supabase = getSupabaseAdmin() as any;
  await supabase
    .from("eventos_cron")
    .update({
      status,
      resumo,
      payload_json: payload,
      erro_texto: errorText || null,
      finalizado_em: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function runOperationalHealthCycle() {
  const cronId = await startCron();
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
    await finishCron(
      cronId,
      "sucesso",
      `Saúde operacional atualizada: ${probes.length} probes, ${reconciliation.autoResolved} incidente(s) resolvido(s) automaticamente.`,
      payload
    );
    return { ok: true, ...payload };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha no ciclo de saúde operacional.";
    await finishCron(
      cronId,
      "erro",
      "Ciclo de saúde operacional falhou.",
      {},
      message.slice(0, 500)
    );
    throw error;
  }
}
