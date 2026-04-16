import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ChatSuporte from "@/components/profissional/suporte/ChatSuporte";
import ProfissionalTicketQuickOpen from "@/components/profissional/suporte/ProfissionalTicketQuickOpen";

export default function SuporteProfissionalPage() {
  return (
    <ProfissionalShell
      title="Suporte · Chat"
      subtitle="Tire dúvidas sobre o app"
    >
      <ProfissionalTicketQuickOpen />
      <ChatSuporte />
    </ProfissionalShell>
  );
}
