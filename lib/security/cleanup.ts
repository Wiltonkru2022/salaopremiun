import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function cleanupPrincipalSecurityAttempts(params?: {
  retentionDays?: number;
}) {
  const retentionDays = Math.max(7, Math.min(params?.retentionDays || 30, 365));
  const cutoff = new Date(
    Date.now() - retentionDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const result = await getSupabaseAdmin()
    .from("security_login_attempts")
    .delete({ count: "exact" })
    .lt("criado_em", cutoff);

  return {
    cutoff,
    retentionDays,
    deleted: result.count || 0,
    error: result.error?.message || null,
  };
}
