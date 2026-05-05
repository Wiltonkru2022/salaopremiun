import Link from "next/link";
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
    idCliente: session.idCliente,
    idSalao: session.idSalao,
  });
  const params = searchParams ? await searchParams : undefined;

  return (
    <ClientAppFrame
      title="Meu perfil"
      subtitle="Conta do cliente no app SalaoPremium."
    >
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <ClientProfileForm
          nome={profile.nome || session.nome}
          email={profile.email || session.email}
          telefone={profile.telefone}
          preferenciasGerais={profile.preferenciasGerais}
          successKey={params?.status || null}
        />

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
