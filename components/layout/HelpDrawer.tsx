"use client";

import AppModal from "@/components/ui/AppModal";
import type {
  PainelOnboardingSnapshot,
  PainelOnboardingStep,
} from "@/lib/onboarding/painel-guide";

type Props = {
  open: boolean;
  currentStep?: PainelOnboardingStep | null;
  snapshot?: PainelOnboardingSnapshot | null;
  pending?: string[];
  onClose: () => void;
  onOpenStep: (href: string) => void;
  onOpenTourFromHere: () => void;
  onRestartTour: () => void;
};

export default function HelpDrawer({
  open,
  currentStep,
  snapshot,
  pending = [],
  onClose,
  onOpenStep,
  onOpenTourFromHere,
  onRestartTour,
}: Props) {
  if (!open || !currentStep) return null;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      eyebrow="Ajuda contextual"
      title={`Como usar ${currentStep.title}`}
      description="Abra a area certa, siga a checklist minima e reabra o tour quando quiser."
      maxWidthClassName="max-w-4xl"
      panelClassName="overflow-hidden"
      bodyClassName="space-y-6 bg-[linear-gradient(180deg,#fff_0%,#fffdf9_100%)]"
      footer={
        <>
          <button
            type="button"
            onClick={onRestartTour}
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
          >
            Reiniciar tour
          </button>
          <button
            type="button"
            onClick={onOpenTourFromHere}
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 transition hover:border-amber-300"
          >
            Abrir tour daqui
          </button>
          <button
            type="button"
            onClick={() => onOpenStep(currentStep.href)}
            className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Ir para {currentStep.title}
          </button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">
            Foco da area
          </div>
          <h3 className="mt-3 font-display text-3xl font-black tracking-[-0.04em] text-zinc-950">
            {currentStep.highlight}
          </h3>
          <p className="mt-4 text-sm leading-7 text-zinc-600">
            {currentStep.description}
          </p>

          <div className="mt-6 rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Checklist minima
            </div>
            <div className="mt-3 space-y-2">
              {currentStep.checklist.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
              Acoes rapidas
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {currentStep.quickActions.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
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
                  Nenhuma pendencia critica nessa trilha.
                </span>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-zinc-900 bg-zinc-950 p-5 text-white shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-amber-200">
              Saude do onboarding
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                {
                  label: "Score",
                  value: `${Number(snapshot?.scoreTotal || 0)}/100`,
                },
                {
                  label: "Dias",
                  value: String(Number(snapshot?.diasComAcesso || 0)),
                },
                {
                  label: "Modulos",
                  value: String(Number(snapshot?.modulosUsados || 0)),
                },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/8 px-3 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                    {item.label}
                  </div>
                  <div className="mt-2 text-xl font-black text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </AppModal>
  );
}
