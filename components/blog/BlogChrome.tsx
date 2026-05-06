import Link from "next/link";
import { ArrowUpRight, BookOpen, Sparkles } from "lucide-react";
import { DOMINIO_RAIZ } from "@/lib/proxy/domain-config";

export function BlogHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-[#fbfaf6]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-zinc-950 text-white shadow-sm">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="text-[1.2rem] font-black tracking-tight text-zinc-950">
              Blog SalaoPremium
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Conteúdo para gestão de salões
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`https://${DOMINIO_RAIZ}`}
            className="hidden rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-800 shadow-sm transition hover:border-zinc-950 sm:inline-flex"
          >
            Site principal
          </Link>
          <Link
            href={`https://${DOMINIO_RAIZ}/cadastro-salao`}
            className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-zinc-800"
          >
            Conhecer sistema
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BlogFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-[#11100d] text-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
        <div>
          <div className="flex items-center gap-2 text-lg font-black">
            <Sparkles size={18} className="text-amber-200" />
            Blog SalaoPremium
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Artigos sobre agenda online, vendas, automação, redes sociais,
            fidelização e gestão para salões, barbearias, clínicas e studios.
          </p>
        </div>
        <Link
          href={`https://${DOMINIO_RAIZ}`}
          className="inline-flex justify-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-black text-zinc-100 transition hover:bg-white/10"
        >
          Voltar ao SalaoPremium
        </Link>
      </div>
    </footer>
  );
}

