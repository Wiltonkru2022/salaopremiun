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
    cpf: String(body?.cpf || ""),
    dataNascimento: String(body?.dataNascimento || ""),
    whatsapp: String(body?.whatsapp || ""),
    email: String(body?.email || ""),
  });

  if (!result.ok) {
    return mobileJson({ ok: false, message: result.error }, { status: 400 });
  }

  return mobileJson({ ok: true, session: result.session });
}
