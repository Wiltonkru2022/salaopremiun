import { NextResponse } from "next/server";
import { getClienteAppBookingAvailability } from "@/app/services/cliente-app/appointments";

// publicRoute: consulta publica de horarios disponiveis para o app cliente.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idSalao = String(searchParams.get("salao") || "").trim();
  const idServico = String(searchParams.get("servico") || "").trim();
  const idsServicos = searchParams
    .getAll("servicos")
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  const idProfissional = String(searchParams.get("profissional") || "").trim();
  const ignoreAgendamentoId = String(searchParams.get("ignorar") || "").trim() || null;
  const startDate = String(searchParams.get("inicio") || "").trim() || null;

  const result = await getClienteAppBookingAvailability({
    idSalao,
    idServico,
    idsServicos,
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
      "X-SalaoPremium-Provider": "vercel-supabase",
    },
  });
}
