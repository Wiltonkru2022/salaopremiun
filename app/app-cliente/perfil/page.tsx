import Link from "next/link";
import {
  Bell,
  ChevronRight,
  CreditCard,
  FileText,
  HelpCircle,
  Info,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  TicketPercent,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AppVersionBadge from "@/components/app-mobile/AppVersionBadge";
import ClientAppDrawerNav from "@/components/client-app/ClientAppDrawerNav";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import { getClienteAppProfileData } from "@/lib/client-app/queries";
import { requireClienteAppContext } from "@/lib/client-context.server";

export const metadata = { title: "Perfil do Cliente" };

function ProfileRow({ href, label, icon: Icon, muted, gold, prefetch }: { href: string; label: string; icon: LucideIcon; muted?: boolean; gold?: boolean; prefetch?: boolean }) {
  return <Link href={href} prefetch={prefetch} className={`flex min-h-[4.25rem] items-center justify-between border-b border-zinc-100 px-1 text-base font-bold ${muted ? "text-zinc-400" : "text-zinc-950"}`}>
    <span className="inline-flex min-w-0 items-center gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${gold ? "bg-amber-50 text-[#a66d11]" : "bg-zinc-100 text-zinc-700"}`}><Icon size={20} /></span><span className="truncate">{label}</span></span>
    <ChevronRight size={21} className="shrink-0 text-zinc-300" />
  </Link>;
}

function SectionTitle({ children }: { children: React.ReactNode }) { return <div className="px-1 pb-2 pt-5 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">{children}</div>; }

export default async function ClientePerfilPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  const session = await requireClienteAppContext();
  const profile = await getClienteAppProfileData({ idConta: session.idConta });
  const params = searchParams ? await searchParams : undefined;
  const initial = (profile.nome || session.nome || "C").slice(0, 1).toUpperCase();
  const identity = profile.telefone || profile.email || session.email || "Conta Salão Premium";

  return <ClientAppFrame title="Perfil" subtitle="Sua conta no Salão Premium.">
    <section className="mx-auto min-h-dvh max-w-3xl bg-white px-5 pb-28 pt-0 md:px-6">
      <header className="sp-mobile-fixed sticky top-0 z-50 -mx-5 flex items-start justify-between gap-3 border-b border-zinc-100 bg-white/96 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+0.9rem)] backdrop-blur-xl md:-mx-6 md:px-6"><div><div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#9b6110]"><Sparkles size={16} />Salão Premium Cliente</div><h1 className="mt-2 text-[2rem] font-black leading-none tracking-[-0.05em] text-zinc-950">Perfil</h1></div><div className="flex items-center gap-1"><Link href="/app-cliente/notificacoes" className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 shadow-sm" aria-label="Notificações"><Bell size={23} /></Link><ClientAppDrawerNav /></div></header>

      <div className="mt-6 flex items-center gap-4 rounded-[1.4rem] border border-zinc-100 bg-zinc-50 p-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-3xl font-black text-white">{initial}<span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-zinc-50 bg-amber-100 text-[#9b6110]"><UserRound size={16} /></span></div>
        <div className="min-w-0"><h2 className="break-words text-xl font-black tracking-[-0.035em] text-zinc-950">{profile.nome || session.nome}</h2><p className="mt-1 truncate text-sm font-semibold text-zinc-500">{identity}</p><Link href="/app-cliente/perfil/editar" className="mt-3 inline-flex text-sm font-black text-[#9b6110]">Editar meus dados</Link></div>
      </div>

      {params?.status === "salvo" ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Perfil atualizado com sucesso.</div> : null}

      {profile.creditos.length ? <div className="mt-4 rounded-[1.25rem] border border-amber-100 bg-amber-50 p-4"><div className="flex items-center gap-2 text-sm font-black text-amber-800"><WalletCards size={18} />Créditos disponíveis</div><div className="mt-3 space-y-2">{profile.creditos.map((item) => <div key={item.idSalao} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm"><span className="min-w-0 truncate font-bold text-zinc-900">{item.salaoNome}</span><span className="font-black text-amber-800">{item.credito.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>)}</div></div> : null}

      <SectionTitle>Minha conta</SectionTitle>
      <div className="overflow-hidden rounded-[1.35rem] border border-zinc-100 bg-white px-3 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
        <ProfileRow href="/app-cliente/perfil/editar" label="Detalhes da conta" icon={UserRound} gold />
        <ProfileRow href="/app-cliente/favoritos" label="Salões favoritos" icon={Star} gold />
        <ProfileRow href="/app-cliente/cupons" label="Meus cupons" icon={TicketPercent} gold />
        <ProfileRow href="/app-cliente/perfil/avaliacoes" label="Minhas avaliações" icon={Star} />
        <ProfileRow href="/app-cliente/perfil/pagamentos" label="Pagamentos e recibos" icon={CreditCard} />
      </div>

      <SectionTitle>Preferências e ajuda</SectionTitle>
      <div className="overflow-hidden rounded-[1.35rem] border border-zinc-100 bg-white px-3 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
        <ProfileRow href="/app-cliente/perfil/configuracoes" label="Configurações" icon={Settings} />
        <ProfileRow href="/app-cliente/notificacoes" label="Notificações" icon={Bell} />
        <ProfileRow href="/app-cliente/duvidas" label="Dúvidas do app" icon={Info} />
        <ProfileRow href="/app-cliente/suporte" label="Comentários e suporte" icon={HelpCircle} />
      </div>

      <SectionTitle>Legal</SectionTitle>
      <div className="overflow-hidden rounded-[1.35rem] border border-zinc-100 bg-white px-3 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
        <ProfileRow href="/app-cliente/termos" label="Termos de uso" icon={FileText} />
        <ProfileRow href="/app-cliente/privacidade" label="Privacidade" icon={ShieldCheck} />
        <ProfileRow href="/app-cliente/logout?destino=/app-cliente/login" label="Sair" icon={LogOut} muted prefetch={false} />
      </div>
      <div className="mt-4"><AppVersionBadge label="App Cliente" /></div>
    </section>
  </ClientAppFrame>;
}
