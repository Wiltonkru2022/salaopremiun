import { NextResponse } from "next/server";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { requestOracleVpsProtected } from "@/lib/oracle-vps/client";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import {
  processarSuporteIAUseCase,
  ProcessarSuporteIAUseCaseError,
} from "@/core/use-cases/app-profissional/processarSuporteIA";
import { createAppProfissionalSuporteService } from "@/services/appProfissionalSuporteService";

export async function POST(req: Request) {
  let idSalao = "";

  try {
    const session = await getProfissionalSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });
    }
    idSalao = session.idSalao;
    const body = await req.json().catch(() => null);

    try {
      const upstream = await requestOracleVpsProtected<Record<string, unknown>>(
        "/app-profissional/suporte",
        {
          method: "POST",
          timeoutMs: 9000,
          body: {
            ...(body && typeof body === "object" ? body : {}),
            id_salao: session.idSalao,
            id_profissional: session.idProfissional,
            nome: session.nome,
            email: null,
          },
        }
      );

      return NextResponse.json(upstream, { status: 200 });
    } catch {
      // Fallback local para nao derrubar o suporte se a VPS estiver instavel.
    }

    const result = await processarSuporteIAUseCase({
      body,
      service: createAppProfissionalSuporteService(),
    });
    idSalao = result.idSalao || "";

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof ProcessarSuporteIAUseCaseError) {
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
        await runAdminOperation({
          action: "app_profissional_suporte_report_incident",
          idSalao,
          run: async (supabaseAdmin) => {
            await reportOperationalIncident({
              supabaseAdmin,
              key: `app-profissional:suporte:${idSalao}`,
              module: "app_profissional",
              title: "Suporte IA do app profissional falhou",
              description:
                error instanceof Error
                  ? error.message
                  : "Erro ao processar a mensagem no suporte.",
              severity: "alta",
              idSalao,
              details: {
                route: "/api/app-profissional/suporte",
              },
            });
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente do suporte IA do app profissional:",
          incidentError
        );
      }
    }

    console.error("Erro no suporte IA:", error);

    return NextResponse.json(
      { error: "Erro ao processar a mensagem no suporte." },
      { status: 500 }
    );
  }
}
