import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";

import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import ClientSalonSectionTabs from "@/components/client-app/ClientSalonSectionTabs";
import PaginationLinks from "@/components/ui/PaginationLinks";
import {
  getClientAppSalonDetail,
  listClienteAppSalonReviews,
} from "@/lib/client-app/queries";

export const metadata = {
  title: "Avaliações",
};

const REVIEWS_PAGE_SIZE = 10;

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

function RatingStars({ nota }: { nota: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={17}
          fill={index < Math.round(nota) ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

export default async function ClienteSalonReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ pagina?: string }>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const paginaAtual = Math.max(0, Number(query?.pagina || 1) - 1);

  try {
    const salao = await getClientAppSalonDetail(id);
    const reviewsResult = await listClienteAppSalonReviews({
      idSalao: salao.id,
      page: paginaAtual,
      limit: REVIEWS_PAGE_SIZE,
    });
    const reviews = reviewsResult.items;
    const summaryReviews = salao.avaliacoes;
    const totalReviews = reviewsResult.total || summaryReviews.length;
    const notaMedia = summaryReviews.length
      ? summaryReviews.reduce((sum, item) => sum + item.nota, 0) /
        summaryReviews.length
      : 0;

    return (
      <ClientAppFrame title={salao.nome} subtitle="Avaliações reais">
        <ClientSalonSectionTabs salonId={id} active="avaliacoes" />
        <section className="mx-auto max-w-4xl px-4 py-5 md:px-6">
          <Link
            href={`/app-cliente/salao/${id}`}
            className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-950 shadow-sm"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </Link>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="grid gap-6 md:grid-cols-[240px_1fr]">
              <div className="text-center">
                <div className="text-6xl font-light text-zinc-700">
                  {notaMedia ? notaMedia.toFixed(1) : "0,0"}
                  <span className="text-2xl">/5</span>
                </div>
                <div className="mt-3">
                  <RatingStars nota={notaMedia} />
                </div>
                <div className="mt-2 text-zinc-500">
                  {totalReviews} avaliações
                </div>
              </div>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((nota) => {
                  const count = summaryReviews.filter(
                    (avaliacao) => Math.round(avaliacao.nota) === nota
                  ).length;
                  const percent = summaryReviews.length
                    ? (count / summaryReviews.length) * 100
                    : 0;
                  return (
                    <div
                      key={nota}
                      className="grid grid-cols-[20px_1fr_30px] items-center gap-3 text-sm text-zinc-500"
                    >
                      <span>{nota}</span>
                      <div className="h-2 rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-7 space-y-5">
            <h1 className="text-3xl font-black tracking-[-0.04em] text-zinc-950">
              Avaliações ({totalReviews})
            </h1>
            {reviews.length ? (
              reviews.map((avaliacao) => (
                <article
                  key={avaliacao.id}
                  className="border-b border-zinc-200 bg-white pb-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-bold text-zinc-950">
                        {avaliacao.clienteNome}
                      </div>
                      <div className="mt-1">
                        <RatingStars nota={avaliacao.nota} />
                      </div>
                      <div className="mt-1 text-sm text-zinc-400">
                        {formatDate(avaliacao.createdAt)}
                      </div>
                    </div>
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800">
                      Cliente confirmado
                    </span>
                  </div>
                  {avaliacao.comentario ? (
                    <p className="mt-3 text-lg leading-7 text-zinc-700">
                      {avaliacao.comentario}
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="rounded-2xl bg-white p-8 text-center text-zinc-500 shadow-sm">
                Este salão ainda não recebeu avaliações pelo app.
              </div>
            )}
          </div>

          <PaginationLinks
            currentPage={paginaAtual}
            pageSize={REVIEWS_PAGE_SIZE}
            totalItems={reviewsResult.total}
            getHref={(page) =>
              `/app-cliente/salao/${id}/avaliacoes?pagina=${page + 1}`
            }
            className="mt-8"
          />
        </section>
      </ClientAppFrame>
    );
  } catch {
    notFound();
  }
}
