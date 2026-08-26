// lib/auth/get-user-role.ts
import { createClient } from "@/lib/db/server";
import { getPainelUserContextByAuthUserId } from "@/lib/auth/get-painel-user-context";

export async function getUserRole() {
  const database = await createClient();

  const {
    data: { user },
  } = await database.auth.getUser();

  if (!user) return null;

  return getPainelUserContextByAuthUserId(user.id);
}
