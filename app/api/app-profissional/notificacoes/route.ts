import { NextResponse } from "next/server";
import { listProfissionalAppNotifications } from "@/lib/profissional-app-notifications";
import { requestOracleVpsProtected } from "@/lib/oracle-vps/client";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";

export async function GET() {
  try {
    const context = await requireProfissionalAppContext();
    const query = new URLSearchParams({
      id_salao: context.idSalao,
      id_profissional: context.idProfissional,
      limit: "10",
    });

    try {
      const upstream = await requestOracleVpsProtected<{
        ok?: boolean;
        notifications?: unknown[];
      }>(`/app-profissional/notificacoes?${query.toString()}`, {
        timeoutMs: 5000,
      });

      return NextResponse.json({
        ok: upstream.ok !== false,
        provider: "oracle-vps",
        notifications: Array.isArray(upstream.notifications)
          ? upstream.notifications
          : [],
      });
    } catch {
      // Se a VPS cair, o app profissional continua pelo fluxo local.
    }

    const notifications = await listProfissionalAppNotifications(context);

    return NextResponse.json({
      ok: true,
      provider: "next-fallback",
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
