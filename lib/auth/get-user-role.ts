import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";

export async function getUserRole() {
  const { usuario } = await getPainelUserContext({ allowAdminAal1: true });
  return usuario;
}
