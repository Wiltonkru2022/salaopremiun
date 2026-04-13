import { redirect } from "next/navigation";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import NovoClienteForm from "@/components/profissional/clientes/NovoClienteForm";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";

export default async function NovoClientePage() {
  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    redirect("/app-profissional/login");
  }

  return (
    <ProfissionalShell
      title="Cadastrar cliente"
      subtitle="Novo cadastro no salão"
    >
      <NovoClienteForm />
    </ProfissionalShell>
  );
}