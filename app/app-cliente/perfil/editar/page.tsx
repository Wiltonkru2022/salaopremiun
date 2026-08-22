import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientProfileForm from "@/components/client-app/ClientProfileForm";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { getClienteAppProfileData } from "@/lib/client-app/queries";

export const metadata = {
  title: "Editar Perfil",
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
      <section className="mx-auto max-w-3xl px-4 py-4 md:px-6">
        <ClientProfileForm
          nome={profile.nome || session.nome}
          email={profile.email || session.email}
          telefone={profile.telefone || session.whatsapp || session.telefone}
          cpf={session.cpf}
          dataNascimento={session.dataNascimento}
          preferenciasGerais={profile.preferenciasGerais}
        />
      </section>
    </ClientAppFrame>
  );
}
