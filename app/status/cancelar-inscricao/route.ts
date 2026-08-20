import { NextResponse } from "next/server";
import { unsubscribeStatus } from "@/lib/monitoring/status-subscriptions.server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ok = await unsubscribeStatus(url.searchParams.get("token") || "").catch(() => false);
  return NextResponse.redirect(new URL(`/status?subscription=${ok ? "unsubscribed" : "invalid"}`, req.url), 303);
}
