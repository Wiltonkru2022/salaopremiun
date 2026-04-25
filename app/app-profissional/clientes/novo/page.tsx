import NovoClienteForm from "@/components/profissional/clientes/NovoClienteForm";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";

export default async function NovoClientePage() {
  await requireProfissionalAppContext();

  return (
    <ProfissionalShell
      title="Cadastrar cliente"
      subtitle="Novo cadastro no salao"
    >
      <NovoClienteForm />
    </ProfissionalShell>
  );
}
