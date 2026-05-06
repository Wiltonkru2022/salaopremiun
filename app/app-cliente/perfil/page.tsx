import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientProfileShortcuts from "@/components/client-app/ClientProfileShortcuts";
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

          <ClientProfileShortcuts />
        </div>
      </section>
    </ClientAppFrame>
  );
}
