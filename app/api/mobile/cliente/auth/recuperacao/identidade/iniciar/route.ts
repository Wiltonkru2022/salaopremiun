import { startClienteRecoveryByIdentity } from "@/app/services/cliente-app/recovery";
import { mobileJson, mobileOptions, requireMobileClientAccess } from "@/app/api/mobile/cliente/_cors";

export const OPTIONS = mobileOptions;

export async function POST(request: Request) {
  const denied = requireMobileClientAccess(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const purpose = String(body?.purpose || "recover") === "change-email" ? "change-email" : "recover";
  const result = await startClienteRecoveryByIdentity({
    cpf: String(body?.cpf || ""),
    dataNascimento: String(body?.dataNascimento || ""),
    purpose,
  });
  return mobileJson(result, { status: result.ok ? 200 : 400 });
}
