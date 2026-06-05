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
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-zinc-950/55 p-3 backdrop-blur-sm sm:items-center">
      <section className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-zinc-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-amber-700">Salao Premiun</div>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-zinc-950">{title}</h2>
              {subtitle ? <p className="mt-1 text-sm font-bold leading-5 text-zinc-500">{subtitle}</p> : null}
            </div>
            <button className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-950 active:scale-95" onClick={onClose} aria-label="Fechar">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="max-h-[calc(90vh-6rem)] overflow-auto px-5 py-5">
          {children}
        </div>
      </section>
    </div>
  );
}

export function ModalActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-2 border-t border-zinc-100 bg-white/95 px-5 pt-4 backdrop-blur">
      <div className="grid gap-2 pb-1">{children}</div>
    </div>
  );
}
