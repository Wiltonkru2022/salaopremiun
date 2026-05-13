import ProfissionalPrivate from "@/components/profissional/layout/ProfissionalPrivate";
import ProfissionalTicketQuickOpen from "@/components/profissional/suporte/ProfissionalTicketQuickOpen";

export default async function SuporteProfissionalPage() {
  return (
    <ProfissionalPrivate
      title="Suporte"
      subtitle="Atendimento humano para resolver acesso, agenda e comandas."
    >
      <ProfissionalTicketQuickOpen />
    </ProfissionalPrivate>
  );
}
