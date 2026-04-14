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
    <div className="border-l-4 border-zinc-900 bg-zinc-50 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {eyebrow}
      </div>
      <h3 className="mt-1 text-sm font-semibold text-zinc-900">{title}</h3>
      {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}

      <div
        className={`mt-4 grid gap-4 ${
          steps.length >= 3 ? "lg:grid-cols-3" : steps.length === 2 ? "md:grid-cols-2" : ""
        }`}
      >
        {steps.map((step, index) => (
          <div key={`${step.title}-${index}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Passo {index + 1}
            </div>
            <div className="mt-1 text-sm font-semibold text-zinc-900">{step.title}</div>
            <p className="mt-1 text-sm text-zinc-600">{step.description}</p>
          </div>
        ))}
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
