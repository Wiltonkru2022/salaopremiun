import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";

export async function getUser() {
  const { user } = await getPainelUserContext({ allowAdminAal1: true });
  return user;
}
