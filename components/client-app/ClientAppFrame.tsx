import type { ReactNode } from "react";
import Link from "next/link";
import ClientAppPendingLink from "@/components/client-app/ClientAppPendingLink";
import ClientAppBottomNav from "@/components/client-app/ClientAppBottomNav";
import PushPermissionRuntime from "@/components/push/PushPermissionRuntime";

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
    <div className="min-h-dvh bg-[linear-gradient(180deg,#ffffff_0%,#f7f7f7_42%,#eeeeee_100%)] text-zinc-950">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 pb-24 pt-4 md:px-6 md:pb-4">
        <header className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-zinc-200 bg-white/95 px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              SalaoPremium
            </div>
            <h1 className="mt-1 text-[1.35rem] font-black md:text-[1.45rem]">
              {title}
            </h1>
            <p className="mt-1 hidden text-sm text-zinc-500 sm:block">{subtitle}</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <PushPermissionRuntime audience="cliente_app" compact />
            <nav className="hidden flex-wrap items-center gap-2 text-sm font-semibold text-zinc-700 md:flex">
              <ClientAppPendingLink
                href="/app-cliente/inicio"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 transition hover:bg-zinc-100"
              >
                Saloes
              </ClientAppPendingLink>
              <ClientAppPendingLink
                href="/app-cliente/agendamentos"
                pendingLabel="Abrindo"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 transition hover:bg-zinc-100"
              >
                Meus agendamentos
              </ClientAppPendingLink>
              <ClientAppPendingLink
                href="/app-cliente/perfil"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 transition hover:bg-zinc-100"
              >
                Perfil
              </ClientAppPendingLink>
            </nav>
          </div>
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
      <ClientAppBottomNav />
    </div>
  );
}
