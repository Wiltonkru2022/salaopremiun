type Props = {
  renovacaoAutomatica: boolean;
  salvandoRenovacao: boolean;
  onToggleRenovacaoAutomatica: (value: boolean) => Promise<void>;
  tipoMudancaPlano: "upgrade" | "downgrade" | "manter";
  bloqueioTotal: boolean;
  vencida: boolean;
  vencendoLogo: boolean;
  diasRestantes: number | null;
  planoAtualNome: string;
  planoSelecionadoNome: string;
};

function getBadgeMudanca(tipo: Props["tipoMudancaPlano"]) {
  if (tipo === "upgrade") {
    return {
      label: "Upgrade de plano",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (tipo === "downgrade") {
    return {
      label: "Downgrade de plano",
      className:
        "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  return {
    label: "Plano atual",
    className: "border-white/20 bg-white/10 text-violet-50",
  };
}

export default function AssinaturaHero({
  renovacaoAutomatica,
  salvandoRenovacao,
  onToggleRenovacaoAutomatica,
  tipoMudancaPlano,
  bloqueioTotal,
  vencida,
  vencendoLogo,
  diasRestantes,
  planoAtualNome,
  planoSelecionadoNome,
}: Props) {
  const badge = getBadgeMudanca(tipoMudancaPlano);

  return (
    <section className="overflow-hidden rounded-[34px] border border-violet-200 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_30%),linear-gradient(135deg,#4c1d95_0%,#6d28d9_45%,#7c3aed_70%,#8b5cf6_100%)] px-5 py-6 text-white shadow-sm md:px-8 md:py-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-100">
              Assinatura SalaoPremium
            </div>

            <div
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.20em] ${badge.className}`}
            >
              {badge.label}
            </div>
          </div>

          <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
            Controle plano, cobrança e renovação em um só lugar
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-violet-100 md:text-base">
            Gerencie upgrade, downgrade, histórico de pagamentos e renovação
            automática sem sair da página.
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-violet-50">
              Plano atual: <strong>{planoAtualNome}</strong>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-violet-50">
              Selecionado: <strong>{planoSelecionadoNome}</strong>
            </div>
          </div>

          {bloqueioTotal ? (
            <div className="mt-5 rounded-[24px] border border-rose-200/70 bg-rose-500/15 px-4 py-4 text-sm text-rose-50 backdrop-blur-sm">
              <div className="font-bold uppercase tracking-[0.18em] text-rose-100">
                Bloqueio automático ativo
              </div>
              <div className="mt-2 leading-6">
                Seu acesso está em estado de bloqueio por vencimento. Regularize
                a assinatura para liberar novamente as áreas protegidas do
                sistema.
              </div>
            </div>
          ) : vencida ? (
            <div className="mt-5 rounded-[24px] border border-amber-200/70 bg-amber-400/15 px-4 py-4 text-sm text-amber-50 backdrop-blur-sm">
              <div className="font-bold uppercase tracking-[0.18em] text-amber-100">
                Assinatura vencida
              </div>
              <div className="mt-2 leading-6">
                Sua assinatura venceu. Gere uma nova cobrança para restaurar o
                acesso normal.
              </div>
            </div>
          ) : vencendoLogo ? (
            <div className="mt-5 rounded-[24px] border border-amber-200/70 bg-amber-400/15 px-4 py-4 text-sm text-amber-50 backdrop-blur-sm">
              <div className="font-bold uppercase tracking-[0.18em] text-amber-100">
                Vencimento próximo
              </div>
              <div className="mt-2 leading-6">
                {diasRestantes != null
                  ? `Sua assinatura vence em ${diasRestantes} dia(s).`
                  : "Sua assinatura está perto do vencimento."}
              </div>
            </div>
          ) : null}
        </div>

        <div className="w-full max-w-xl rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-100">
                Renovação automática
              </div>
              <div className="mt-2 text-lg font-bold text-white">
                {renovacaoAutomatica ? "Ativada" : "Desativada"}
              </div>
              <p className="mt-2 text-sm leading-6 text-violet-100">
                Quando ativada, o sistema poderá gerar a cobrança de renovação
                automaticamente perto do vencimento.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={renovacaoAutomatica}
              onClick={() =>
                !salvandoRenovacao &&
                onToggleRenovacaoAutomatica(!renovacaoAutomatica)
              }
              className={`relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border transition ${
                renovacaoAutomatica
                  ? "border-emerald-300 bg-emerald-400/80"
                  : "border-white/20 bg-white/15"
              } ${salvandoRenovacao ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <span
                className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${
                  renovacaoAutomatica ? "translate-x-9" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-xs leading-5 text-violet-100">
            {salvandoRenovacao
              ? "Salvando configuração..."
              : renovacaoAutomatica
              ? "A renovação automática está ligada para esta assinatura."
              : "A renovação automática está desligada. A renovação dependerá de ação manual."}
          </div>
        </div>
      </div>
    </section>
  );
}