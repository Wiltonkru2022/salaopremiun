import { NextResponse } from "next/server";
import { verifyBearerSecret } from "@/lib/auth/verify-secret";
import {
  limparObservabilidade,
  registrarFalhaLimpezaObservabilidade,
} from "@/services/observabilityCleanupService";

async function handleCron(req: Request) {
  const authorized = verifyBearerSecret(
    req.headers.get("authorization"),
    process.env.CRON_SECRET
  );

  if (!authorized) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const result = await limparObservabilidade();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    await registrarFalhaLimpezaObservabilidade(error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao limpar observabilidade.",
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
