// lib/auth/get-user-role.ts
import { createClient } from "@/lib/supabase/server";
import { getPainelUserContextByAuthUserId } from "@/lib/auth/get-painel-user-context";

export async function getUserRole() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return getPainelUserContextByAuthUserId(user.id);
}
