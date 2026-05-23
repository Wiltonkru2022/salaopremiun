import Link from "next/link";
import {
  ChevronRight,
  CreditCard,
  FileText,
  HelpCircle,
  Info,
  LogOut,
  Bell,
  ShieldCheck,
  Settings,
  Sparkles,
  Star,
  TicketPercent,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AppVersionBadge from "@/components/app-mobile/AppVersionBadge";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import { getClienteAppProfileData } from "@/lib/client-app/queries";
import { requireClienteAppContext } from "@/lib/client-context.server";

export const metadata = {
  title: "Perfil do Cliente",
};

function ProfileRow({
  href,
  label,
  icon: Icon,
  muted,
  gold,
  prefetch,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  muted?: boolean;
  gold?: boolean;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={`flex min-h-[5.2rem] items-center justify-between border-b border-zinc-100 px-2 text-xl ${
        muted ? "text-zinc-400" : "text-zinc-950"
      }`}
    >
      <span className="inline-flex items-center gap-5">
        <Icon
          size={29}
          strokeWidth={1.9}
          className={gold ? "text-[#b88918]" : "text-zinc-950"}
        />
        {label}
      </span>
      <ChevronRight size={28} className="text-zinc-300" />
    </Link>
  );
}

export default async function ClientePerfilPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const session = await requireClienteAppContext();
  const profile = await getClienteAppProfileData({
    idConta: session.idConta,
  });
  const params = searchParams ? await searchParams : undefined;
  const initial = (profile.nome || session.nome || "C").slice(0, 1).toUpperCase();

  return (
    <ClientAppFrame title="Perfil" subtitle="Sua conta no Salão Premium.">
      <section className="mx-auto min-h-dvh max-w-3xl bg-white px-5 pb-28 pt-[calc(env(safe-area-inset-top)+1.2rem)] md:px-6">
        <header className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.24em] text-[#9b6110]">
              <Sparkles size={18} />
              Salão Premium Cliente
            </div>
            <h1 className="mt-5 text-[2.2rem] font-black leading-none tracking-[-0.05em] text-zinc-950">
              Perfil
            </h1>
            <p className="mt-3 text-xl text-zinc-500">
              Sua conta no Salão Premium.
            </p>
          </div>
          <Link
            href="/app-cliente/notificacoes"
            className="mt-11 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-500"
            aria-label="Notificações"
          >
            <Bell size={27} strokeWidth={1.8} />
          </Link>
        </header>

        <div className="flex items-center gap-7 py-8">
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-[3px] border-zinc-950 bg-zinc-50 text-6xl font-black text-zinc-950">
            {initial}
            <span className="absolute bottom-1 right-0 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-white text-[#b88918] shadow-sm">
              <UserRound size={24} />
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-[2.1rem] font-black leading-tight tracking-[-0.05em] text-zinc-950">
              {profile.nome || session.nome}
            </h1>
            <p className="mt-3 text-xl text-zinc-500">
              {profile.telefone || profile.email || session.email}
            </p>
          </div>
        </div>

        {params?.status === "salvo" ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Perfil atualizado com sucesso.
          </div>
        ) : null}

        {profile.creditos.length ? (
          <div className="mb-5 rounded-2xl bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-amber-800">
              <WalletCards size={18} />
              Crédito disponível no salão
            </div>
            <div className="mt-3 space-y-2">
              {profile.creditos.map((item) => (
                <div
                  key={item.idSalao}
                  className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate font-bold text-zinc-900">
                    {item.salaoNome}
                  </span>
                  <span className="font-black text-amber-800">
                    {item.credito.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-zinc-100">
          <ProfileRow
            href="/app-cliente/perfil/editar"
            label="Detalhes da conta"
            icon={UserRound}
            gold
          />
          <ProfileRow
            href="/app-cliente/favoritos"
            label="Salões favoritos"
            icon={Star}
            gold
          />
          <ProfileRow
            href="/app-cliente/cupons"
            label="Meus cupons"
            icon={TicketPercent}
            gold
          />
          <ProfileRow
            href="/app-cliente/perfil/avaliacoes"
            label="Avaliações"
            icon={Star}
            gold
          />
          <ProfileRow
            href="/app-cliente/perfil/pagamentos"
            label="Pagamentos e recibos"
            icon={CreditCard}
          />
          <ProfileRow
            href="/app-cliente/perfil/configuracoes"
            label="Configurações"
            icon={Settings}
          />
          <ProfileRow
            href="/app-cliente/notificacoes"
            label="Notificações"
            icon={Bell}
          />
          <ProfileRow
            href="/app-cliente/duvidas"
            label="Dúvidas do app"
            icon={Info}
          />
          <ProfileRow
            href="/app-cliente/suporte"
            label="Comentários e suporte"
            icon={HelpCircle}
          />
          <ProfileRow
            href="/app-cliente/termos"
            label="Termos de uso"
            icon={FileText}
          />
          <ProfileRow
            href="/app-cliente/privacidade"
            label="Privacidade"
            icon={ShieldCheck}
          />
          <ProfileRow
            href="/app-cliente/logout?destino=/app-cliente/login"
            label="Sair"
            icon={LogOut}
            muted
            prefetch={false}
          />
        </div>
        <div className="mt-4">
          <AppVersionBadge label="App Cliente" />
        </div>
      </section>
    </ClientAppFrame>
  );
}
