type Props = {
  assinaturaStatus?: string | null;
  planoAtualNome?: string;
  bloqueioTotal?: boolean;
  vencendoLogo?: boolean;
  renovacaoAutomatica?: boolean;
  renovacaoPodeAlternar?: boolean;
  renovacaoTitulo?: string;
  renovacaoDescricao?: string;
  renovacaoObservacao?: string;
  renovacaoTone?: "green" | "amber" | "red" | "zinc";
  onToggleRenovacaoAutomatica?: (value: boolean) => void;
  salvandoRenovacaoAutomatica?: boolean;
  podeGerenciar?: boolean;
  tipoMudancaPlano?: "upgrade" | "downgrade" | null;
};

function getBadgeMudancaPlano(
  tipoMudancaPlano?: "upgrade" | "downgrade" | null
) {
  if (tipoMudancaPlano === "upgrade") {
    return {
      label: "Upgrade de plano",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (tipoMudancaPlano === "downgrade") {
    return {
      label: "Downgrade de plano",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return null;
}

function getRenovacaoToneClasses(tone: "green" | "amber" | "red" | "zinc") {
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-900";
  if (tone === "red") return "border-red-200 bg-red-50 text-red-800";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

export default function AssinaturaHero({
  assinaturaStatus,
  planoAtualNome,
  bloqueioTotal = false,
  vencendoLogo = false,
  renovacaoAutomatica = false,
  renovacaoPodeAlternar = false,
  renovacaoTitulo,
  renovacaoDescricao,
  renovacaoObservacao,
  renovacaoTone = "zinc",
  onToggleRenovacaoAutomatica,
  salvandoRenovacaoAutomatica = false,
  podeGerenciar = false,
  tipoMudancaPlano = null,
}: Props) {
  const status = String(assinaturaStatus || "").toLowerCase();
  const badgeMudanca = getBadgeMudancaPlano(tipoMudancaPlano);

  const titulo = bloqueioTotal
    ? "Seu acesso esta bloqueado ate regularizar a assinatura"
    : vencendoLogo
      ? "Sua assinatura esta perto do vencimento"
      : "Escolha seu plano e mantenha seu salao sempre liberado";

  const descricao = bloqueioTotal
    ? "O sistema identificou bloqueio automatico por vencimento. Regularize agora para voltar a usar todas as areas do painel."
    : vencendoLogo
      ? "Evite interrupcoes. Gere a cobranca, ajuste seu plano e mantenha sua operacao ativa sem sair da pagina."
      : "Controle teste gratis, vencimento, historico, upgrade, downgrade e cobranca por PIX, boleto ou cartao em uma experiencia premium.";

  return (
    <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white px-5 py-5 text-zinc-950 shadow-sm md:px-7 md:py-7 xl:px-8 xl:py-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl">
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-600">
              Assinatura SalaoPremium
            </div>

            {planoAtualNome ? (
              <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.20em] text-zinc-600">
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
              <div className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.20em] text-zinc-700">
                Status: {status.replaceAll("_", " ")}
              </div>
            ) : null}
          </div>

          <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight md:text-[2.8rem]">
            {titulo}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600 md:text-base">
            {descricao}
          </p>

          {bloqueioTotal ? (
            <div className="mt-4 rounded-[22px] border border-red-200 bg-red-50 px-4 py-3.5">
              <div className="text-sm font-semibold text-red-700 md:text-base">
                Bloqueio automatico ativo
              </div>
              <div className="mt-1 text-sm text-red-600">
                Enquanto a assinatura permanecer vencida, o sistema mantem o
                acesso restrito as rotas protegidas.
              </div>
            </div>
          ) : null}
        </div>

        <div className="w-full max-w-[400px] rounded-[24px] border border-zinc-200 bg-zinc-50 p-3.5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Renovacao automatica
              </div>
              <div className="mt-1.5 text-base font-bold text-zinc-950">
                {renovacaoTitulo || (renovacaoAutomatica ? "Ativada" : "Desativada")}
              </div>
              <p className="mt-1 text-sm text-zinc-600">
                {renovacaoDescricao ||
                  (renovacaoAutomatica
                    ? "O sistema mantem a proxima renovacao automatica alinhada com a forma de pagamento atual."
                    : "A proxima cobranca dependera de acao manual. Cartao automatico sera liberado apos tokenizacao segura.")}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={renovacaoAutomatica}
              disabled={
                !podeGerenciar ||
                salvandoRenovacaoAutomatica ||
                !renovacaoPodeAlternar
              }
              onClick={() =>
                !salvandoRenovacaoAutomatica &&
                podeGerenciar &&
                renovacaoPodeAlternar &&
                onToggleRenovacaoAutomatica?.(!renovacaoAutomatica)
              }
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition ${
                renovacaoAutomatica
                  ? "border-emerald-300 bg-emerald-500"
                  : "border-zinc-300 bg-zinc-200"
              } ${
                !podeGerenciar ||
                salvandoRenovacaoAutomatica ||
                !renovacaoPodeAlternar
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

          <div
            className={`mt-3 rounded-2xl border px-3 py-2.5 text-xs ${getRenovacaoToneClasses(
              renovacaoTone
            )}`}
          >
            {salvandoRenovacaoAutomatica
              ? "Salvando configuracao..."
              : podeGerenciar
                ? renovacaoObservacao ||
                  "Voce pode ativar ou desativar essa opcao a qualquer momento."
                : "Somente administradores podem alterar essa configuracao."}
          </div>
        </div>
      </div>
    </section>
  );
}
