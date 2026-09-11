import "server-only";

import {
  getOperationalProbeKey,
  listOperationalComponents,
  OPERATIONAL_REGISTRY_VERSION,
} from "@/lib/monitoring/operational-components";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function syncOperationalComponentRegistry() {
  const supabase = getSupabaseAdmin() as any;
  const components = listOperationalComponents();
  const keys = components.map((component) => component.componentKey);

  const { count, error: countError } = await supabase
    .from("operational_components")
    .select("component_key", { count: "exact", head: true })
    .eq("registry_version", OPERATIONAL_REGISTRY_VERSION)
    .in("component_key", keys);

  if (!countError && Number(count || 0) === components.length) {
    return {
      synced: false,
      version: OPERATIONAL_REGISTRY_VERSION,
      components: components.length,
    };
  }

  const now = new Date().toISOString();
  const rows = components.map((component) => {
    const probeKey = getOperationalProbeKey(component);
    return {
      component_key: component.componentKey,
      nome: component.name,
      descricao: component.description,
      categoria: component.category,
      superficie: component.surface,
      criticidade: component.criticality,
      responsavel: component.owner,
      runbook: "/docs/operational-health",
      visibilidade_publica: component.publicVisible,
      tipo_probe: component.probeType,
      intervalo_esperado_segundos: component.expectedIntervalSeconds,
      freshness_ttl_segundos: component.freshnessTtlSeconds,
      timeout_ms: component.timeoutMs,
      sucessos_para_recuperar: 3,
      falhas_para_degradar: component.criticality === "critical" ? 1 : 2,
      cooldown_segundos: component.criticality === "critical" ? 120 : 300,
      monitorado: true,
      habilitado: true,
      registry_version: OPERATIONAL_REGISTRY_VERSION,
      metadata_json: {
        sourcePatterns: component.sourcePatterns,
        routePrefixes: component.routePrefixes || [],
        contentSignals: component.contentSignals || [],
        monitoringMode: component.monitoringMode,
        probeKey,
      },
      updated_at: now,
    };
  });

  const { error } = await supabase
    .from("operational_components")
    .upsert(rows, { onConflict: "component_key" });
  if (error) throw error;

  const dependencies = components.flatMap((component) =>
    component.dependencies.map((dependency) => ({
      component_key: component.componentKey,
      depends_on_component_key: dependency,
      relacao: "required",
      critica: ["critical", "high"].includes(component.criticality),
    }))
  );

  if (keys.length) {
    await supabase
      .from("operational_component_dependencies")
      .delete()
      .in("component_key", keys);
  }
  if (dependencies.length) {
    const { error: dependencyError } = await supabase
      .from("operational_component_dependencies")
      .insert(dependencies);
    if (dependencyError) throw dependencyError;
  }

  return {
    synced: true,
    version: OPERATIONAL_REGISTRY_VERSION,
    components: components.length,
  };
}
