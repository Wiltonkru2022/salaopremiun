import { redirect } from "next/navigation";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";

export default async function AppProfissionalRootPage() {
  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    redirect("/app-profissional/login");
  }

  await requireProfissionalAppContext();
  redirect("/app-profissional/inicio");
}
