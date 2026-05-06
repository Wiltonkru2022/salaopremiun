"use client";

import Link from "next/link";
import { CalendarDays, LogOut, Search, ShieldCheck } from "lucide-react";
import ClientAppPendingLink from "@/components/client-app/ClientAppPendingLink";

export default function ClientProfileShortcuts() {
  return (
    <div className="rounded-[1.6rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <h2 className="text-lg font-black text-zinc-950">Atalhos</h2>
      <div className="mt-5 space-y-3">
        <ClientAppPendingLink
          href="/app-cliente/agendamentos"
          icon={CalendarDays}
          pendingLabel="Abrindo"
          className="flex h-12 items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-800"
        >
          Agenda
        </ClientAppPendingLink>
        <ClientAppPendingLink
          href="/app-cliente/inicio"
          icon={Search}
          className="flex h-12 items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-800"
        >
          Buscar saloes
        </ClientAppPendingLink>
        <Link
          href="/app-cliente/recuperar-acesso"
          className="flex h-12 items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-800"
        >
          <ShieldCheck size={18} />
          Recuperar acesso
        </Link>
        <Link
          href="/app-cliente/logout?destino=/app-cliente/login"
          className="flex h-12 items-center gap-3 rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white"
        >
          <LogOut size={18} />
          Sair
        </Link>
      </div>
    </div>
  );
}
