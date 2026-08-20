import "server-only";

import { getOperationalHealthSnapshot } from "@/lib/monitoring/operational-snapshot.server";
import { operationalStateLabel } from "@/lib/monitoring/operational-components";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function publicOverallMessage(state: string) {
  if (state === "operational") return "Todos os sistemas estão operacionais";
  if (state === "degraded") return "Desempenho degradado";
  if (state === "partial_outage") return "Interrupção parcial";
  if (state === "major_outage") return "Interrupção grave";
  if (state === "maintenance") return "Manutenção programada";
  return "Estado desconhecido";
}

export async function getPublicStatusSnapshot() {
  const internal = await getOperationalHealthSnapshot();
  const publicComponents = internal.components.filter((component) => component.publicVisible);
  const groups = new Map<string, typeof publicComponents>();
  for (const component of publicComponents) {
    const current = groups.get(component.category) || [];
    current.push(component);
    groups.set(component.category, current);
  }

  return {
    generatedAt: internal.generatedAt,
    overall: {
      state: internal.overall.state,
      label: publicOverallMessage(internal.overall.state),
      detail:
        internal.overall.state === "unknown"
          ? "Parte do monitoramento está atrasada ou ainda sem evidência suficiente."
          : internal.overall.summary,
    },
    coverage: {
      criticalPercentage: internal.coverage.criticalPercentage,
      criticalMonitored: internal.coverage.criticalMonitored,
      criticalTotal: internal.coverage.criticalTotal,
    },
    groups: [...groups.entries()].map(([name, components]) => ({
      name,
      components: components.map((component) => ({
        key: component.componentKey,
        name: component.name,
        state: component.state,
        stateLabel: operationalStateLabel(component.state),
        lastCheckedAt: component.lastCheckedAt,
      })),
    })),
    incidents: internal.incidents
      .filter((incident) => incident.publicVisible)
      .map((incident) => ({
        id: incident.id,
        title: incident.title,
        status: incident.status,
        component: incident.componentName,
        symptom: incident.symptom,
        firstOccurrenceAt: incident.firstOccurrenceAt,
        lastOccurrenceAt: incident.lastOccurrenceAt,
      })),
  };
}

export async function getPublicStatusHistory(limit = 50) {
  const supabase = getSupabaseAdmin() as any;
  const { data, error } = await supabase
    .from("incidentes_sistema")
    .select("id, titulo, status, component_key, mensagem_publica, primeira_ocorrencia_em, ultima_ocorrencia_em, resolvido_em, resolution_mode, resolution_reason, operational_components(nome)")
    .eq("visibilidade_publica", true)
    .eq("status", "resolvido")
    .order("resolvido_em", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.titulo,
    component: Array.isArray(row.operational_components)
      ? row.operational_components[0]?.nome || "SalãoPremium"
      : row.operational_components?.nome || "SalãoPremium",
    publicMessage: row.mensagem_publica || "O incidente foi resolvido.",
    startedAt: row.primeira_ocorrencia_em,
    lastOccurrenceAt: row.ultima_ocorrencia_em,
    resolvedAt: row.resolvido_em,
    resolutionMode: row.resolution_mode === "automatic" ? "Automática" : "Manual",
    resolutionSummary: row.resolution_reason
      ? "Recuperação confirmada e incidente encerrado."
      : "Incidente encerrado após confirmação de recuperação.",
  }));
}
