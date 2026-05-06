import Image from "next/image";
import Link from "next/link";
import { BookOpen, Plus, SquarePen } from "lucide-react";
import type { BlogPost } from "@/lib/blog/content";
import { getAdminBlogData } from "@/lib/blog/service";

export const dynamic = "force-dynamic";

export default async function AdminMasterBlogPage() {
  const { posts, usingFallback } = await getAdminBlogData();

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[30px] bg-zinc-950 p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.28em] text-amber-100">
              <BookOpen size={15} />
              Blog e SEO
            </div>
            <h2 className="mt-4 max-w-4xl font-display text-[2.2rem] font-black leading-tight sm:text-[3.2rem]">
              Posts do blog
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
              Lista limpa de artigos. Clique em um post para abrir o editor
              completo em uma tela sem sidebar do AdminMaster.
            </p>
          </div>

          <Link
            href="/admin-master/blog/novo"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-zinc-950 transition hover:bg-amber-100"
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post: BlogPost) => (
          <Link
            key={post.id}
            href={`/admin-master/blog/${post.slug}`}
            className="group overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-950 hover:shadow-lg"
          >
            <div className="relative">
              {post.coverImage.startsWith("data:") ? (
                <img
                  src={post.coverImage}
                  alt={post.coverAlt}
                  className="aspect-[16/9] w-full object-cover"
                />
              ) : (
                <Image
                  src={post.coverImage}
                  alt={post.coverAlt}
                  width={720}
                  height={420}
                  className="aspect-[16/9] w-full object-cover"
                />
              )}
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
