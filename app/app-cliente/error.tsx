"use client";

import Link from "next/link";
import { RotateCcw, Store } from "lucide-react";

export default function AppClienteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="app-cliente-root min-h-dvh bg-[linear-gradient(180deg,#ffffff_0%,#f7f7f7_42%,#eeeeee_100%)] px-4 py-5 text-zinc-950">
      <main className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-md items-center">
        <section className="w-full rounded-[1.6rem] border border-zinc-200 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
            App cliente
          </div>
          <h1 className="mt-2 text-2xl font-black text-zinc-950">
            Nao foi possivel abrir esta tela
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Tente recarregar. Se nao resolver, volte para Saloes e continue
            navegando pelo app.
          </p>

          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-bold text-white"
            >
              <RotateCcw size={17} />
              Recarregar tela
            </button>
            <Link
              href="/app-cliente/inicio"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold text-zinc-800"
            >
              <Store size={17} />
              Ir para Saloes
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
