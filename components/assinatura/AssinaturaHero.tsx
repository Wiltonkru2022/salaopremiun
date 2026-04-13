"use client";

type Props = {
  planoAtualNome: string;
  resumoAssinatura: {
    ativa: boolean;
    vencida: boolean;
    vencendoLogo: boolean;
    diasRestantes: number | null;
    diasAtraso: number | null;
    vencimentoEm: string | null;
    bloqueioTotal: boolean;
  };
  podeGerenciar: boolean;
  renovacaoAutomaticaAtiva: boolean;
  setRenovacaoAutomaticaAtiva: (value: boolean) => void;
  abrirHistoricoModal: () => Promise<void>;
};

export default function AssinaturaHero({
  planoAtualNome,
  resumoAssinatura,
  podeGerenciar,
  renovacaoAutomaticaAtiva,
  setRenovacaoAutomaticaAtiva,
  abrirHistoricoModal,
}: Props) {
  return (
    <section className="overflow-hidden rounded-[36px] border border-violet-200/60 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.10),transparent_24%),linear-gradient(135deg,#2e1065_0%,#4c1d95_35%,#6d28d9_65%,#8b5cf6_100%)] px-5 py-6 text-white shadow-[0_25px_80px_rgba(76,29,149,0.25)] md:px-8 md:py-8">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-100">
            Assinatura SalaoPremium
          </div>

          <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
            Controle plano, cobrança, renovação e bloqueio em uma tela premium
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-violet-100 md:text-base">
            Gerencie vencimento, acompanhe histórico, visualize o status do seu
            acesso e escolha o melhor plano sem sair do painel.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-violet-100">
                Plano atual
              </div>
              <div className="mt-1 text-lg font-bold text-white">
                {planoAtualNome}
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-violet-100">
                Situação
              </div>
              <div className="mt-1 text-lg font-bold text-white">
                {resumoAssinatura.bloqueioTotal
                  ? "Bloqueio ativo"
                  : resumoAssinatura.vencendoLogo
                  ? "Vencendo em breve"
                  : resumoAssinatura.ativa
                  ? "Acesso liberado"
                  : "Sem acesso"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-violet-100">
                Dias restantes
              </div>
              <div className="mt-1 text-lg font-bold text-white">
                {resumoAssinatura.diasRestantes ?? "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
          <div>
            <div className="text-sm font-semibold text-white">
              Renovação automática
            </div>
            <p className="mt-2 text-sm leading-6 text-violet-100">
              Controle visual para o cliente entender se a assinatura está
              configurada para renovação contínua.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/15 bg-black/10 p-4">
            <button
              type="button"
              onClick={() =>
                podeGerenciar &&
                setRenovacaoAutomaticaAtiva(!renovacaoAutomaticaAtiva)
              }
              disabled={!podeGerenciar}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                renovacaoAutomaticaAtiva
                  ? "border-emerald-300/40 bg-emerald-400/15"
                  : "border-white/10 bg-white/5"
              } ${!podeGerenciar ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <div>
                <div className="text-sm font-semibold text-white">
                  {renovacaoAutomaticaAtiva ? "Ativada" : "Desativada"}
                </div>
                <div className="mt-1 text-xs text-violet-100">
                  {renovacaoAutomaticaAtiva
                    ? "Renovação visualmente marcada como ativa."
                    : "Renovação visualmente marcada como desativada."}
                </div>
              </div>

              <span
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                  renovacaoAutomaticaAtiva ? "bg-emerald-400" : "bg-white/25"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white transition ${
                    renovacaoAutomaticaAtiva ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={abrirHistoricoModal}
              className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Ver histórico
            </button>

            <div className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm font-medium text-violet-100">
              {podeGerenciar ? "Modo gerenciável" : "Somente leitura"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}