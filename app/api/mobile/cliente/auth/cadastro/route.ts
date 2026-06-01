import { NextResponse } from "next/server";
import { createClienteAppAccount } from "@/app/services/cliente-app/auth";
import {
  mobileJson,
  mobileOptions,
  requireMobileClientAccess,
} from "../../_cors";

export const OPTIONS = mobileOptions;

export async function POST(request: Request) {
  const denied = requireMobileClientAccess(request);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const result = await createClienteAppAccount({
    nome: String(body?.nome || ""),
    telefone: String(body?.telefone || ""),
    email: String(body?.email || ""),
    senha: String(body?.senha || ""),
  });

  if (!result.ok) {
    return mobileJson(
      { ok: false, message: result.error },
      { status: 400 }
    );
  }

  return mobileJson({ ok: true, session: result.session });
}
