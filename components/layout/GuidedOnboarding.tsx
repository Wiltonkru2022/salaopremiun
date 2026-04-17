"use client";

import AppModal from "@/components/ui/AppModal";
import type {
  PainelOnboardingSnapshot,
  PainelOnboardingStep,
} from "@/lib/onboarding/painel-guide";

type Props = {
  open: boolean;
  pathname: string;
  stepIndex: number;
  steps: PainelOnboardingStep[];
  snapshot?: PainelOnboardingSnapshot | null;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
  onOpenStep: (href: string) => void;
  onSkip: () => void;
  onFinish: () => void;
};

function normalizePath(pathname: string) {
  const value = pathname || "/";
  if (value === "/") return value;
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export default function GuidedOnboarding({
  open,
  pathname,
  stepIndex,
  steps,
  snapshot,
  onClose,
  onBack,
  onNext,
  onOpenStep,
  onSkip,
  onFinish,
}: Props) {
  const currentStep = steps[stepIndex];
  const progress = steps.length > 0 ? ((stepIndex + 1) / steps.length) * 100 : 0;
  const currentPath = normalizePath(pathname);
  const targetPath = normalizePath(currentStep?.href || "/");
  const isCurrentArea =
    currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
  const pending = snapshot?.detalhes && typeof snapshot.detalhes === "object"
    ? [
        Number(snapshot.detalhes.profissionais || 0) < 2 ? "Equipe" : null,
        Number(snapshot.detalhes.servicos || 0) < 5 ? "Servicos" : null,
        Number(snapshot.detalhes.clientes || 0) < 5 ? "Clientes" : null,
        Number(snapshot.detalhes.agendamentos || 0) < 3 ? "Agenda" : null,
        Number(snapshot.detalhes.vendas || 0) < 1 ? "Vendas" : null,
        Number(snapshot.detalhes.caixas || 0) < 1 ? "Caixa" : null,
      ].filter(Boolean)
    : [];

  if (!currentStep) return null;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      eyebrow={`Passo ${stepIndex + 1} de ${steps.length}`}
      title="Onboarding guiado do painel"
      description="Use este roteiro para entender o sistema sem se perder nos menus."
      maxWidthClassName="max-w-4xl"
      panelClassName="overflow-hidden"
      bodyClassName="space-y-6 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_42%),linear-gradient(180deg,#fff_0%,#fffdf9_100%)]"
      footer={
        <>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-600 transition hover:border-zinc-950 hover:text-zinc-950"
          >
            Pular por agora
          </button>

          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:border-zinc-950"
            >
              Voltar
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onOpenStep(currentStep.href)}
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 transition hover:border-amber-300"
          >
            Abrir {currentStep.title}
          </button>

          <button
            type="button"
            onClick={stepIndex === steps.length - 1 ? onFinish : onNext}
            className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            {stepIndex === steps.length - 1 ? "Concluir tour" : "Proximo passo"}
          </button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[30px] border border-zinc-200 bg-white/95 p-6 shadow-sm">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">
            {currentStep.title}
          </div>
          <h3 className="mt-3 font-display text-3xl font-black tracking-[-0.04em] text-zinc-950">
            {currentStep.highlight}
          </h3>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600">
            {currentStep.description}
          </p>

          <div className="mt-6 rounded-[26px] border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400">
                  Caminho recomendado
                </div>
                <div className="mt-2 text-sm font-semibold text-zinc-900">
                  {currentStep.href}
                </div>
              </div>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                  isCurrentArea
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-zinc-200 text-zinc-700"
                }`}
              >
                {isCurrentArea ? "Voce ja esta aqui" : "Abrir area"}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
              <span>Progresso do tour</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-zinc-950 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
              Saude do onboarding
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                {
                  label: "Score",
                  value: `${Number(snapshot?.scoreTotal || 0)}/100`,
                },
                {
                  label: "Dias ativos",
                  value: String(Number(snapshot?.diasComAcesso || 0)),
                },
                {
                  label: "Modulos",
                  value: String(Number(snapshot?.modulosUsados || 0)),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-zinc-200 bg-zinc-50 px-4 py-3"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    {item.label}
                  </div>
                  <div className="mt-2 text-2xl font-black text-zinc-950">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
              O que ainda falta
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {pending.length > 0 ? (
                pending.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                  Base pronta para seguir sem tour.
                </span>
              )}
            </div>
          </section>

          <section className="rounded-[30px] border border-zinc-900 bg-zinc-950 p-5 text-white shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-amber-200">
              Dica rapida
            </div>
            <p className="mt-3 text-sm leading-7 text-zinc-200">
              O melhor uso do painel acontece nessa sequencia: entender o resumo,
              organizar agenda, cadastrar base, configurar servicos e so entao
              aprofundar caixa e assinatura.
            </p>
          </section>
        </aside>
      </div>
    </AppModal>
  );
}
