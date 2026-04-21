import { NextRequest, NextResponse } from "next/server";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  criarProfissionalTicketUseCase,
  ProfissionalTicketUseCaseError,
} from "@/core/use-cases/suporte/profissionalTickets";
import { createSuporteTicketService } from "@/services/suporteTicketService";

export async function POST(req: NextRequest) {
  let idSalao = "";

  try {
    const result = await criarProfissionalTicketUseCase({
      body: await req.json().catch(() => ({})),
      service: createSuporteTicketService(),
    });
    idSalao = result.idSalao || "";

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof ProfissionalTicketUseCaseError) {
      idSalao = error.idSalao || idSalao;
    }

    if (idSalao) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `app-profissional:tickets:${idSalao}`,
          module: "app_profissional",
          title: "Abertura de ticket do app profissional falhou",
          description:
            error instanceof Error
              ? error.message
              : "Erro ao abrir ticket pelo app profissional.",
          severity: "alta",
          idSalao,
          details: {
            route: "/api/app-profissional/tickets",
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente de ticket do app profissional:",
          incidentError
        );
      }
    }

    if (error instanceof ProfissionalTicketUseCaseError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Erro ao abrir ticket pelo app profissional." },
      { status: 500 }
    );
  }
}
