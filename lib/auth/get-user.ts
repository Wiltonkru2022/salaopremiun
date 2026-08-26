import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";

export async function getUser() {
  const context = await getPainelUserContext({ allowAdminAal1: true });
  return context.user;
}
