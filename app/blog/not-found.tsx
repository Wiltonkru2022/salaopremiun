import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Home, SearchX } from "lucide-react";
import { BlogFooter, BlogHeader } from "@/components/blog/BlogChrome";
import { DOMINIO_RAIZ } from "@/lib/proxy/domain-config";

export const metadata: Metadata = {
  title: "Página não encontrada | Blog SalãoPremium",
  description:
    "A página do blog que você tentou acessar não foi encontrada. Volte ao blog SalãoPremium para continuar lendo.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function BlogNotFound() {
  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <BlogHeader />

      <main className="mx-auto flex min-h-[calc(100vh-190px)] max-w-5xl items-center px-6 py-14 lg:px-10">
        <section className="w-full overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex min-h-[300px] items-center justify-center bg-zinc-950 p-8 text-white">
              <div className="text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/15 bg-white/10">
                  <SearchX size={42} />
                </div>
                <div className="mt-6 text-6xl font-black tracking-[-0.08em]">
                  404
                </div>
                <p className="mt-2 text-sm font-bold uppercase tracking-[0.24em] text-zinc-400">
                  Página não encontrada
                </p>
              </div>
            </div>

            <div className="p-7 sm:p-10">
              <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-zinc-500">
                Blog SalãoPremium
              </div>
              <h1 className="mt-5 font-display text-4xl font-black leading-tight tracking-[-0.05em] text-zinc-950 sm:text-5xl">
                Esse artigo não está mais disponível.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
                O link pode ter mudado, o conteúdo pode ter sido removido ou o
                endereço foi digitado com algum detalhe diferente. Você pode
                voltar para o blog e continuar navegando pelos artigos.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
                >
                  <ArrowLeft size={17} />
                  Voltar para o blog
                </Link>
                <Link
                  href={`https://${DOMINIO_RAIZ}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-800 transition hover:border-zinc-950"
                >
                  <Home size={17} />
                  Ir para o site
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <BlogFooter />
    </div>
  );
}
