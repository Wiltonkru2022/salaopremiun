import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Eye,
  FolderPlus,
  MailCheck,
  Plus,
  SquarePen,
  Trophy,
} from "lucide-react";
import AdminBlogViewsChart from "@/components/blog/AdminBlogViewsChart";
import BlogCoverMedia from "@/components/blog/BlogCoverMedia";
import type { BlogCategory, BlogPost } from "@/lib/blog/content";
import { createBlogCategory } from "@/app/(admin-master)/admin-master/blog/actions";
import { getAdminBlogData } from "@/lib/blog/service";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function statusBadge(status: BlogPost["status"]) {
  if (status === "rascunho") {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }

  if (status === "arquivado") {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }

  return "bg-emerald-100 text-emerald-800 ring-emerald-200";
}

export default async function AdminMasterBlogPage() {
  const { posts, categories, metrics, usingFallback, error } =
    await getAdminBlogData();
  const postsList = posts as BlogPost[];
  const categoriesList = categories as BlogCategory[];
  const publicados = postsList.filter((post) => post.status === "publicado").length;
  const rascunhos = postsList.filter((post) => post.status === "rascunho").length;

  return (
    <div className="space-y-5 text-slate-950">
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.28em] text-slate-500">
              <BookOpen size={15} />
              Blog e SEO
            </div>
            <h2 className="mt-4 max-w-4xl font-display text-[2.2rem] font-black leading-tight text-slate-900 sm:text-[3.2rem]">
              Posts do blog
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Controle editorial com foco em publicação, tráfego orgânico,
              newsletter e leitura real do blog SalãoPremium.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">
                {publicados} publicados
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">
                {rascunhos} rascunhos
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">
                {postsList.length} posts no total
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="https://blog.salaopremiun.com.br"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 transition hover:border-slate-950"
            >
              <Eye size={17} />
              Ver blog
            </a>
            <Link
              href="/admin-master/blog/novo"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <Plus size={17} />
              Criar post
            </Link>
          </div>
        </div>

        {usingFallback ? (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-950">
            O Admin Master não conseguiu ler a nova DB do blog agora. A lista
            fica vazia para não confundir com posts reais.{" "}
            {error ? `Detalhe: ${error}` : null}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              Total de views
            </span>
            <BarChart3 size={19} className="text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-black text-slate-900">
            {formatNumber(metrics.totalViews)}
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Soma registrada em blog_posts.views.
          </p>
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              Conversao newsletter
            </span>
            <MailCheck size={19} className="text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-black text-slate-900">
            {metrics.conversionRate}%
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {formatNumber(metrics.newsletterSubscribers)} inscritos capturados.
          </p>
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              Mais lido da semana
            </span>
            <Trophy size={19} className="text-slate-400" />
          </div>
          <div className="mt-4 line-clamp-2 min-h-10 text-lg font-black leading-tight text-slate-900">
            {metrics.topPostWeek?.title || "Aguardando leituras"}
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {metrics.topPostWeek
              ? `${formatNumber(metrics.topPostWeek.views)} views nos ultimos 7 dias`
              : "O grafico atualiza quando houver trafego."}
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                Acessos
              </div>
              <h3 className="mt-1 font-display text-2xl font-black text-slate-900">
                Ultimos 7 dias
              </h3>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
              <ArrowUpRight size={14} />
              blog_views
            </div>
          </div>
          <div className="mt-4">
            <AdminBlogViewsChart data={metrics.viewsLast7Days} />
          </div>
        </div>

        <form
          action={createBlogCategory}
          className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <FolderPlus size={19} className="text-slate-500" />
            <h3 className="font-display text-2xl font-black text-slate-900">
              Categorias
            </h3>
          </div>
          <div className="mt-4 max-h-36 space-y-2 overflow-y-auto pr-1">
            {categoriesList.map((category) => (
              <span
                key={category.id}
                className="mr-2 inline-flex rounded-full border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700"
              >
                {category.name}
              </span>
            ))}
          </div>

          <div className="mt-5 grid gap-3">
            <input
              name="nome"
              required
              placeholder="Nome da categoria"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-slate-950"
            />
            <input
              name="slug"
              placeholder="Slug opcional"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950"
            />
            <textarea
              name="descricao"
              rows={2}
              placeholder="Descrição curta"
              className="resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950"
            />
            <input
              name="ordem"
              type="number"
              min={1}
              placeholder="Ordem"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <FolderPlus size={17} />
              Criar categoria
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              Biblioteca
            </div>
            <h3 className="mt-1 font-display text-2xl font-black text-slate-900">
              Posts
            </h3>
          </div>
          <Link
            href="/admin-master/blog/novo"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
          >
            <Plus size={16} />
            Novo
          </Link>
        </div>

        {postsList.length === 0 ? (
          <div className="p-8 text-center">
            <h3 className="font-display text-2xl font-black text-slate-950">
              Nenhum post carregado da nova DB
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Quando a conexao do blog estiver ativa neste ambiente, os posts
              do projeto Supabase separado aparecem aqui.
            </p>
          </div>
        ) : null}

        <div className="divide-y divide-slate-100">
          {postsList.map((post) => (
            <Link
              key={post.id}
              href={`/admin-master/blog/${post.slug}`}
              className="group grid gap-4 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_140px_120px_96px] md:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-16 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  <BlogCoverMedia
                    src={post.coverImage}
                    alt={post.coverAlt}
                    width={160}
                    height={120}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-black text-slate-900">
                    {post.title}
                  </h4>
                  <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">
                    {post.excerpt}
                  </p>
                </div>
              </div>

              <div className="text-sm font-bold text-slate-600">{post.categoryName}</div>
              <div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-black capitalize ring-1 ${statusBadge(
                    post.status
                  )}`}
                >
                  {post.status || "publicado"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm font-black text-slate-600 md:justify-end">
                <span>{formatNumber(post.views || 0)} views</span>
                <SquarePen
                  size={17}
                  className="text-slate-400 transition group-hover:text-slate-950"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
