import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Star } from "lucide-react";

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
    <span className="inline-flex items-center gap-1 text-[#f4b43f]">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={20}
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
        <section className="min-h-dvh bg-white pb-32 text-zinc-950">
          <div className="mx-auto max-w-3xl px-5 pt-[calc(env(safe-area-inset-top)+1.1rem)]">
            <header className="mb-6 flex items-center gap-4">
              <Link
                href={`/app-cliente/salao/${id}`}
                className="-ml-2 flex h-12 w-12 items-center justify-center"
                aria-label="Voltar"
              >
                <ArrowLeft size={34} />
              </Link>
              <div className="min-w-0">
                <h1 className="text-[2rem] font-black leading-none tracking-[-0.05em]">
                  Avaliações
                </h1>
                <p className="mt-2 truncate text-base text-zinc-500">
                  Opiniões de clientes do {salao.nome}.
                </p>
              </div>
            </header>
          </div>

          <ClientSalonSectionTabs salonId={id} active="avaliacoes" />

          <div className="mx-auto max-w-3xl px-5 py-6">
            <div className="rounded-[1.5rem] border border-zinc-100 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <div className="text-center">
                <div className="text-[4.5rem] font-light leading-none text-zinc-800">
                  {notaMedia ? notaMedia.toFixed(1).replace(".", ",") : "0,0"}
                  <span className="text-2xl">/5</span>
                </div>
                <div className="mt-3">
                  <RatingStars nota={notaMedia} />
                </div>
                <div className="mt-2 text-lg text-zinc-500">
                  {totalReviews} avaliações
                </div>
              </div>

              <div className="mt-7 space-y-4">
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
                      className="grid grid-cols-[24px_1fr_28px] items-center gap-3 text-base text-zinc-500"
                    >
                      <span>{nota}</span>
                      <div className="h-2 rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-[#f4b43f]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <h2 className="text-[2rem] font-black tracking-[-0.05em]">
                Comentários
              </h2>
              {reviews.length ? (
                reviews.map((avaliacao) => (
                  <article
                    key={avaliacao.id}
                    className="rounded-[1.4rem] border border-zinc-100 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-black">
                          {avaliacao.clienteNome}
                        </div>
                        <div className="mt-2">
                          <RatingStars nota={avaliacao.nota} />
                        </div>
                        <div className="mt-1 text-sm text-zinc-400">
                          {formatDate(avaliacao.createdAt)}
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        Confirmado
                      </span>
                    </div>
                    {avaliacao.comentario ? (
                      <p className="mt-4 text-lg leading-7 text-zinc-700">
                        {avaliacao.comentario}
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-zinc-100 bg-zinc-50 p-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-zinc-400">
                    <MessageCircle size={32} />
                  </div>
                  <h3 className="mt-5 text-2xl font-black">
                    Nenhuma avaliação ainda
                  </h3>
                  <p className="mt-2 text-lg leading-7 text-zinc-500">
                    Assim que clientes avaliarem o atendimento, os comentários
                    aparecem aqui.
                  </p>
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
          </div>
        </section>
      </ClientAppFrame>
    );
  } catch {
    notFound();
  }
}
