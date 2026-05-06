import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, PenLine, Save } from "lucide-react";
import { createBlogPost } from "@/app/(admin-master)/admin-master/blog/actions";
import { DOMINIO_BLOG } from "@/lib/proxy/domain-config";
import { getAdminBlogPostById, getBlogCategories } from "@/lib/blog/service";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

const imageOptions = [
  "/marketing-kit/site-hero.png",
  "/marketing-kit/instagram-feed.png",
  "/marketing-kit/facebook-link.png",
  "/marketing-kit/stories.png",
];

export default async function AdminMasterBlogEditPage({ params }: Props) {
  const { id } = await params;
  const [post, categories] = await Promise.all([
    getAdminBlogPostById(id),
    getBlogCategories(),
  ]);

  if (!post) notFound();

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] bg-zinc-950 p-5 text-white shadow-sm sm:p-6">
        <Link
          href="/admin-master/blog"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:bg-white/10"
        >
          <ArrowLeft size={16} />
          Voltar para posts
        </Link>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.28em] text-amber-100">
              <PenLine size={15} />
              Editando post
            </div>
            <h2 className="mt-4 max-w-4xl font-display text-[2.2rem] font-black leading-tight sm:text-[3rem]">
              {post.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
              Ajuste título, SEO, foto, categoria e texto do artigo. Ao salvar
              como publicado, ele aparece no domínio do blog.
            </p>
          </div>

          <Link
            href={`https://${DOMINIO_BLOG}/${post.slug}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-zinc-950 transition hover:bg-amber-100"
          >
            Ver no blog
            <ExternalLink size={16} />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form
          action={createBlogPost}
          className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <input type="hidden" name="id" value={post.id} />

          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                Título
              </span>
              <input
                name="titulo"
                required
                defaultValue={post.title}
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-zinc-950"
              />
            </label>

            <div className="grid gap-3 lg:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                  Slug
                </span>
                <input
                  name="slug"
                  required
                  defaultValue={post.slug}
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                  Categoria
                </span>
                <select
                  name="categoria_id"
                  required
                  defaultValue={post.categoryId || ""}
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
                Descrição para Google
              </span>
              <textarea
                name="descricao"
                required
                rows={2}
                defaultValue={post.description}
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm leading-6 outline-none focus:border-zinc-950"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                Chamada do card
              </span>
              <textarea
                name="resumo"
                rows={2}
                defaultValue={post.excerpt}
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm leading-6 outline-none focus:border-zinc-950"
              />
            </label>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px]">
              <label className="grid gap-1.5">
                <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                  Foto de capa
                </span>
                <select
                  name="imagem_capa_url"
                  defaultValue={post.coverImage}
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
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
                  defaultValue={post.readTime}
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
                defaultValue={post.coverAlt}
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                Tags
              </span>
              <input
                name="tags"
                defaultValue={post.tags.join(", ")}
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                Editor do post
              </span>
              <textarea
                name="conteudo"
                required
                rows={18}
                defaultValue={post.rawContent || post.body.join("\n\n")}
                className="min-h-[480px] rounded-2xl border border-zinc-200 px-4 py-3 text-sm leading-7 outline-none focus:border-zinc-950"
              />
            </label>

            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
              <select
                name="status"
                defaultValue={post.status || "rascunho"}
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-zinc-950"
              >
                <option value="publicado">Publicado</option>
                <option value="rascunho">Rascunho</option>
                <option value="arquivado">Arquivado</option>
              </select>
              <label className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-bold">
                <input
                  name="destaque"
                  type="checkbox"
                  defaultChecked={Boolean(post.featured)}
                  className="h-4 w-4"
                />
                Destaque
              </label>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white hover:bg-zinc-800"
              >
                <Save size={17} />
                Salvar edição
              </button>
            </div>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-sm">
            <Image
              src={post.coverImage}
              alt={post.coverAlt}
              width={520}
              height={340}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="p-4">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
                Prévia
              </div>
              <h3 className="mt-2 font-display text-xl font-black">{post.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{post.excerpt}</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

