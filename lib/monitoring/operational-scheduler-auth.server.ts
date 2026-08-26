import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { getDatabaseAdmin } from "@/lib/db/admin";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function extractBearer(value?: string | null) {
  const match = String(value || "").match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function verifyOperationalHealthSchedulerRequest(req: Request) {
  const authorization = req.headers.get("authorization");

  if (verifyBearerSecret(authorization, process.env.CRON_SECRET)) {
    return true;
  }

  const token = extractBearer(authorization);
  if (!token || token.length < 32) return false;

  try {
    const supabase = getDatabaseAdmin() as any;
    const { data, error } = await supabase
      .from("operational_scheduler_auth")
      .select("token_hash")
      .eq("scheduler_key", "operational-health")
      .maybeSingle();

    if (error || !data?.token_hash) return false;
    return safeEqualHex(sha256(token), String(data.token_hash));
  } catch {
    return false;
  }
}
