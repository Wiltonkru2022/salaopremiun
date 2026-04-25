"use client";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function ProfissionalHeader({ title, subtitle }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/70 bg-white/88 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] text-zinc-950 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:px-5">
      <div className="mx-auto w-full max-w-2xl">
        <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#9a6c17]">
          App do profissional
        </div>

        <h1 className="mt-3 text-[1.8rem] font-black tracking-[-0.05em] leading-none">
          {title || "SalaoPremium"}
        </h1>

        {subtitle ? (
          <p className="mt-2 max-w-[36rem] text-sm leading-6 text-zinc-500">
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
  );
}
