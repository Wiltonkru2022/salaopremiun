import { listClienteAppNotifications } from "@/lib/client-app/queries";
import {
  mobileJson,
  mobileOptions,
  requireMobileClientAccess,
} from "../_cors";

export const OPTIONS = mobileOptions;

export async function GET(request: Request) {
  const denied = requireMobileClientAccess(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const idConta = String(url.searchParams.get("conta") || "").trim();
  if (!idConta) {
    return mobileJson({ ok: false, message: "Conta nao informada." }, { status: 401 });
  }

  const notificacoes = await listClienteAppNotifications({ idConta, limit: 30 });
  return mobileJson({ ok: true, ...notificacoes });
}
