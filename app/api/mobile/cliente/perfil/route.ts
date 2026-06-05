import { getClienteAppProfileData } from "@/lib/client-app/queries";
import { updateClienteAppProfile } from "@/app/services/cliente-app/profile";
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

  const perfil = await getClienteAppProfileData({ idConta });
  return mobileJson({ ok: true, perfil });
}

export async function POST(request: Request) {
  const denied = requireMobileClientAccess(request);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const result = await updateClienteAppProfile({
    idConta: String(body?.idConta || ""),
    nome: String(body?.nome || ""),
    email: String(body?.email || ""),
    telefone: String(body?.telefone || ""),
    preferencias: String(body?.preferencias || ""),
  });

  if (!result.ok) {
    return mobileJson({ ok: false, message: result.error }, { status: 400 });
  }

  return mobileJson({ ok: true, message: result.message });
}
