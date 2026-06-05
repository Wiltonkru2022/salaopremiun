import { loginClienteAppByEmailSenha } from "@/app/services/cliente-app/auth";
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
  const email = String(body?.email || "");
  const senha = String(body?.senha || "");
  const idSalao = String(body?.idSalao || "").trim() || null;

  const result = await loginClienteAppByEmailSenha({ email, senha, idSalao });

  if (!result.ok) {
    return mobileJson(
      { ok: false, message: result.error, redirectTo: result.redirectTo || null },
      { status: 401 }
    );
  }

  return mobileJson({ ok: true, session: result.session });
}
