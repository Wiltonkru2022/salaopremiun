import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = normalizeText(body.email).toLowerCase();
  const nomeSalao = normalizeText(body.nomeSalao);
  const whatsapp = onlyNumbers(normalizeText(body.whatsapp));

  const supabase = getSupabaseAdmin() as any;
  const exists = {
    email: false,
    nomeSalao: false,
    whatsapp: false,
  };

  const checks: Promise<void>[] = [];

  if (email) {
    checks.push(
      supabase
        .from("saloes")
        .select("id")
        .eq("email", email)
        .limit(1)
        .maybeSingle()
        .then(({ data }: { data: { id?: string } | null }) => {
          exists.email = Boolean(data?.id);
        })
    );
  }

  if (nomeSalao) {
    checks.push(
      supabase
        .from("saloes")
        .select("id")
        .ilike("nome", nomeSalao)
        .limit(1)
        .maybeSingle()
        .then(({ data }: { data: { id?: string } | null }) => {
          exists.nomeSalao = Boolean(data?.id);
        })
    );
  }

  if (whatsapp) {
    checks.push(
      supabase
        .from("saloes")
        .select("id")
        .or(`telefone.eq.${whatsapp},telefone.ilike.%${whatsapp}%`)
        .limit(1)
        .maybeSingle()
        .then(({ data }: { data: { id?: string } | null }) => {
          exists.whatsapp = Boolean(data?.id);
        })
    );
  }

  await Promise.all(checks);

  return NextResponse.json({ exists });
}
