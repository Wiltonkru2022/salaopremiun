export default function MarketingPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-[32px] bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 px-6 py-7 text-white shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.30em] text-zinc-400">
          Relacionamento e campanhas
        </div>

        <h1 className="mt-3 text-3xl font-bold tracking-tight">Marketing</h1>

        <p className="mt-2 max-w-2xl text-sm text-zinc-300">
          Ferramentas para campanhas, aniversariantes, retorno automático,
          reativação e relacionamento com clientes do salão.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.20em] text-zinc-400">
            Campanhas ativas
          </div>
          <div className="mt-3 text-2xl font-bold text-zinc-900">0</div>
          <p className="mt-2 text-sm text-zinc-500">
            Promoções e ações em andamento.
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.20em] text-zinc-400">
            Aniversariantes
          </div>
          <div className="mt-3 text-2xl font-bold text-zinc-900">0</div>
          <p className="mt-2 text-sm text-zinc-500">
            Clientes do período para ação especial.
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.20em] text-zinc-400">
            Retorno pendente
          </div>
          <div className="mt-3 text-2xl font-bold text-zinc-900">0</div>
          <p className="mt-2 text-sm text-zinc-500">
            Clientes para manutenção ou reativação.
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.20em] text-zinc-400">
            Mensagens prontas
          </div>
          <div className="mt-3 text-2xl font-bold text-zinc-900">0</div>
          <p className="mt-2 text-sm text-zinc-500">
            Modelos para campanhas e relacionamento.
          </p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900">Campanhas</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Criação de promoções, mensagens segmentadas e ações comerciais para
            clientes do salão.
          </p>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              Promoções por serviço
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              Campanhas por período
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              Ações por perfil de cliente
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900">Aniversariantes</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Lista de clientes para mimos, descontos especiais e campanhas de
            relacionamento no mês.
          </p>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              Clientes do mês
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              Cupom especial
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              Mensagem pronta de aniversário
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900">Retorno automático</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Avisos de manutenção, reativação e lembretes para clientes que já
            passaram pelo salão.
          </p>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              Lembrete de manutenção
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              Reativação de clientes parados
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              Acompanhamento pós-atendimento
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900">Próximos recursos</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Aqui vão entrar automações reais de marketing do SalaoPremium.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
            Envio por WhatsApp
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
            Segmentação por cliente
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
            Lembrete automático de retorno
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
            Histórico de campanhas
          </div>
        </div>
      </section>
    </div>
  );
}