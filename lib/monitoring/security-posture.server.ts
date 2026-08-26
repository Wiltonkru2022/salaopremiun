import "server-only";

import { getDatabaseAdmin } from "@/lib/db/admin";

const SOURCE = "database_posture";

export async function syncOperationalSecurityPosture() {
  const supabase = getDatabaseAdmin() as any;
  const [{ data, error }, { data: existing, error: existingError }] =
    await Promise.all([
      supabase.rpc("fn_operational_security_posture"),
      supabase
        .from("operational_security_findings")
        .select("finding_key")
        .eq("source", SOURCE)
        .is("resolved_at", null)
        .limit(500),
    ]);

  if (error) throw error;
  if (existingError) throw existingError;

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
  const activeKeys = new Set(findings.map((finding) => finding.finding_key));
  const staleKeys = (existing || [])
    .map((row: { finding_key?: string | null }) => String(row.finding_key || ""))
    .filter((key: string) => key && !activeKeys.has(key));

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

  if (staleKeys.length) {
    const { error: staleError } = await supabase
      .from("operational_security_findings")
      .update({ resolved_at: now, updated_at: now })
      .in("finding_key", staleKeys);
    if (staleError) throw staleError;
  }

  return {
    source: SOURCE,
    detected: findings.length,
    securityRisks: findings.filter(
      (finding) => finding.classification === "risco_seguranca"
    ).length,
    reviewNeeded: findings.filter(
      (finding) => finding.classification === "precisa_revisao"
    ).length,
  };
}
