import Link from "next/link";
import {
  ChevronRight,
  CreditCard,
  HelpCircle,
  LogOut,
  Settings,
  Star,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import { getClienteAppProfileData } from "@/lib/client-app/queries";
import { requireClienteAppContext } from "@/lib/client-context.server";

function ProfileRow({
  href,
  label,
  icon: Icon,
  muted,
  prefetch,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  muted?: boolean;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={`flex min-h-16 items-center justify-between border-b border-zinc-100 px-1 text-lg ${
        muted ? "text-zinc-400" : "text-zinc-950"
      }`}
    >
      <span className="inline-flex items-center gap-3">
        <Icon size={22} className="text-zinc-400" />
        {label}
      </span>
      <ChevronRight size={26} className="text-zinc-300" />
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
      <section className="mx-auto max-w-3xl px-4 py-4 md:px-6">
        <div className="flex items-center gap-5 py-6">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-zinc-900 bg-zinc-100 text-4xl font-black text-zinc-900">
            {initial}
            <span className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-zinc-100 text-zinc-700">
              <UserRound size={20} />
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-3xl font-black tracking-[-0.04em] text-zinc-800">
              {profile.nome || session.nome}
            </h1>
            <p className="mt-2 text-lg text-zinc-500">
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
              Credito disponivel no salao
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

        <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <ProfileRow
            href="/app-cliente/perfil/editar"
            label="Detalhes da conta"
            icon={UserRound}
          />
          <ProfileRow
            href="/app-cliente/perfil/avaliacoes"
            label="Avaliacoes"
            icon={Star}
          />
          <ProfileRow
            href="/app-cliente/perfil/pagamentos"
            label="Pagamentos e recibos"
            icon={CreditCard}
          />
          <ProfileRow
            href="/app-cliente/perfil/configuracoes"
            label="Configuracoes"
            icon={Settings}
          />
          <ProfileRow
            href="https://wa.me/5567984341742"
            label="Comentarios e suporte"
            icon={HelpCircle}
          />
          <ProfileRow
            href="/app-cliente/logout?destino=/app-cliente/login"
            label="Sair"
            icon={LogOut}
            muted
            prefetch={false}
          />
        </div>
      </section>
    </ClientAppFrame>
  );
}
