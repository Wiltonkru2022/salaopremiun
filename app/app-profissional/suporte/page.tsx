import ProfissionalPrivate from "@/components/profissional/layout/ProfissionalPrivate";
import ChatSuporte from "@/components/profissional/suporte/ChatSuporte";
import ProfissionalTicketQuickOpen from "@/components/profissional/suporte/ProfissionalTicketQuickOpen";

export default async function SuporteProfissionalPage() {
  return (
    <ProfissionalPrivate
      title="Suporte"
      subtitle="IA para ajuda rapida e chamado humano quando precisar"
    >
      <div className="space-y-3.5">
        <ChatSuporte />
        <ProfissionalTicketQuickOpen />
      </div>
    </ProfissionalPrivate>
  );
}
