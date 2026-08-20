import { NextResponse } from "next/server";
import { verifyOperationalHealthSchedulerRequest } from "@/lib/monitoring/operational-scheduler-auth.server";
import { runOperationalHealthCycle } from "@/services/operationalHealthService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: Request) {
  if (!(await verifyOperationalHealthSchedulerRequest(req))) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const result = await runOperationalHealthCycle();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha na saúde operacional.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
