import "server-only";
import { unstable_cache } from "next/cache";
import { getDatabaseAdmin } from "@/lib/db/admin";

export type AdminMasterUserContext = {
  id: string;
} | null;

const getCachedAdminMasterUserContext = unstable_cache(
  async (identityId: string): Promise<AdminMasterUserContext> => {
    const database = getDatabaseAdmin();
    const identity = String(identityId || "").trim();
    if (!identity) return null;

    const query = database
      .from("admin_master_usuarios")
      .select("id");

    const { data, error } = identity.startsWith("user_")
      ? await query.eq("clerk_user_id", identity).maybeSingle()
      : await query.eq("auth_user_id", identity).maybeSingle();

    if (error || !data?.id) return null;
    return { id: String(data.id) };
  },
  ["admin-master-user-context-identity-v2"],
  { revalidate: 60 }
);

export async function getAdminMasterUserContextByAuthUserId(identityId: string) {
  return getCachedAdminMasterUserContext(identityId);
}
