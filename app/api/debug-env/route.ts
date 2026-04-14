import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    asaasApiKey: !!process.env.ASAAS_API_KEY,
    asaasBaseUrl: !!process.env.ASAAS_BASE_URL,
    webhookToken: !!process.env.ASAAS_WEBHOOK_TOKEN,
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
