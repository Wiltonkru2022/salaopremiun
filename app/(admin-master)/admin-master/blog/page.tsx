import Image from "next/image";
import Link from "next/link";
import { BookOpen, ImageIcon, Layers3, PenLine, Plus } from "lucide-react";
import { createBlogCategory, createBlogPost } from "@/app/(admin-master)/admin-master/blog/actions";
import type { BlogPost } from "@/lib/blog/content";
import { getAdminBlogData } from "@/lib/blog/service";

export const dynamic = "force-dynamic";

const imageOptions = [
  "/marketing-kit/site-hero.png",
  "/marketing-kit/instagram-feed.png",
  "/marketing-kit/facebook-link.png",
  "/marketing-kit/stories.png",
];

export default async function AdminMasterBlogPage() {
  const { categories, posts, usingFallback } = await getAdminBlogData();

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[30px] bg-zinc-950 p-5 text-white shadow-sm sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.28em] text-amber-100">
              <BookOpen size={15} />
              Blog e SEO
            </div>
            <h2 className="mt-4 max-w-4xl font-display text-[2.2rem] font-black leading-tight sm:text-[3.2rem]">
              Editor de conteudo para o blog do SalaoPremium.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
              Crie posts com titulo, descricao para Google, foto de capa,
              categoria, tags e texto longo. O blog publico usa esses conteudos
              quando as tabelas existirem no Supabase.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-amber-100">
              Status
            </div>
            <div className="mt-3 grid gap-2">
              <div className="rounded-2xl bg-white px-4 py-3 text-zinc-950">
                <div className="text-2xl font-black">{posts.length}</div>
                <div className="text-sm font-semibold text-zinc-500">posts prontos</div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-zinc-950">
                <div className="text-2xl font-black">{categories.length}</div>
                <div className="text-sm font-semibold text-zinc-500">categorias</div>
              </div>
            </div>
            {usingFallback ? (
              <p className="mt-3 rounded-2xl border border-amber-200/30 bg-amber-100/10 p-3 text-sm leading-6 text-amber-50">
                Exibindo conteudo inicial. Apos aplicar a migration do blog, os
                posts criados aqui passam a vir do banco.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_420px]">
        <form
          action={createBlogPost}
          className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex items-center gap-2">
            <PenLine size={18} className="text-zinc-500" />
            <h3 className="font-display text-2xl font-black">Novo post</h3>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                Titulo
              </span>
              <input
                name="titulo"
                required
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-zinc-950"
                placeholder="Ex: Como fidelizar clientes no salao"
              />
            </label>

            <div className="grid gap-3 lg:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                  Slug
                </span>
                <input
                  name="slug"
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                  placeholder="gerado pelo titulo se ficar vazio"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                  Categoria
                </span>
                <select
                  name="categoria_id"
                  required
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-zinc-950"
                >
                  <option value="">Selecione</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                Descricao para Google
              </span>
              <textarea
                name="descricao"
                required
                rows={2}
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm leading-6 outline-none focus:border-zinc-950"
                placeholder="Resumo objetivo que aparece nos buscadores."
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                Chamada do card
              </span>
              <textarea
                name="resumo"
                rows={2}
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm leading-6 outline-none focus:border-zinc-950"
                placeholder="Texto curto para a pagina de artigos recentes."
              />
            </label>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px]">
              <label className="grid gap-1.5">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                  Foto de capa
                </span>
                <select
                  name="imagem_capa_url"
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                  defaultValue="/marketing-kit/site-hero.png"
                >
                  {imageOptions.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                  Leitura
                </span>
                <input
                  name="tempo_leitura"
                  defaultValue="5 min"
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>
            </div>

            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                Texto alternativo da imagem
              </span>
              <input
                name="imagem_capa_alt"
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                placeholder="Descreva a imagem para acessibilidade."
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                Tags
              </span>
              <input
                name="tags"
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                placeholder="agenda online, sistema para salao, vendas"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                Editor do post
              </span>
              <textarea
                name="conteudo"
                required
                rows={15}
                className="min-h-[360px] rounded-2xl border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none focus:border-zinc-950"
                placeholder={"Escreva como em um documento. Use uma linha em branco para separar paragrafos.\n\nInclua ideias, exemplos, listas e chamadas para o SalaoPremium."}
              />
            </label>

            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
              <select
                name="status"
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-zinc-950"
                defaultValue="publicado"
              >
                <option value="publicado">Publicar agora</option>
                <option value="rascunho">Salvar rascunho</option>
              </select>
              <label className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-bold">
                <input name="destaque" type="checkbox" className="h-4 w-4" />
                Destaque
              </label>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white hover:bg-zinc-800"
              >
                <Plus size={17} />
                Salvar post
              </button>
            </div>
          </div>
        </form>

        <aside className="space-y-4">
          <form
            action={createBlogCategory}
            className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Layers3 size={18} className="text-zinc-500" />
              <h3 className="font-display text-xl font-black">Criar categoria</h3>
            </div>
            <div className="mt-4 grid gap-3">
              <input
                name="nome"
                required
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-zinc-950"
                placeholder="Nome da categoria"
              />
              <input
                name="slug"
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                placeholder="slug opcional"
              />
              <textarea
                name="descricao"
                rows={3}
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm leading-6 outline-none focus:border-zinc-950"
                placeholder="Descricao curta"
              />
              <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white hover:bg-zinc-800">
                <Plus size={17} />
                Salvar categoria
              </button>
            </div>
          </form>

          <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ImageIcon size={18} className="text-zinc-500" />
              <h3 className="font-display text-xl font-black">Fotos disponiveis</h3>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {imageOptions.map((src) => (
                <div key={src} className="overflow-hidden rounded-2xl border border-zinc-200">
                  <Image
                    src={src}
                    alt=""
                    width={280}
                    height={160}
                    className="aspect-[7/4] w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="font-display text-xl font-black">Posts recentes</h3>
            <div className="mt-4 space-y-3">
              {posts.slice(0, 8).map((post: BlogPost) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="block rounded-2xl border border-zinc-200 p-3 transition hover:border-zinc-950"
                >
                  <div className="text-sm font-black text-zinc-950">{post.title}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                    {post.categoryName} - {post.readTime}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
