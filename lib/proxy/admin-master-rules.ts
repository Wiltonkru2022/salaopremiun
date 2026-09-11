import {
  getAdminMasterLoginNextPath,
  redirectToAdminMasterLogin,
  type ProxyRouteContext,
} from "@/lib/proxy/host-rules";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function getAdminMasterOwnerEmails() {
  return String(process.env.ADMIN_MASTER_OWNER_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function hasAdminMasterAccess(params: {
  authUserId: string;
  email?: string | null;
}) {
  const normalizedEmail = String(params.email || "").trim().toLowerCase();

  if (normalizedEmail && getAdminMasterOwnerEmails().includes(normalizedEmail)) {
    return true;
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: byAuthUserId, error: byAuthUserIdError } = await supabaseAdmin
      .from("admin_master_usuarios")
      .select("id, status")
      .eq("auth_user_id", params.authUserId)
      .maybeSingle();

    if (byAuthUserIdError) {
      console.error("Erro proxy admin master auth_user_id:", byAuthUserIdError);
    } else if (String(byAuthUserId?.status || "").toLowerCase() === "ativo") {
      return true;
    }

    if (!normalizedEmail) {
      return false;
    }

    const { data: byEmail, error: byEmailError } = await supabaseAdmin
      .from("admin_master_usuarios")
      .select("id, status")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (byEmailError) {
      console.error("Erro proxy admin master email:", byEmailError);
      return false;
    }

    return String(byEmail?.status || "").toLowerCase() === "ativo";
  } catch (error) {
    console.error("Erro proxy admin master access:", error);
    return false;
  }
}

export function redirectAdminMasterLoginFromForeignHost(ctx: ProxyRouteContext) {
  return redirectToAdminMasterLogin(
    ctx.request,
    getAdminMasterLoginNextPath(ctx.request.nextUrl.searchParams.get("next"))
  );
}
