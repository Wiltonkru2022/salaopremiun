import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";

export default function SuporteProfissionalPage() {
  return (
    <ProfissionalShell
      title="Suporte · Chat"
      subtitle="Tire dúvidas sobre o app"
    >
      <div className="flex h-[calc(100dvh-220px)] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto">
          <div className="max-w-[88%] rounded-[1.25rem] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-zinc-900">
              Olá, Carlos 👋<br />
              Em que posso te ajudar no app do profissional?
            </div>
          </div>

          <div className="ml-auto max-w-[88%] rounded-[1.25rem] bg-zinc-950 p-4 text-sm text-white shadow-sm">
            Como adiciono um item na comanda?
          </div>

          <div className="max-w-[88%] rounded-[1.25rem] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-zinc-900">
              É fácil:
              <br />
              1. Abra a comanda do cliente
              <br />
              2. Toque em “+ Adicionar item”
              <br />
              3. Selecione o serviço ou produto
              <br />
              4. Confirme a quantidade
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-[1.25rem] border border-zinc-200 bg-white p-2 shadow-sm">
          <input
            type="text"
            placeholder="Digite sua mensagem..."
            className="h-11 flex-1 rounded-2xl px-3 text-sm outline-none"
          />
          <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-semibold text-white">
            →
          </button>
        </div>
      </div>
    </ProfissionalShell>
  );
}
