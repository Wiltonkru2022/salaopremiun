import { redirect } from "next/navigation";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";

export default async function AppProfissionalRootPage() {
  const session = await getProfissionalSessionFromCookie();

  redirect(session ? "/app-profissional/inicio" : "/app-profissional/login");
}
