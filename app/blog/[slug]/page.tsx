import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Tag } from "lucide-react";
import { BlogFooter, BlogHeader } from "@/components/blog/BlogChrome";
import { DOMINIO_BLOG, DOMINIO_RAIZ } from "@/lib/proxy/domain-config";
import { getBlogPost, getPublishedBlogPosts } from "@/lib/blog/service";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: "Artigo não encontrado",
    };
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `https://${DOMINIO_BLOG}/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      images: [post.coverImage],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [post, allPosts] = await Promise.all([
    getBlogPost(slug),
    getPublishedBlogPosts(),
  ]);

  if (!post) notFound();

  const related = allPosts
    .filter((item) => item.slug !== post.slug)
    .filter((item) => item.categorySlug === post.categorySlug)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <BlogHeader />

      <main>
        <article>
          <header className="border-b border-zinc-200 bg-white text-zinc-950">
            <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-end lg:px-10 lg:py-12">
              <div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
                >
                  <ArrowLeft size={16} />
                  Voltar ao blog
                </Link>
                <div className="mt-6 inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                  {post.categoryName}
                </div>
                <h1 className="mt-5 max-w-4xl font-display text-[2.4rem] font-black leading-[1.05] sm:text-[4.2rem]">
                  {post.title}
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-600">
                  {post.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-zinc-600">
                  <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5">
                    <CalendarDays size={15} />
                    {new Date(post.publishedAt).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5">
                    <Clock size={15} />
                    {post.readTime}
                  </span>
                </div>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-sm">
                {post.coverImage.startsWith("data:") ? (
                  <img
                    src={post.coverImage}
                    alt={post.coverAlt}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <Image
                    src={post.coverImage}
                    alt={post.coverAlt}
                    width={900}
                    height={620}
                    priority
                    className="aspect-[4/3] w-full object-cover"
                  />
                )}
              </div>
            </div>
          </header>

          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,760px)_320px] lg:px-10 lg:py-10">
            <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
              <p className="text-xl font-semibold leading-8 text-zinc-800">
                {post.excerpt}
              </p>

              <div
                className="blog-editor-prose mt-8 text-[1.03rem] leading-8 text-zinc-700"
                dangerouslySetInnerHTML={{
                  __html:
                    post.bodyHtml ||
                    post.body.map((paragraph) => `<p>${paragraph}</p>`).join(""),
                }}
              />

              <div className="mt-8 rounded-[22px] bg-zinc-950 p-5 text-white">
                <h2 className="font-display text-2xl font-black">
                  Quer organizar agenda, vendas e clientes?
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  O SalaoPremium conecta agenda online, comandas, caixa,
                  profissionais, estoque e marketing para o salão vender com
                  mais controle.
                </p>
                <Link
                  href={`https://${DOMINIO_RAIZ}/cadastro-salao`}
                  className="mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-zinc-950"
                >
                  Conhecer o sistema
                </Link>
              </div>
            </div>

            <aside className="space-y-5">
              <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.22em] text-zinc-500">
                  <Tag size={16} />
                  Tópicos
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
                <h2 className="font-display text-2xl font-black">Leia também</h2>
                <div className="mt-4 space-y-3">
                  {(related.length ? related : allPosts.filter((item) => item.slug !== post.slug).slice(0, 3)).map((item) => (
                    <Link
                      key={item.id}
                      href={`/${item.slug}`}
                      className="block rounded-2xl border border-zinc-200 p-3 transition hover:border-zinc-950"
                    >
                      <div className="text-sm font-black">{item.title}</div>
                      <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                        {item.readTime}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </article>
      </main>

      <BlogFooter />
    </div>
  );
}
