import type { ReactNode } from "react";

export type ComissaoHelpStep = {
  title: string;
  description: string;
};

type ComissaoHelpPanelProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  steps: ComissaoHelpStep[];
  children?: ReactNode;
};

export function ComissaoHelpPanel({
  eyebrow = "Guia rapido",
  title,
  description,
  steps,
  children,
}: ComissaoHelpPanelProps) {
  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {eyebrow}
          </div>
          <h3 className="mt-1 text-xl font-bold text-zinc-950">{title}</h3>
          {description ? <p className="mt-2 text-sm text-zinc-600">{description}</p> : null}
        </div>
      </div>

      <div
        className={`mt-5 grid gap-3 ${
          steps.length >= 3 ? "lg:grid-cols-3" : steps.length === 2 ? "md:grid-cols-2" : ""
        }`}
      >
        {steps.map((step, index) => (
          <div
            key={`${step.title}-${index}`}
            className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Passo {index + 1}
            </div>
            <div className="mt-2 text-sm font-semibold text-zinc-900">{step.title}</div>
            <p className="mt-2 text-sm text-zinc-600">{step.description}</p>
          </div>
        ))}
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
