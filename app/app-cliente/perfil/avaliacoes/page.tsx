import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import { listClienteAppWrittenReviews } from "@/lib/client-app/queries";
import { requireClienteAppContext } from "@/lib/client-context.server";

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function RatingStars({ nota }: { nota: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={16}
          fill={index < Math.round(nota) ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

export default async function ClienteProfileReviewsPage() {
  const session = await requireClienteAppContext();
  const reviews = await listClienteAppWrittenReviews({
    idConta: session.idConta,
  });

  return (
    <ClientAppFrame title="Avaliacoes" subtitle="Avaliacoes escritas por voce.">
      <section className="mx-auto max-w-3xl px-4 py-4 md:px-6">
        <Link
          href="/app-cliente/perfil"
          className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-950 shadow-sm"
          aria-label="Voltar"
        >
          <ArrowLeft size={24} />
        </Link>

        <h1 className="text-3xl font-black tracking-[-0.04em] text-zinc-950">
          Avaliacoes escritas por voce
        </h1>
        <p className="mt-2 text-base leading-7 text-zinc-500">
          Historico real dos atendimentos que voce ja avaliou.
        </p>

        {reviews.length ? (
          <div className="mt-7 space-y-4">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-[1.4rem] border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-black text-zinc-950">
                      {review.salaoNome}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      {review.servicoNome} com {review.profissionalNome}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <RatingStars nota={review.nota} />
                  </div>
                </div>

                {review.comentario ? (
                  <p className="mt-4 text-base leading-7 text-zinc-700">
                    {review.comentario}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-zinc-400">
                    Avaliacao sem comentario.
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-zinc-200 bg-zinc-50 text-zinc-300">
              <Star size={54} />
            </div>
            <h2 className="text-2xl font-black text-zinc-800">
              Nenhuma avaliacao ainda
            </h2>
            <p className="mt-3 max-w-md text-base leading-7 text-zinc-500">
              Depois de um atendimento finalizado, voce pode avaliar e acompanhar tudo por aqui.
            </p>
            <Link
              href="/app-cliente/inicio"
              className="mt-8 inline-flex h-14 items-center justify-center rounded-2xl bg-zinc-950 px-8 text-base font-black text-white"
            >
              Agende ja
            </Link>
          </div>
        )}
      </section>
    </ClientAppFrame>
  );
}
