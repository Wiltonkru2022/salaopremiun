import { X } from "lucide-react";

export function Modal({
  title,
  subtitle,
  open,
  onClose,
  children
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-zinc-950/48 backdrop-blur-[3px] sm:items-center sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.65rem] border border-white/70 bg-[#fbfbfa] shadow-[0_-18px_60px_rgba(9,9,11,0.20)] sm:max-h-[88vh] sm:max-w-lg sm:rounded-[1.55rem] sm:shadow-[0_24px_80px_rgba(9,9,11,0.22)]"
      >
        <div className="flex justify-center pb-1 pt-2.5 sm:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-zinc-300" />
        </div>

        <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-[#fbfbfa]/95 px-5 pb-4 pt-2.5 backdrop-blur-xl sm:pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-[0.64rem] font-black uppercase tracking-[0.22em] text-amber-700">Salão Premiun</div>
              <h2 className="mt-1 text-[1.65rem] font-black leading-[1.05] tracking-[-0.055em] text-zinc-950 sm:text-[1.75rem]">{title}</h2>
              {subtitle ? (
                <p className="mt-1.5 max-w-[26rem] text-[0.86rem] font-semibold leading-5 text-zinc-500">{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-950 shadow-[0_3px_10px_rgba(15,23,42,0.05)] transition active:scale-95 active:bg-zinc-100"
              onClick={onClose}
              aria-label="Fechar"
            >
              <X size={21} strokeWidth={2.2} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:py-5">
          {children}
        </div>
      </section>
    </div>
  );
}

export function ModalActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-5 mt-4 border-t border-zinc-200/70 bg-[#fbfbfa]/96 px-5 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-3.5 backdrop-blur-xl">
      <div className="grid gap-2">{children}</div>
    </div>
  );
}
