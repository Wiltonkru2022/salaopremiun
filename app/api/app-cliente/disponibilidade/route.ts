import { NextResponse } from "next/server";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { getClienteAppBookingAvailability } from "@/app/services/cliente-app/appointments";

export async function GET(request: Request) {
  await requireClienteAppContext();

  const { searchParams } = new URL(request.url);
  const idSalao = String(searchParams.get("salao") || "").trim();
  const idServico = String(searchParams.get("servico") || "").trim();
  const idProfissional = String(searchParams.get("profissional") || "").trim();

  const result = await getClienteAppBookingAvailability({
    idSalao,
    idServico,
    idProfissional,
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
