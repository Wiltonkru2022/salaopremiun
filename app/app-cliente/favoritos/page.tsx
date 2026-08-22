import Link from "next/link";
import { Heart, Search } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientAppSalonCard from "@/components/client-app/ClientAppSalonCard";
import PaginationLinks from "@/components/ui/PaginationLinks";
import { listClienteAppFavoriteSaloes } from "@/lib/client-app/queries";
import { requireClienteAppContext } from "@/lib/client-context.server";

export const metadata = { title: "Favoritos" };
const FAVORITOS_PAGE_SIZE = 10;

export default async function ClienteFavoritesPage({ searchParams }: { searchParams?: Promise<{ pagina?: string }> }) {
  const session = await requireClienteAppContext();
  const params = searchParams ? await searchParams : {};
  const paginaAtual = Math.max(0, Number(params?.pagina || 1) - 1);
  const saloesResult = await listClienteAppFavoriteSaloes({ idConta: session.idConta, limit: FAVORITOS_PAGE_SIZE + 1, page: paginaAtual });
  const hasMore = saloesResult.length > FAVORITOS_PAGE_SIZE;
  const saloes = saloesResult.slice(0, FAVORITOS_PAGE_SIZE);

  return (
    <ClientAppFrame title="Favoritos" subtitle="Salões que você salvou.">
      <section className="min-h-dvh bg-[#050505] px-5 pb-28 pt-5 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="flex justify-end">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-[#f5b83d]">{saloes.length} salvo{saloes.length === 1 ? "" : "s"}</span>
          </div>
          <div className="mt-4"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#f5b83d]">Sua lista</div><h1 className="mt-1 text-[2.35rem] font-black tracking-[-0.055em]">Favoritos</h1><p className="mt-2 max-w-lg text-base leading-7 text-zinc-400">Os salões que você gostou ficam aqui para reservar de novo sem procurar.</p></div>

          {saloes.length ? (
            <div className="mt-7 grid gap-5 md:grid-cols-2">{saloes.map((salao) => <ClientAppSalonCard key={salao.id} salao={salao} />)}</div>
          ) : (
            <div className="mt-12 rounded-[1.5rem] border border-white/8 bg-[#121315] p-7 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#2a2416] text-[#f5b83d]"><Heart size={36} /></div>
              <h2 className="mt-5 text-2xl font-black">Nenhum favorito ainda</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">Abra um salão e toque no coração. Depois ele fica disponível aqui para acesso rápido.</p>
              <Link href="/app-cliente/explorar" className="mt-6 inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#f5b83d] px-6 font-black text-black"><Search size={19} /> Explorar salões</Link>
            </div>
          )}
          <PaginationLinks currentPage={paginaAtual} pageSize={FAVORITOS_PAGE_SIZE} hasMore={hasMore} getHref={(page) => `/app-cliente/favoritos?pagina=${page + 1}`} className="mt-8" />
        </div>
      </section>
    </ClientAppFrame>
  );
}
