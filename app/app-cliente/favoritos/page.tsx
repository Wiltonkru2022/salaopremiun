import Link from "next/link";
import { ArrowLeft, Heart } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientAppSalonCard from "@/components/client-app/ClientAppSalonCard";
import PaginationLinks from "@/components/ui/PaginationLinks";
import { listClienteAppFavoriteSaloes } from "@/lib/client-app/queries";
import { requireClienteAppContext } from "@/lib/client-context.server";

export const metadata = {
  title: "Favoritos | Salão Premium",
};

const FAVORITOS_PAGE_SIZE = 10;

export default async function ClienteFavoritesPage({
  searchParams,
}: {
  searchParams?: Promise<{ pagina?: string }>;
}) {
  const session = await requireClienteAppContext();
  const params = searchParams ? await searchParams : {};
  const paginaAtual = Math.max(0, Number(params?.pagina || 1) - 1);
  const saloesResult = await listClienteAppFavoriteSaloes({
    idConta: session.idConta,
    limit: FAVORITOS_PAGE_SIZE + 1,
    page: paginaAtual,
  });
  const hasMore = saloesResult.length > FAVORITOS_PAGE_SIZE;
  const saloes = saloesResult.slice(0, FAVORITOS_PAGE_SIZE);

  return (
    <ClientAppFrame title="Favoritos" subtitle="Salões que você salvou.">
      <section className="mx-auto max-w-4xl px-4 py-4 md:px-6">
        <Link
          href="/app-cliente/perfil"
          className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-950 shadow-sm"
          aria-label="Voltar"
        >
          <ArrowLeft size={24} />
        </Link>

        <h1 className="text-3xl font-black tracking-[-0.04em] text-zinc-950">
          Salões favoritos
        </h1>
        <p className="mt-2 text-base leading-7 text-zinc-500">
          Salve os salões que você mais gosta e volte para agendar rápido.
        </p>

        {saloes.length ? (
          <div className="mt-7 grid gap-7 md:grid-cols-2">
            {saloes.map((salao) => (
              <ClientAppSalonCard key={salao.id} salao={salao} />
            ))}
          </div>
        ) : (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-zinc-200 bg-zinc-50 text-zinc-300">
              <Heart size={54} />
            </div>
            <h2 className="text-2xl font-black text-zinc-800">
              Nenhum favorito ainda
            </h2>
            <p className="mt-3 max-w-md text-base leading-7 text-zinc-500">
              Abra a página de um salão e toque no coração para salvar.
            </p>
            <Link
              href="/app-cliente/inicio"
              className="mt-8 inline-flex h-14 items-center justify-center rounded-2xl bg-zinc-950 px-8 text-base font-black text-white"
            >
              Explorar salões
            </Link>
          </div>
        )}

        <PaginationLinks
          currentPage={paginaAtual}
          pageSize={FAVORITOS_PAGE_SIZE}
          hasMore={hasMore}
          getHref={(page) => `/app-cliente/favoritos?pagina=${page + 1}`}
          className="mt-8"
        />
      </section>
    </ClientAppFrame>
  );
}
