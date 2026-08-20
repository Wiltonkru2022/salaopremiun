import { NextResponse } from "next/server";
import { requestStatusSubscription } from "@/lib/monitoring/status-subscriptions.server";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  const email = contentType.includes("application/json")
    ? (await req.json().catch(() => ({})))?.email
    : (await req.formData().catch(() => new FormData())).get("email");

  try {
    await requestStatusSubscription(email);
  } catch {
    // Resposta genérica evita enumeração e mantém double opt-in como proteção contra abuso.
  }

  const statusUrl = new URL("/status?subscription=requested", req.url);
  return NextResponse.redirect(statusUrl, 303);
}
