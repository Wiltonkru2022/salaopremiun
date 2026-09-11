import { runAdminOperation } from "@/lib/supabase/admin-ops";

export async function findSalaoUsuarioByEmail(email: string) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  return runAdminOperation({
    action: "security_lookup_usuario_by_email",
    actorId: normalizedEmail,
    run: async (client) => {
      const { data } = await client
        .from("usuarios")
        .select("id, id_salao, email, status")
        .eq("email", normalizedEmail)
        .limit(1)
        .maybeSingle();

      return data?.id ? data : null;
    },
  });
}

export async function findSalaoUsuarioByAuthOrEmail(params: {
  authUserId: string;
  email: string;
}) {
  const authUserId = String(params.authUserId || "").trim();
  const email = String(params.email || "").trim().toLowerCase();

  if (!authUserId && !email) return null;

  return runAdminOperation({
    action: "security_lookup_usuario_by_auth_or_email",
    actorId: authUserId || email || null,
    run: async (client) => {
      const { data } = await client
        .from("usuarios")
        .select("id, id_salao, email, auth_user_id, status")
        .or(
          [
            authUserId ? `auth_user_id.eq.${authUserId}` : null,
            email ? `email.eq.${email}` : null,
          ]
            .filter(Boolean)
            .join(",")
        )
        .limit(1)
        .maybeSingle();

      return data?.id ? data : null;
    },
  });
}
