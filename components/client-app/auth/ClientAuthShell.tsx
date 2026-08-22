import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export default function ClientAuthShell({
  children,
  backHref = "/app-cliente",
}: {
  children: ReactNode;
  backHref?: string;
}) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-[#f7f7f5] text-zinc-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#f7f7f5]">
        <header className="sp-mobile-fixed fixed inset-x-0 top-0 z-[80] mx-auto w-full max-w-md border-b border-zinc-200/80 bg-white/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.65rem)] shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl">
          <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
            <Link
              href={backHref}
              className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-950 transition active:bg-zinc-100"
              aria-label="Voltar"
            >
              <ArrowLeft size={27} />
            </Link>

            <div className="flex min-w-0 items-center justify-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-950 shadow-sm">
                <img
                  src="/favicon-preview.png"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="min-w-0 text-left">
                <strong className="block truncate text-[1.05rem] font-black leading-tight tracking-[-0.03em] text-zinc-950">
                  Salão Premium
                </strong>
                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#9b6a14]">
                  App Cliente
                </span>
              </span>
            </div>

            <span aria-hidden="true" className="h-11 w-11" />
          </div>
        </header>

        <main className="flex flex-1 items-start px-4 pb-8 pt-[calc(env(safe-area-inset-top)+5.7rem)]">
          <div className="w-full">{children}</div>
        </main>

        <footer className="border-t border-zinc-200/80 bg-white/70 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 text-center text-xs font-semibold text-zinc-500">
          Salão Premium 2026
        </footer>
      </div>
    </div>
  );
}
