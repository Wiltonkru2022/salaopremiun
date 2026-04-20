import { NextResponse } from "next/server";
import { excluirConversaSuporte } from "@/app/services/profissional/suporte";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { requireProfissionalServerContext } from "@/lib/profissional-context.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  let idSalao = "";

  try {
    const session = await requireProfissionalServerContext();
    idSalao = session.idSalao;

    const body = await req.json().catch(() => null);
    const conversaId = String(body?.conversaId || "").trim();

    if (!conversaId) {
      return NextResponse.json(
        { error: "Conversa não informada." },
        { status: 400 }
      );
    }

    await excluirConversaSuporte({
      idConversa: conversaId,
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Sessao do profissional nao encontrada." },
        { status: 401 }
      );
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
