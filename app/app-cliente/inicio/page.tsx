import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientSalonDiscovery from "@/components/client-app/ClientSalonDiscovery";
import { validateClienteAppSession } from "@/lib/client-context.server";
import { listVisibleClientAppSaloes } from "@/lib/client-app/queries";

export default async function InicioClientePage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string | string[] }>;
}) {
  const params = await searchParams;
  const busca = Array.isArray(params.busca) ? params.busca[0] : params.busca;
  const saloes = await listVisibleClientAppSaloes({
    search: busca,
    limit: 24,
  });
  const session = await validateClienteAppSession();

  return (
    <ClientAppFrame
      title="Explorar"
      subtitle="Encontre saloes e servicos perto de voce."
    >
      <section>
        {saloes.length ? (
          <ClientSalonDiscovery
            saloes={saloes}
            initialSearch={busca || ""}
            isLoggedIn={Boolean(session.context)}
          />
        ) : (
          <div className="mx-4 rounded-[1.6rem] border border-zinc-200 bg-white p-6 text-center shadow-[0_18px_48px_rgba(15,23,42,0.08)] md:mx-6">
            <h3 className="text-lg font-black text-zinc-950">
              Nenhum salao encontrado agora
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Tente buscar por outro bairro, cidade ou servico.
            </p>
          </div>
        )}
      </section>
    </ClientAppFrame>
  );
}
