import type { ReactNode } from "react";
import Link from "next/link";

export default function ClientAppFrame({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,#fff2c5_0,#f7f7f5_42%,#eceef3_100%)] text-zinc-950">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-4 md:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-[1.8rem] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700">
              SalaoPremium Cliente
            </div>
            <h1 className="mt-1 text-[1.45rem] font-black tracking-[-0.04em]">
              {title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-700">
            <Link
              href="/app-cliente/inicio"
              className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 transition hover:bg-zinc-100"
            >
              Salaes
            </Link>
            <Link
              href="/app-cliente/agendamentos"
              className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 transition hover:bg-zinc-100"
            >
              Meus agendamentos
            </Link>
            <Link
              href="/app-cliente/perfil"
              className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 transition hover:bg-zinc-100"
            >
              Perfil
            </Link>
          </nav>
        </header>

        <main className="flex-1 py-4">{children}</main>

        <footer className="pb-4 text-center text-xs text-zinc-500">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/termos-de-uso" className="underline underline-offset-4">
              Termos de uso
            </Link>
            <Link
              href="/politica-de-privacidade"
              className="underline underline-offset-4"
            >
              Politica de privacidade
            </Link>
            <Link
              href="/app-cliente/recuperar-acesso"
              className="underline underline-offset-4"
            >
              Recuperar acesso
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
