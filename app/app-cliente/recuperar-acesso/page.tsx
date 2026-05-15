import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import RecuperarAcessoClienteForm from "@/components/client-app/auth/RecuperarAcessoClienteForm";

export const metadata = {
  title: "Recuperar Acesso",
};

type RecuperarAcessoClientePageProps = {
  searchParams: Promise<{ email?: string | string[] }>;
};

export default async function RecuperarAcessoClientePage({
  searchParams,
}: RecuperarAcessoClientePageProps) {
  const params = await searchParams;
  const emailParam = Array.isArray(params.email) ? params.email[0] : params.email;
  const initialEmail = String(emailParam || "").trim().toLowerCase();

  return (
    <ClientAppFrame
      title="Recuperar acesso"
      subtitle="Atualize sua senha do app cliente."
    >
      <section className="mx-auto max-w-2xl">
        <RecuperarAcessoClienteForm initialEmail={initialEmail} />
      </section>
    </ClientAppFrame>
  );
}
