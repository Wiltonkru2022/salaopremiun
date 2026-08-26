import { NextResponse } from "next/server";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import { processTrialAlerts } from "@/services/trialLifecycleService";

async function handleCron(req: Request) {
  if (!verifyBearerSecret(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const result = await processTrialAlerts(80);

    return NextResponse.json({
      ok: result.ok,
      provider: "vercel-database",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        provider: "vercel-database",
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar avisos de teste gratis.",
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
