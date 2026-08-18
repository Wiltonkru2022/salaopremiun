import { loginClienteAppByCpfNascimento } from "@/app/services/cliente-app/auth";
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
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const result = await loginClienteAppByCpfNascimento({
    cpf: String(body?.cpf || ""),
    dataNascimento: String(body?.dataNascimento || ""),
    idSalao: String(body?.idSalao || "").trim() || null,
    ip: forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null,
    userAgent: request.headers.get("user-agent") || null,
  });

  if (!result.ok) {
    return mobileJson(
      { ok: false, message: result.error, redirectTo: result.redirectTo || null },
      { status: 401 }
    );
  }

  return mobileJson({ ok: true, session: result.session });
}
