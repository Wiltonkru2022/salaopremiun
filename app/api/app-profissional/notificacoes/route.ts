import { NextResponse } from "next/server";
import { listProfissionalAppNotifications } from "@/lib/profissional-app-notifications";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";

export async function GET() {
  try {
    const context = await requireProfissionalAppContext();
    const notifications = await listProfissionalAppNotifications(context);

    return NextResponse.json({
      ok: true,
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
