import { requestClienteRecoveryCodeByEmail } from "@/app/services/cliente-app/recovery";
import { mobileJson, mobileOptions, requireMobileClientAccess } from "@/app/api/mobile/cliente/_cors";

export const OPTIONS = mobileOptions;

export async function POST(request: Request) {
  const denied = requireMobileClientAccess(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const result = await requestClienteRecoveryCodeByEmail({
    email: String(body?.email || ""),
    ip: forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null,
    userAgent: request.headers.get("user-agent") || null,
  });
  return mobileJson(result, { status: result.ok ? 200 : 400 });
}
