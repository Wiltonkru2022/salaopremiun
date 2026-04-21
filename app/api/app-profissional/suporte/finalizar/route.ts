import { NextResponse } from "next/server";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  finalizarSuporteIAUseCase,
  FinalizarSuporteIAUseCaseError,
} from "@/core/use-cases/app-profissional/finalizarSuporteIA";
import { createAppProfissionalSuporteService } from "@/services/appProfissionalSuporteService";

export async function POST(req: Request) {
  let idSalao = "";

  try {
    const result = await finalizarSuporteIAUseCase({
      body: await req.json().catch(() => null),
      service: createAppProfissionalSuporteService(),
    });
    idSalao = result.idSalao || "";

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof FinalizarSuporteIAUseCaseError) {
      idSalao = error.idSalao || idSalao;

      if (error.status === 401 || error.status === 400) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        );
      }
    }

    if (idSalao) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `app-profissional:suporte-finalizar:${idSalao}`,
          module: "app_profissional",
          title: "Finalizacao do chat do app profissional falhou",
          description:
            error instanceof Error ? error.message : "Erro ao finalizar chat.",
          severity: "media",
          idSalao,
          details: {
            route: "/api/app-profissional/suporte/finalizar",
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente de finalizacao do suporte:",
          incidentError
        );
      }
    }

    return NextResponse.json(
      { error: "Erro ao finalizar chat." },
      { status: 500 }
    );
  }
}
