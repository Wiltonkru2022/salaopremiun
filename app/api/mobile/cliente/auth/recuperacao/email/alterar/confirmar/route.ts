import { confirmClienteEmailChange } from "@/app/services/cliente-app/recovery";
import { mobileJson, mobileOptions, requireMobileClientAccess } from "@/app/api/mobile/cliente/_cors";

export const OPTIONS = mobileOptions;

export async function POST(request: Request) {
  const denied = requireMobileClientAccess(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const result = await confirmClienteEmailChange({
    token: String(body?.token || ""),
    newEmail: String(body?.email || ""),
    code: String(body?.code || ""),
  });
  return mobileJson(result, { status: result.ok ? 200 : 400 });
}
