import Link from "next/link";
import { BookOpen, Eye, FolderPlus, Plus, SquarePen } from "lucide-react";
import BlogCoverMedia from "@/components/blog/BlogCoverMedia";
import type { BlogCategory, BlogPost } from "@/lib/blog/content";
import { createBlogCategory } from "@/app/(admin-master)/admin-master/blog/actions";
import { getAdminBlogData } from "@/lib/blog/service";

export const dynamic = "force-dynamic";

export default async function AdminMasterBlogPage() {
  const { posts, categories, usingFallback } = await getAdminBlogData();
  const postsList = posts as BlogPost[];
  const categoriesList = categories as BlogCategory[];
  const publicados = postsList.filter((post) => post.status === "publicado").length;
  const rascunhos = postsList.filter((post) => post.status === "rascunho").length;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[30px] border border-zinc-200 bg-white p-5 text-zinc-950 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
              <BookOpen size={15} />
              Blog e SEO
            </div>
            <h2 className="mt-4 max-w-4xl font-display text-[2.2rem] font-black leading-tight sm:text-[3.2rem]">
              Posts do blog
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
              Controle editorial do blog publico: escreva, revise, publique e
              acompanhe os posts que trazem trafego organico para o SalaoPremium.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-black text-white">
                {publicados} publicados
              </span>
              <span className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-700">
                {rascunhos} rascunhos
              </span>
              <span className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-700">
                {postsList.length} posts no total
              </span>
            </div>
          </div>

          <a
            href="https://blog.salaopremiun.com.br"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-800 transition hover:border-zinc-950"
          >
            <Eye size={17} />
            Ver blog
          </a>
          <Link
            href="/admin-master/blog/novo"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
          >
            <Plus size={17} />
            Criar post
          </Link>
        </div>

        {usingFallback ? (
          <p className="mt-5 rounded-2xl border border-amber-200/30 bg-amber-100/10 p-3 text-sm leading-6 text-amber-50">
            Exibindo conteúdo inicial. Após aplicar a migration do blog, os
            posts criados no editor passam a vir do banco.
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <FolderPlus size={19} className="text-zinc-500" />
            <h3 className="font-display text-2xl font-black">Categorias</h3>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {categoriesList.map((category) => (
              <span
                key={category.id}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-bold text-zinc-700"
              >
                {category.name}
              </span>
            ))}
          </div>
        </div>

        <form
          action={createBlogCategory}
          className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
            Nova categoria
          </div>
          <div className="mt-4 grid gap-3">
            <input
              name="nome"
              required
              placeholder="Nome da categoria"
              className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-bold outline-none focus:border-zinc-950"
            />
            <input
              name="slug"
              placeholder="Slug opcional"
              className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
            />
            <textarea
              name="descricao"
              rows={2}
              placeholder="Descrição curta"
              className="resize-none rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
            />
            <input
              name="ordem"
              type="number"
              min={1}
              placeholder="Ordem"
              className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
            >
              <FolderPlus size={17} />
              Criar categoria
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {postsList.map((post) => (
          <Link
            key={post.id}
            href={`/admin-master/blog/${post.slug}`}
            className="group overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-950 hover:shadow-lg"
          >
            <div className="relative">
              <BlogCoverMedia src={post.coverImage} alt={post.coverAlt} />
              <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-zinc-950 shadow-sm">
                <SquarePen size={14} />
                Editar
              </div>
            </div>
            <div className="p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400">
                {post.status || "publicado"} - {post.categoryName}
              </div>
              <h3 className="mt-2 font-display text-xl font-black leading-tight">
                {post.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-600">
                {post.excerpt}
              </p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
