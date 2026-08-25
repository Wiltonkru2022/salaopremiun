import Link from "next/link";
import { Heart, Search } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientAppSalonCard from "@/components/client-app/ClientAppSalonCard";
import PaginationLinks from "@/components/ui/PaginationLinks";
import { listClienteAppFavoriteSaloes } from "@/lib/client-app/queries";
import { requireClienteAppContext } from "@/lib/client-context.server";

export const metadata = { title: "Favoritos" };
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
      <section className="min-h-dvh bg-white px-4 pb-28 pt-4 text-zinc-950 sm:px-5">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-5">
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#9b6a14]">
                Sua lista
              </div>
              <h1 className="mt-1 text-[2rem] font-black leading-none tracking-[-0.05em] sm:text-[2.35rem]">
                Favoritos
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-500 sm:text-base sm:leading-7">
                Seus salões preferidos ficam aqui para você voltar e reservar sem precisar procurar novamente.
              </p>
            </div>

            <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-[#8a5a1f]">
              {saloes.length} salvo{saloes.length === 1 ? "" : "s"}
            </span>
          </div>

          {saloes.length ? (
            <div className="mt-6 grid gap-4 sm:gap-5 md:grid-cols-2">
              {saloes.map((salao) => (
                <ClientAppSalonCard key={salao.id} salao={salao} variant="light" />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-7 text-center sm:mt-10 sm:p-9">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-[#9b6a14] ring-1 ring-amber-100">
                <Heart size={30} />
              </div>
              <h2 className="mt-5 text-xl font-black tracking-[-0.03em] text-zinc-950 sm:text-2xl">
                Nenhum favorito ainda
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Abra um salão e toque no coração. Depois ele aparecerá aqui para acesso rápido.
              </p>
              <Link
                href="/app-cliente/explorar"
                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-6 text-sm font-black text-white transition active:scale-[0.98]"
              >
                <Search size={19} /> Explorar salões
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
        </div>
      </section>
    </ClientAppFrame>
  );
}
