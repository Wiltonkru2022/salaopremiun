import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ImageIcon } from "lucide-react";
import ClientAppDrawerNav from "@/components/client-app/ClientAppDrawerNav";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientSalonSectionTabs from "@/components/client-app/ClientSalonSectionTabs";
import { getClientAppSalonDetail } from "@/lib/client-app/queries";

export const metadata = {
  title: "Portfólio",
};

export default async function ClienteSalonPortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const salao = await getClientAppSalonDetail(id);

    return (
      <ClientAppFrame title={salao.nome} subtitle="Portfólio do salão">
        <header className="sp-mobile-fixed sticky top-0 z-50 border-b border-zinc-100 bg-white/96 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:px-6">
            <Link
              href={`/app-cliente/salao/${id}`}
              className="flex h-12 w-12 shrink-0 items-center justify-center -ml-2 rounded-full text-zinc-950"
              aria-label="Voltar"
            >
              <ArrowLeft size={32} />
            </Link>
            <h1 className="min-w-0 flex-1 truncate text-[1.85rem] font-black leading-none tracking-[-0.05em] text-zinc-950">
              Portfólio
            </h1>
            <ClientAppDrawerNav />
          </div>
        </header>

        <ClientSalonSectionTabs salonId={id} active="portfolio" stickyBelowHeader />

        <section className="mx-auto max-w-6xl px-4 py-5 md:px-6">
          <p className="text-base leading-7 text-zinc-500">
            Fotos reais publicadas pelo salão para você conhecer o trabalho.
          </p>

          {salao.portfolio.length ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {salao.portfolio.map((foto, index) => (
                <figure
                  key={foto.id}
                  className={`group overflow-hidden rounded-[1.75rem] bg-zinc-100 ${
                    index === 0 ? "sm:col-span-2 sm:row-span-2" : ""
                  }`}
                >
                  <img
                    src={foto.imagemUrl}
                    alt={foto.legenda || `Foto do portfólio de ${salao.nome}`}
                    className={`w-full object-cover transition duration-500 group-hover:scale-105 ${
                      index === 0 ? "h-[420px]" : "h-64"
                    }`}
                  />
                  {foto.legenda ? (
                    <figcaption className="border-x border-b border-zinc-100 bg-white px-4 py-3 text-sm font-semibold text-zinc-600">
                      {foto.legenda}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          ) : (
            <div className="mt-20 flex flex-col items-center text-center text-zinc-500">
              <div className="mb-5 flex h-28 w-36 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-300">
                <ImageIcon size={52} />
              </div>
              <div className="text-2xl text-zinc-950">Nenhuma foto ainda</div>
              <p className="mt-2 text-lg">
                Este salão ainda está sem portfólio publicado.
              </p>
            </div>
          )}
        </section>
      </ClientAppFrame>
    );
  } catch {
    notFound();
  }
}
