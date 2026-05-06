"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Layers3, ListChecks, Search } from "lucide-react";
import BlogCoverMedia from "@/components/blog/BlogCoverMedia";
import type { BlogCategory, BlogPost } from "@/lib/blog/content";

type ReadingList = {
  title: string;
  body: string;
  href: string;
};

type Props = {
  posts: BlogPost[];
  categories: BlogCategory[];
  readingLists: ReadingList[];
  featuredId?: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function BlogSearchExperience({
  posts,
  categories,
  readingLists,
  featuredId,
}: Props) {
  const [query, setQuery] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const normalizedQuery = normalize(query.trim());

  const filteredPosts = useMemo(() => {
    const basePosts = query || categorySlug
      ? posts
      : posts.filter((post) => post.id !== featuredId);

    return basePosts.filter((post) => {
      const matchesCategory = categorySlug
        ? post.categorySlug === categorySlug
        : true;
      const searchable = normalize(
        [
          post.title,
          post.description,
          post.excerpt,
          post.categoryName,
          post.tags.join(" "),
        ].join(" ")
      );
      const matchesQuery = normalizedQuery
        ? searchable.includes(normalizedQuery)
        : true;

      return matchesCategory && matchesQuery;
    });
  }, [categorySlug, featuredId, normalizedQuery, posts, query]);

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10 lg:py-10">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={21} className="text-zinc-500" />
            <h2 className="font-display text-3xl font-black">
              {query || categorySlug ? "Resultado da pesquisa" : "Artigos recentes"}
            </h2>
          </div>
          <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 shadow-sm focus-within:border-zinc-950 sm:w-[320px]">
            <Search size={17} className="shrink-0 text-zinc-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar no blog"
              className="w-full bg-transparent outline-none"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategorySlug("")}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              categorySlug
                ? "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-950"
                : "bg-zinc-950 text-white"
            }`}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategorySlug(category.slug)}
              className={`rounded-full px-4 py-2 text-sm font-black transition ${
                categorySlug === category.slug
                  ? "bg-zinc-950 text-white"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-950"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {filteredPosts.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredPosts.map((post) => (
              <Link
                key={post.id}
                href={`/${post.slug}`}
                className="group overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <BlogCoverMedia src={post.coverImage} alt={post.coverAlt} />
                <div className="p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400">
                    {post.categoryName} - {post.readTime}
                  </div>
                  <h3 className="mt-2 font-display text-xl font-black leading-tight">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {post.excerpt}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-black text-zinc-950">
                    Abrir post <ArrowRight size={16} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-6 text-sm font-bold leading-6 text-zinc-600">
            Nenhum artigo encontrado para essa pesquisa.
          </div>
        )}
      </div>

      <aside className="space-y-5">
        <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Layers3 size={19} className="text-zinc-500" />
            <h2 className="font-display text-2xl font-black">Categorias</h2>
          </div>
          <div className="mt-4 space-y-2.5">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategorySlug(category.slug)}
                className="block w-full rounded-2xl border border-zinc-200 p-3 text-left transition hover:border-zinc-950"
              >
                <div className="font-black">{category.name}</div>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  {category.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <ListChecks size={19} className="text-zinc-500" />
            <h2 className="font-display text-2xl font-black">Listas de leitura</h2>
          </div>
          <div className="mt-4 space-y-2.5">
            {readingLists.map((list) => (
              <Link
                key={list.href}
                href={list.href}
                className="block rounded-2xl bg-zinc-950 p-3 text-white transition hover:bg-zinc-800"
              >
                <div className="font-black">{list.title}</div>
                <p className="mt-1 text-sm leading-6 text-zinc-300">{list.body}</p>
              </Link>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}
