"use client";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function ProfissionalHeader({ title, subtitle }: Props) {
  return (
    <header className="sticky top-0 z-30 rounded-b-[2rem] border-b border-white/70 bg-white/90 px-5 pb-5 pt-[calc(env(safe-area-inset-top)+1.15rem)] text-zinc-950 shadow-sm backdrop-blur-xl">
      <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#9a6c17]">
        app do profissional
      </div>

      <h1 className="mt-2 text-[1.75rem] font-semibold leading-none">
        {title || "SalaoPremium"}
      </h1>

      {subtitle ? <p className="mt-2 text-sm text-zinc-500">{subtitle}</p> : null}
    </header>
  );
}
