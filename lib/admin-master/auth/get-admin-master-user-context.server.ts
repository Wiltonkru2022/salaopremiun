import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminMasterUserContext = {
  id: string;
} | null;

const getCachedAdminMasterUserContext = unstable_cache(
  async (authUserId: string): Promise<AdminMasterUserContext> => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("admin_master_usuarios")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error || !data?.id) {
      return null;
    }

    return {
      id: String(data.id),
    };
  },
  ["admin-master-user-context"],
  {
    revalidate: 60,
  }
);

export async function getAdminMasterUserContextByAuthUserId(authUserId: string) {
  return getCachedAdminMasterUserContext(authUserId);
}
