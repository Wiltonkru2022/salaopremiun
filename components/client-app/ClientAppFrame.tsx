import type { ReactNode } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
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
    <div className="min-h-dvh overflow-x-hidden bg-white text-zinc-950">
      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col pb-24 md:pb-4">
        <header className="mx-4 mt-4 flex items-center justify-between gap-2 rounded-[1.5rem] border border-zinc-100 bg-white px-3 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:gap-3 sm:px-4 md:mx-6">
          <div className="min-w-0 flex-1">
            <div className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-800 sm:tracking-[0.14em]">
              <Sparkles size={12} />
              <span className="truncate">SalaoPremium Cliente</span>
            </div>
            <h1 className="mt-2 max-w-full truncate text-[1.22rem] font-black tracking-[-0.04em] sm:text-[1.35rem] md:text-[1.55rem]">
              {title}
            </h1>
            <p className="mt-1 max-w-full truncate text-xs leading-5 text-zinc-500 sm:text-sm">
              {subtitle}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
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
                Agendamentos
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

        <footer className="px-4 pb-4 text-center text-xs text-zinc-500">
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
