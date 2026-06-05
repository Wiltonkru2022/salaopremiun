"use client";

import PushPermissionRuntime from "@/components/push/PushPermissionRuntime";
import ProfissionalDrawerNav from "./ProfissionalDrawerNav";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function ProfissionalHeader({ title, subtitle }: Props) {
  return (
    <header className="sp-mobile-fixed fixed left-1/2 top-0 z-50 w-full max-w-md -translate-x-1/2 border-b border-zinc-100 bg-white/95 px-3 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] text-zinc-950 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:max-w-lg sm:px-5 lg:max-w-2xl">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-100 bg-white shadow-[0_10px_24px_rgba(180,120,24,0.14)]">
            <img
              src="/logo.png"
              alt="Salao Premiun"
              className="h-9 w-9 object-contain"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-amber-800">
              Salao Premiun
            </div>

            <h1 className="mt-1 max-w-full truncate text-[1.22rem] font-black leading-none tracking-[-0.04em] sm:text-[1.4rem]">
              {title || "Profissional"}
            </h1>

            {subtitle ? (
              <p className="mt-1 max-w-full truncate text-xs leading-5 text-zinc-500 sm:text-sm">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ProfissionalDrawerNav />
          <PushPermissionRuntime audience="profissional_app" compact />
        </div>
      </div>
    </header>
  );
}
