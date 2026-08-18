import { NextResponse } from "next/server";
import { listProfissionalAppNotifications } from "@/lib/profissional-app-notifications";
import { validateProfissionalAppSession } from "@/lib/profissional-context.server";

export async function GET() {
  try {
    const validation = await validateProfissionalAppSession();

    if (!validation.context) {
      return NextResponse.json(
        {
          ok: false,
          error:
            validation.reason === "plan_blocked"
              ? "Seu salão não tem acesso ativo ao App Profissional."
              : "Sessão inválida.",
        },
        { status: 401 }
      );
    }

    const notifications = await listProfissionalAppNotifications(validation.context);

    return NextResponse.json({
      ok: true,
      provider: "vercel-supabase",
      notifications,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { ok: false, error: "Sessao invalida." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Erro ao carregar notificacoes do app profissional." },
      { status: 500 }
    );
  }
}
