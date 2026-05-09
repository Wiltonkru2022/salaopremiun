import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import ClientAppFrame from "@/components/client-app/ClientAppFrame";
import { requireClienteAppContext } from "@/lib/client-context.server";

export default async function ClienteProfileReviewsPage() {
  await requireClienteAppContext();

  return (
    <ClientAppFrame
      title="Avaliacoes"
      subtitle="Avaliacoes escritas por voce."
    >
      <section className="mx-auto flex min-h-[62vh] max-w-3xl flex-col px-4 py-4 md:px-6">
        <Link
          href="/app-cliente/perfil"
          className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-950 shadow-sm"
          aria-label="Voltar"
        >
          <ArrowLeft size={24} />
        </Link>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-zinc-200 bg-zinc-50 text-zinc-300">
            <Star size={54} />
          </div>
          <h1 className="text-3xl font-black tracking-[-0.04em] text-zinc-800">
            Avaliacoes escritas por voce
          </h1>
          <p className="mt-4 max-w-md text-lg leading-8 text-zinc-500">
            Os comentarios podem ser adicionados depois que seu atendimento for
            finalizado.
          </p>
        </div>

        <Link
          href="/app-cliente/inicio"
          className="mt-8 inline-flex h-14 items-center justify-center rounded-2xl bg-teal-600 px-6 text-base font-black text-white"
        >
          Agende ja
        </Link>
      </section>
    </ClientAppFrame>
  );
}
