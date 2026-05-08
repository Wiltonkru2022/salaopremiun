"use client";

import Link from "next/link";
import { BellRing, CalendarDays, LogOut, Search, ShieldCheck, UserPen } from "lucide-react";
import ClientAppPendingLink from "@/components/client-app/ClientAppPendingLink";
import PushPermissionRuntime from "@/components/push/PushPermissionRuntime";

export default function ClientProfileShortcuts() {
  return (
    <div className="space-y-4">
      <div className="rounded-[1.6rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <h2 className="text-lg font-black text-zinc-950">Conta e seguranca</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500">
          Controle seus dados, acesso e avisos do app.
        </p>
        <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-900">
              <BellRing size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-zinc-950">
                Notificações do app
              </div>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Receba lembretes, confirmações e pedidos de avaliação.
              </p>
              <div className="mt-3">
                <PushPermissionRuntime audience="cliente_app" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[1.6rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
      <h2 className="text-lg font-black text-zinc-950">Atalhos</h2>
      <div className="mt-5 space-y-3">
        <Link
          href="/app-cliente/perfil/editar"
          className="flex h-12 items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-800"
        >
          <UserPen size={18} />
          Editar cadastro
        </Link>
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
          Buscar salões
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
    </div>
  );
}
