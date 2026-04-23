import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import NovoClienteForm from "@/components/profissional/clientes/NovoClienteForm";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";

export default async function NovoClientePage() {
  await requireProfissionalAppContext();

  return (
    <ProfissionalShell
      title="Cadastrar cliente"
      subtitle="Novo cadastro no salão"
    >
      <NovoClienteForm />
    </ProfissionalShell>
  );
}
