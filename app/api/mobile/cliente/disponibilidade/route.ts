import { NextResponse } from "next/server";
import { getClienteAppBookingAvailability } from "@/app/services/cliente-app/appointments";
import {
  mobileJson,
  mobileOptions,
  requireMobileClientAccess,
} from "../_cors";

export const OPTIONS = mobileOptions;

export async function GET(request: Request) {
  const denied = requireMobileClientAccess(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const result = await getClienteAppBookingAvailability({
    idSalao: String(searchParams.get("salao") || ""),
    idServico: String(searchParams.get("servico") || ""),
    idsServicos: searchParams
      .getAll("servicos")
      .map((item) => String(item || "").trim())
      .filter(Boolean),
    idProfissional: String(searchParams.get("profissional") || ""),
    ignoreAgendamentoId:
      String(searchParams.get("ignorar") || "").trim() || null,
    startDate: String(searchParams.get("inicio") || "").trim() || null,
  });

  if (!result.ok) {
    return mobileJson(result, { status: 400 });
  }

  return mobileJson(result, {
    headers: { "Cache-Control": "private, max-age=20" },
  });
}
