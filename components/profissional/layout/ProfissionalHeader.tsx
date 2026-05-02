"use client";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function ProfissionalHeader({ title, subtitle }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/70 bg-white/88 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.85rem)] text-zinc-950 shadow-[0_8px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:px-5">
      <div className="mx-auto w-full max-w-2xl">
        <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#9a6c17]">
          App do profissional
        </div>

        <h1 className="mt-2.5 text-[1.55rem] font-black tracking-[-0.04em] leading-none">
          {title || "SalaoPremium"}
        </h1>

        {subtitle ? (
          <p className="mt-1.5 max-w-[36rem] text-sm leading-6 text-zinc-500">
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
  );
}
