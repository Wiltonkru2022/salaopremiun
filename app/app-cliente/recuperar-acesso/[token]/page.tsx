import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import RedefinirSenhaClienteForm from "@/components/client-app/auth/RedefinirSenhaClienteForm";

export const metadata = {
  title: "Criar Nova Senha | SalaoPremium",
};

export default async function RedefinirSenhaClientePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <ClientAppFrame
      title="Nova senha"
      subtitle="Finalize a recuperacao da sua conta do app cliente."
    >
      <section className="mx-auto max-w-2xl">
        <RedefinirSenhaClienteForm token={token} />
      </section>
    </ClientAppFrame>
  );
}
