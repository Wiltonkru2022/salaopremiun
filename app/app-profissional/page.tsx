import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ChatSuporte from "@/components/profissional/suporte/ChatSuporte";

export default function SuporteProfissionalPage() {
  return (
    <ProfissionalShell
      title="Suporte · IA"
      subtitle="Tire dúvidas sobre o app"
    >
      <ChatSuporte />
    </ProfissionalShell>
  );
}