import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    asaasApiKey: !!process.env.ASAAS_API_KEY,
    asaasBaseUrl: process.env.ASAAS_BASE_URL || null,
    webhookToken: !!process.env.ASAAS_WEBHOOK_TOKEN,
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}