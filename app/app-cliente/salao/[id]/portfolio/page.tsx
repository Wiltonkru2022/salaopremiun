import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ImageIcon } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientSalonSectionTabs from "@/components/client-app/ClientSalonSectionTabs";
import { getClientAppSalonDetail } from "@/lib/client-app/queries";

export const metadata = {
  title: "Portfolio | SalaoPremium",
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
      <ClientAppFrame title={salao.nome} subtitle="Portfolio do salao">
        <ClientSalonSectionTabs salonId={id} active="portfolio" />
        <section className="mx-auto max-w-6xl px-4 py-5 md:px-6">
          <Link
            href={`/app-cliente/salao/${id}`}
            className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-950 shadow-sm"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </Link>

          <h1 className="text-3xl font-black tracking-[-0.04em] text-zinc-950">
            Portfolio
          </h1>
          <p className="mt-2 text-base leading-7 text-zinc-500">
            Fotos reais publicadas pelo salao para voce conhecer o trabalho.
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
                    alt={foto.legenda || `Foto do portfolio de ${salao.nome}`}
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
                Volte em breve para ver imagens dos trabalhos do salao.
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
