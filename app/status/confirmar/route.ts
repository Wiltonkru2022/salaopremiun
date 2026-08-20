import { NextResponse } from "next/server";
import { confirmStatusSubscription } from "@/lib/monitoring/status-subscriptions.server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ok = await confirmStatusSubscription(url.searchParams.get("token") || "").catch(() => false);
  return NextResponse.redirect(new URL(`/status?subscription=${ok ? "confirmed" : "invalid"}`, req.url), 303);
}
