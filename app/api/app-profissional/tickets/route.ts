import { NextRequest, NextResponse } from "next/server";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  createSalaoTicket,
  getProfissionalTicketContext,
} from "@/lib/support/tickets";

type Payload = {
  assunto?: string;
  categoria?: string | null;
  prioridade?: string | null;
  mensagem?: string;
  contexto?: Record<string, unknown>;
};

function buildErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  if (message === "UNAUTHORIZED") {
    return NextResponse.json(
      { ok: false, error: "Sessao do profissional invalida." },
      { status: 401 }
    );
  }

  if (message === "INVALID_PAYLOAD") {
    return NextResponse.json(
      { ok: false, error: "Preencha assunto e mensagem para abrir o ticket." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: false, error: message || fallback }, { status: 500 });
}

export async function POST(req: NextRequest) {
  let idSalao = "";

  try {
    const context = await getProfissionalTicketContext();
    idSalao = context.idSalao;
    const body = (await req.json().catch(() => ({}))) as Payload;
    const ticket = await createSalaoTicket({
      context,
      assunto: body.assunto || "",
      categoria: body.categoria || null,
      prioridade: body.prioridade || null,
      mensagem: body.mensagem || "",
      contexto: body.contexto || {},
    });

    return NextResponse.json({ ok: true, ticket });
  } catch (error) {
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

    return buildErrorResponse(error, "Erro ao abrir ticket pelo app profissional.");
  }
}
