"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";

type PreviewData = {
  title: string;
  slug?: string;
  description: string;
  excerpt: string;
  categoryName: string;
  categoryId?: string;
  coverImage: string;
  coverAlt: string;
  tags: string;
  content: string;
  readTime: string;
  featured?: boolean;
};

type Props = {
  fallback: PreviewData;
  editHref: string;
};

export default function AdminBlogPreview({ fallback, editHref }: Props) {
  const [data, setData] = useState<PreviewData>(fallback);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("salaopremium-blog-preview");
    if (!stored) return;

    try {
      setData(JSON.parse(stored) as PreviewData);
    } catch {
      setData(fallback);
    }
  }, [fallback]);

  return (
    <div className="min-h-screen bg-[#f7f3eb] text-zinc-950">
      <div className="fixed inset-x-0 top-0 z-50 border-b border-white/20 bg-zinc-950/30 px-4 py-2 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link
            href={editHref}
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black transition hover:bg-white/25"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
          <button
            type="button"
            disabled={publishing}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-zinc-950"
            onClick={async () => {
              setPublishing(true);
              try {
                const response = await fetch("/api/admin-master/blog/publicar-preview", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
                if (!response.ok) throw new Error("Falha ao publicar.");
                const result = (await response.json()) as { slug?: string };
                window.location.href = result.slug
                  ? `/admin-master/blog/${result.slug}`
                  : editHref;
              } catch (error) {
                window.alert(error instanceof Error ? error.message : "Falha ao publicar.");
              } finally {
                setPublishing(false);
              }
            }}
          >
            <Send size={16} />
            {publishing ? "Publicando" : "Publicar"}
          </button>
        </div>
      </div>

      <article>
        <header className="bg-[#17120d] px-5 pb-10 pt-20 text-white">
          <div className="mx-auto grid max-w-6xl gap-7 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <div className="inline-flex rounded-full border border-amber-200/25 bg-amber-100/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.25em] text-amber-100">
                {data.categoryName}
              </div>
              <h1 className="mt-5 font-display text-[2.6rem] font-black leading-[1.04] sm:text-[4.4rem]">
                {data.title || "Título do post"}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">
                {data.description || data.excerpt}
              </p>
              <div className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-zinc-400">
                {data.readTime}
              </div>
            </div>
            {data.coverImage ? (
              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white shadow-2xl">
                <img
                  src={data.coverImage}
                  alt={data.coverAlt}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            ) : null}
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-5 py-10">
          <p className="text-xl font-semibold leading-8 text-zinc-800">
            {data.excerpt}
          </p>
          <div
            className="blog-editor-prose mt-8 text-[18px] leading-8 text-zinc-700"
            dangerouslySetInnerHTML={{ __html: data.content }}
          />
        </main>
      </article>
    </div>
  );
}
