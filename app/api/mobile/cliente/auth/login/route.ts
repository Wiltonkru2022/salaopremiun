import { loginClienteAppByCpfNascimento } from "@/app/services/cliente-app/auth";
import { assertClienteCpfLoginAllowed } from "@/lib/client-app/login-rate-limit";
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
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
  const cpf = String(body?.cpf || "");

  try {
    const limit = await assertClienteCpfLoginAllowed({ cpf, ip });
    if (!limit.allowed) {
      return mobileJson(
        { ok: false, message: "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente." },
        { status: 429 }
      );
    }
  } catch {
    return mobileJson(
      { ok: false, message: "Não foi possível validar o acesso agora." },
      { status: 503 }
    );
  }

  const result = await loginClienteAppByCpfNascimento({
    cpf,
    dataNascimento: String(body?.dataNascimento || ""),
    idSalao: String(body?.idSalao || "").trim() || null,
    ip,
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
