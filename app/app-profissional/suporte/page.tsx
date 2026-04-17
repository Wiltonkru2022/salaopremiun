import ProfissionalPrivate from "@/components/profissional/layout/ProfissionalPrivate";
import ChatSuporte from "@/components/profissional/suporte/ChatSuporte";
import ProfissionalTicketQuickOpen from "@/components/profissional/suporte/ProfissionalTicketQuickOpen";

export default async function SuporteProfissionalPage() {
  return (
    <ProfissionalPrivate title="Suporte IA" subtitle="Tire duvidas sobre o app">
      <ProfissionalTicketQuickOpen />
      <ChatSuporte />
    </ProfissionalPrivate>
  );
}
