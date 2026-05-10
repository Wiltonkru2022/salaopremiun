import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientProfileForm from "@/components/client-app/ClientProfileForm";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { getClienteAppProfileData } from "@/lib/client-app/queries";

export const metadata = {
  title: "Editar Perfil | SalaoPremium",
};

export default async function ClientePerfilEditarPage() {
  const session = await requireClienteAppContext();
  const profile = await getClienteAppProfileData({
    idConta: session.idConta,
  });

  return (
    <ClientAppFrame
      title="Editar perfil"
      subtitle="Atualize seus dados com calma."
    >
      <section className="mx-auto max-w-3xl space-y-4 px-4 py-4 md:px-6">
        <Link
          href="/app-cliente/perfil"
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-800 shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
        >
          <ChevronLeft size={18} />
          Voltar ao perfil
        </Link>

        <ClientProfileForm
          nome={profile.nome || session.nome}
          email={profile.email || session.email}
          telefone={profile.telefone}
          preferenciasGerais={profile.preferenciasGerais}
        />
      </section>
    </ClientAppFrame>
  );
}
