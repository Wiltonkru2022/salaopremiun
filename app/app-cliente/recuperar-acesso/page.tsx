import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import RecuperarAcessoClienteForm from "@/components/client-app/auth/RecuperarAcessoClienteForm";

export default function RecuperarAcessoClientePage() {
  return (
    <ClientAppFrame
      title="Recuperar acesso"
      subtitle="Atualize sua senha da conta global do app cliente."
    >
      <section className="mx-auto max-w-2xl">
        <RecuperarAcessoClienteForm />
      </section>
    </ClientAppFrame>
  );
}
