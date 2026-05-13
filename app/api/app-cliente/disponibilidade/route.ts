import { NextResponse } from "next/server";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { getClienteAppBookingAvailability } from "@/app/services/cliente-app/appointments";
import { requestOracleVpsProtected } from "@/lib/oracle-vps/client";

export async function GET(request: Request) {
  await requireClienteAppContext();

  const { searchParams } = new URL(request.url);
  const idSalao = String(searchParams.get("salao") || "").trim();
  const idServico = String(searchParams.get("servico") || "").trim();
  const idProfissional = String(searchParams.get("profissional") || "").trim();
  const ignoreAgendamentoId = String(searchParams.get("ignorar") || "").trim() || null;
  const startDate = String(searchParams.get("inicio") || "").trim() || null;

  try {
    const upstream = await requestOracleVpsProtected<Record<string, unknown>>(
      `/app-cliente/disponibilidade?${searchParams.toString()}`,
      { timeoutMs: 5000 }
    );

    return NextResponse.json(upstream, {
      headers: {
        "Cache-Control": "private, max-age=20",
        "X-SalaoPremium-Provider": "oracle-vps",
      },
    });
  } catch {
    // Mantem o app funcionando mesmo se a VPS estiver temporariamente indisponivel.
  }

  const result = await getClienteAppBookingAvailability({
    idSalao,
    idServico,
    idProfissional,
    ignoreAgendamentoId,
    startDate,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "private, max-age=20",
    },
  });
}
