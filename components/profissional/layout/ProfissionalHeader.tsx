"use client";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function ProfissionalHeader({ title, subtitle }: Props) {
  return (
    <header className="rounded-b-[2rem] border-b border-zinc-200 bg-white px-5 pb-5 pt-6 text-zinc-950 shadow-sm">
      <div className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">
        app do profissional
      </div>

      <h1 className="mt-2 text-[1.75rem] font-semibold leading-none">
        {title || "SalãoPremium 1"}
      </h1>

      {subtitle ? <p className="mt-2 text-sm text-zinc-500">{subtitle}</p> : null}
    </header>
  );
}
