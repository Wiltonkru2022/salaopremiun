import Link from "next/link";
import { CalendarDays, LogOut, Search, ShieldCheck } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import { requireClienteAppContext } from "@/lib/client-context.server";
import ClientProfileForm from "@/components/client-app/ClientProfileForm";
import { getClienteAppProfileData } from "@/lib/client-app/queries";

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

  return (
    <ClientAppFrame
      title="Perfil"
      subtitle="Seus dados e preferencias."
    >
      <section className="space-y-4">
        <div className="overflow-hidden rounded-[1.6rem] border border-white/70 bg-zinc-950 text-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.35),transparent_38%),linear-gradient(135deg,#18181b,#27272a)] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.2rem] bg-white text-2xl font-black text-zinc-950">
                {(profile.nome || session.nome || "C").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
                  Conta cliente
                </div>
                <h2 className="mt-1 truncate text-2xl font-black">
                  {profile.nome || session.nome}
                </h2>
                <div className="mt-1 truncate text-sm text-white/70">
                  {profile.email || session.email}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <ClientProfileForm
          nome={profile.nome || session.nome}
          email={profile.email || session.email}
          telefone={profile.telefone}
          preferenciasGerais={profile.preferenciasGerais}
          successKey={params?.status || null}
        />

        <div className="rounded-[1.6rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <h2 className="text-lg font-black text-zinc-950">
            Atalhos
          </h2>
          <div className="mt-5 space-y-3">
            <Link
              href="/app-cliente/agendamentos"
              className="flex h-12 items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-800"
            >
              <CalendarDays size={18} />
              Agenda
            </Link>
            <Link
              href="/app-cliente/inicio"
              className="flex h-12 items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-800"
            >
              <Search size={18} />
              Buscar saloes
            </Link>
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
      </section>
    </ClientAppFrame>
  );
}
