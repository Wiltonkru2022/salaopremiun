import ClientAuthShell from "@/components/client-app/auth/ClientAuthShell";
import RecuperarAcessoClienteForm from "@/components/client-app/auth/RecuperarAcessoClienteForm";

export const metadata = { title: "Recuperar Acesso" };

type Props = { searchParams: Promise<{ email?: string | string[] }> };

export default async function RecuperarAcessoClientePage({ searchParams }: Props) {
  const params = await searchParams;
  const emailParam = Array.isArray(params.email) ? params.email[0] : params.email;
  const initialEmail = String(emailParam || "").trim().toLowerCase();

  return (
    <ClientAuthShell backHref="/app-cliente/login">
      <section className="mx-auto max-w-2xl">
        <RecuperarAcessoClienteForm initialEmail={initialEmail} />
      </section>
    </ClientAuthShell>
  );
}
