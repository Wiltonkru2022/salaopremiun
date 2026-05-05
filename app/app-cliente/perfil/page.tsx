import Link from "next/link";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import { requireClienteAppContext } from "@/lib/client-context.server";

export default async function ClientePerfilPage() {
  const session = await requireClienteAppContext();

  return (
    <ClientAppFrame
      title="Meu perfil"
      subtitle="Conta do cliente no app SalaoPremium."
    >
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.8rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <h2 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
            Dados principais
          </h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                Nome
              </div>
              <div className="mt-1 text-base font-semibold text-zinc-950">
                {session.nome}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                E-mail
              </div>
              <div className="mt-1 text-base font-semibold text-zinc-950">
                {session.email}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-white/70 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <h2 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
            Acoes
          </h2>
          <div className="mt-5 space-y-3">
            <Link
              href="/app-cliente/agendamentos"
              className="flex h-12 items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-800"
            >
              Ver meus agendamentos
            </Link>
            <Link
              href="/app-cliente/logout?destino=/app-cliente/login"
              className="flex h-12 items-center rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white"
            >
              Sair da conta
            </Link>
          </div>
        </div>
      </section>
    </ClientAppFrame>
  );
}
