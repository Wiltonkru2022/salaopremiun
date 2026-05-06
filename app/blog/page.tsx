import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import BlogCoverMedia from "@/components/blog/BlogCoverMedia";
import BlogSearchExperience from "@/components/blog/BlogSearchExperience";
import { BlogFooter, BlogHeader } from "@/components/blog/BlogChrome";
import { DOMINIO_BLOG } from "@/lib/proxy/domain-config";
import { getBlogCategories, getPublishedBlogPosts } from "@/lib/blog/service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Artigos sobre agenda online, vendas, fidelização, redes sociais e gestão para salões com o ecossistema SalaoPremium.",
  alternates: {
    canonical: `https://${DOMINIO_BLOG}`,
  },
};

export default async function BlogPage() {
  const [posts, categories] = await Promise.all([
    getPublishedBlogPosts(),
    getBlogCategories(),
  ]);
  const featured = posts.find((post) => post.featured) || posts[0];
  const readingLists = [
    {
      title: "Comece pela agenda",
      body: "Entenda agenda online, clientes, horários e organização de equipe.",
      href: "/o-que-e-uma-agenda-online",
    },
    {
      title: "Venda com mais controle",
      body: "Veja comandas, caixa, automação e acompanhamento comercial.",
      href: "/como-posso-gerenciar-minhas-vendas-com-sistema-de-agenda",
    },
    {
      title: "Cresca nas redes",
      body: "Ideias para conteúdo, relacionamento e fidelização de clientes.",
      href: "/o-que-fazer-para-estar-a-frente-nas-redes-sociais",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <BlogHeader />

      <main>
        <section className="border-b border-zinc-200 bg-white text-zinc-950">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:px-10 lg:py-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
                <Search size={15} />
                Conteúdo para salões crescerem
              </div>
              <h1 className="mt-5 max-w-4xl font-display text-[2.8rem] font-black leading-[1.02] sm:text-[4.8rem]">
                Blog SalaoPremium
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-600">
                Artigos recentes, categorias e listas de leitura sobre agenda de
                clientes, vendas, automação, fidelização e redes sociais para o
                Google entender melhor o sistema SalaoPremium.
              </p>
            </div>

            {featured ? (
              <Link
                href={`/${featured.slug}`}
                className="group overflow-hidden rounded-[24px] border border-zinc-200 bg-white text-zinc-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <BlogCoverMedia
                  src={featured.coverImage}
                  alt={featured.coverAlt}
                  width={840}
                  height={520}
                  priority
                  className="aspect-[16/10] w-full object-cover"
                />
                <div className="p-4">
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
                    Destaque - {featured.categoryName}
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-black">
                    {featured.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {featured.excerpt}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-black">
                    Ler artigo <ArrowRight size={16} />
                  </div>
                </div>
              </Link>
            ) : null}
          </div>
        </section>

        <BlogSearchExperience
          posts={posts}
          categories={categories}
          readingLists={readingLists}
          featuredId={featured?.id}
        />
      </main>

      <BlogFooter />
    </div>
  );
}
