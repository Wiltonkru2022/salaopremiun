import { NextRequest, NextResponse } from "next/server";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import {
  criarProfissionalTicketUseCase,
  ProfissionalTicketUseCaseError,
} from "@/core/use-cases/suporte/profissionalTickets";
import { createSuporteTicketService } from "@/services/suporteTicketService";

export async function POST(req: NextRequest) {
  let idSalao = "";

  try {
    const session = await getProfissionalSessionFromCookie();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Sessao invalida." }, { status: 401 });
    }
    idSalao = session.idSalao;

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
        await runAdminOperation({
          action: "app_profissional_tickets_report_incident",
          idSalao,
          run: async (supabaseAdmin) => {
            await reportOperationalIncident({
              supabaseAdmin,
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
