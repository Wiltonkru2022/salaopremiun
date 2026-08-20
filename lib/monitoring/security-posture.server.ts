import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

const SOURCE = "database_posture";

export async function syncOperationalSecurityPosture() {
  const supabase = getSupabaseAdmin() as any;
  const { data, error } = await supabase.rpc("fn_operational_security_posture");
  if (error) throw error;

  const findings = (data || []) as Array<{
    finding_key: string;
    source_rule?: string | null;
    title: string;
    severity: string;
    classification: string;
    entity_type?: string | null;
    entity_name?: string | null;
    detail?: string | null;
    operational_impact?: boolean | null;
  }>;
  const now = new Date().toISOString();
  const activeKeys = findings.map((finding) => finding.finding_key);

  if (findings.length) {
    const { error: upsertError } = await supabase
      .from("operational_security_findings")
      .upsert(
        findings.map((finding) => ({
          finding_key: finding.finding_key,
          source: SOURCE,
          source_rule: finding.source_rule || null,
          title: finding.title,
          severity: finding.severity,
          classification: finding.classification,
          entity_type: finding.entity_type || null,
          entity_name: finding.entity_name || null,
          detail: finding.detail || null,
          operational_impact: Boolean(finding.operational_impact),
          last_seen_at: now,
          resolved_at: null,
          updated_at: now,
        })),
        { onConflict: "finding_key" }
      );
    if (upsertError) throw upsertError;
  }

  let staleQuery = supabase
    .from("operational_security_findings")
    .update({ resolved_at: now, updated_at: now })
    .eq("source", SOURCE)
    .is("resolved_at", null);

  if (activeKeys.length) {
    staleQuery = staleQuery.not("finding_key", "in", `(${activeKeys.map((key) => `"${key.replaceAll('"', '')}"`).join(",")})`);
  }
  const { error: staleError } = await staleQuery;
  if (staleError) throw staleError;

  return {
    source: SOURCE,
    detected: findings.length,
    securityRisks: findings.filter((finding) => finding.classification === "risco_seguranca").length,
    reviewNeeded: findings.filter((finding) => finding.classification === "precisa_revisao").length,
  };
}
