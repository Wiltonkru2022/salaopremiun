type Props = {
  assinaturaStatus?: string | null;
  planoAtualNome?: string;
  bloqueioTotal?: boolean;
  vencendoLogo?: boolean;
  renovacaoAutomatica?: boolean;
  onToggleRenovacaoAutomatica?: (value: boolean) => void;
  salvandoRenovacaoAutomatica?: boolean;
  podeGerenciar?: boolean;
  tipoMudancaPlano?: "upgrade" | "downgrade" | null;
};

function getBadgeMudancaPlano(tipoMudancaPlano?: "upgrade" | "downgrade" | null) {
  if (tipoMudancaPlano === "upgrade") {
    return {
      label: "Upgrade de plano",
      className:
        "border-emerald-300/40 bg-emerald-400/15 text-emerald-50",
    };
  }

  if (tipoMudancaPlano === "downgrade") {
    return {
      label: "Downgrade de plano",
      className:
        "border-amber-300/40 bg-amber-400/15 text-amber-50",
    };
  }

  return null;
}

export default function AssinaturaHero({
  assinaturaStatus,
  planoAtualNome,
  bloqueioTotal = false,
  vencendoLogo = false,
  renovacaoAutomatica = false,
  onToggleRenovacaoAutomatica,
  salvandoRenovacaoAutomatica = false,
  podeGerenciar = false,
  tipoMudancaPlano = null,
}: Props) {
  const status = String(assinaturaStatus || "").toLowerCase();
  const badgeMudanca = getBadgeMudancaPlano(tipoMudancaPlano);

  const titulo = bloqueioTotal
    ? "Seu acesso está bloqueado até regularizar a assinatura"
    : vencendoLogo
    ? "Sua assinatura está perto do vencimento"
    : "Escolha seu plano e mantenha seu salão sempre liberado";

  const descricao = bloqueioTotal
    ? "O sistema identificou bloqueio automático por vencimento. Regularize agora para voltar a usar todas as áreas do painel."
    : vencendoLogo
    ? "Evite interrupções. Gere a cobrança, ajuste seu plano e mantenha sua operação ativa sem sair da página."
    : "Controle teste grátis, vencimento, histórico, upgrade, downgrade e cobrança por PIX, boleto ou cartão em uma experiência premium.";

  return (
    <section className="overflow-hidden rounded-[34px] border border-violet-200 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_30%),linear-gradient(135deg,#4c1d95_0%,#6d28d9_45%,#7c3aed_70%,#8b5cf6_100%)] px-5 py-6 text-white shadow-sm md:px-8 md:py-8 xl:px-10 xl:py-10">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl">
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-100">
              Assinatura SalaoPremium
            </div>

            {planoAtualNome ? (
              <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.20em] text-violet-100">
                Plano atual: {planoAtualNome}
              </div>
            ) : null}

            {badgeMudanca ? (
              <div
                className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.20em] ${badgeMudanca.className}`}
              >
                {badgeMudanca.label}
              </div>
            ) : null}

            {status ? (
              <div className="inline-flex rounded-full border border-white/20 bg-black/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.20em] text-white">
                Status: {status.replaceAll("_", " ")}
              </div>
            ) : null}
          </div>

          <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
            {titulo}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-violet-100 md:text-base">
            {descricao}
          </p>

          {bloqueioTotal ? (
            <div className="mt-5 rounded-[24px] border border-red-300/35 bg-red-500/15 px-4 py-4 backdrop-blur-sm">
              <div className="text-sm font-semibold text-white md:text-base">
                Bloqueio automático ativo
              </div>
              <div className="mt-1 text-sm text-red-50/95">
                Enquanto a assinatura permanecer vencida, o sistema mantém o acesso restrito às rotas protegidas.
              </div>
            </div>
          ) : null}
        </div>

        <div className="w-full max-w-[420px] rounded-[28px] border border-white/15 bg-white/10 p-4 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-100">
                Renovação automática
              </div>
              <div className="mt-2 text-lg font-bold text-white">
                {renovacaoAutomatica ? "Ativada" : "Desativada"}
              </div>
              <p className="mt-1 text-sm text-violet-100">
                {renovacaoAutomatica
                  ? "O sistema poderá gerar a próxima cobrança automaticamente conforme a regra da assinatura."
                  : "A próxima cobrança dependerá de ação manual ou mudança futura na configuração."}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={renovacaoAutomatica}
              disabled={!podeGerenciar || salvandoRenovacaoAutomatica}
              onClick={() =>
                !salvandoRenovacaoAutomatica &&
                podeGerenciar &&
                onToggleRenovacaoAutomatica?.(!renovacaoAutomatica)
              }
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition ${
                renovacaoAutomatica
                  ? "border-emerald-300/50 bg-emerald-400/25"
                  : "border-white/20 bg-white/15"
              } ${
                !podeGerenciar || salvandoRenovacaoAutomatica
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                  renovacaoAutomatica ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 px-3 py-3 text-xs text-violet-100">
            {salvandoRenovacaoAutomatica
              ? "Salvando configuração..."
              : podeGerenciar
              ? "Você pode ativar ou desativar essa opção a qualquer momento."
              : "Somente administradores podem alterar essa configuração."}
          </div>
        </div>
      </div>
    </section>
  );
}