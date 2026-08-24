import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientSalonDiscovery from "@/components/client-app/ClientSalonDiscovery";
import { validateClienteAppSession } from "@/lib/client-context.server";

export const metadata = {
  title: "Explorar Salões",
};

export default async function InicioClientePage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string | string[] }>;
}) {
  const params = await searchParams;
  const busca = Array.isArray(params.busca) ? params.busca[0] : params.busca;
  const session = await validateClienteAppSession();

  return (
    <ClientAppFrame title="Explorar" subtitle="Encontre salões e serviços perto de você.">
      <section>
        <ClientSalonDiscovery initialSearch={busca || ""} isLoggedIn={Boolean(session.context)} />
      </section>
    </ClientAppFrame>
  );
}
