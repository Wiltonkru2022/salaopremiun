import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { executarCronRenovacaoAssinaturas } from "@/lib/assinaturas/renewal-service";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL nao configurada.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function validarCron(req: Request) {
  return verifyBearerSecret(
    req.headers.get("authorization"),
    process.env.CRON_SECRET
  );
}

async function handleCron(req: Request) {
  let supabaseAdmin: SupabaseClient | null = null;

  try {
    if (!validarCron(req)) {
      return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
    }

    supabaseAdmin = getSupabaseAdmin();
    const { total, resultados } = await executarCronRenovacaoAssinaturas(
      supabaseAdmin
    );

    return NextResponse.json({
      ok: true,
      total,
      resultados,
    });
  } catch (error) {
    console.error("Erro ao renovar assinaturas:", error);

    if (supabaseAdmin) {
      await reportOperationalIncident({
        supabaseAdmin,
        key: "cron:renovar-assinaturas:erro",
        module: "cron_renovacao_assinaturas",
        title: "Cron de renovacao de assinaturas falhou",
        description:
          error instanceof Error
            ? error.message
            : "Erro ao renovar assinaturas.",
        severity: "critica",
        details: {
          route: "/api/cron/renovar-assinaturas",
        },
      });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao renovar assinaturas.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}
