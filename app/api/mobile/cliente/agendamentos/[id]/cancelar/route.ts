import { NextResponse } from "next/server";
import { cancelClienteAppAppointment } from "@/app/services/cliente-app/appointments";
import {
  mobileJson,
  mobileOptions,
  requireMobileClientAccess,
} from "../../../_cors";

export const OPTIONS = mobileOptions;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = requireMobileClientAccess(request);
  if (denied) return denied;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = await cancelClienteAppAppointment({
    idConta: String(body?.idConta || ""),
    idAgendamento: id,
  });

  if (!result.ok) {
    return mobileJson({ ok: false, message: result.error }, { status: 400 });
  }

  return mobileJson({ ok: true, message: result.message });
}
