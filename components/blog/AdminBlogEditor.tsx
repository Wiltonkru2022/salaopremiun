"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  Bold,
  Eye,
  Heading1,
  ImagePlus,
  Link2,
  MousePointerClick,
  Save,
  Send,
  Type,
} from "lucide-react";
import type { BlogCategory, BlogPost } from "@/lib/blog/content";
import { createBlogPost } from "@/app/(admin-master)/admin-master/blog/actions";

type Props = {
  post: BlogPost | null;
  categories: BlogCategory[];
};

const fontOptions = [
  "Inter, Arial, sans-serif",
  "Georgia, serif",
  "Arial, sans-serif",
  "Verdana, sans-serif",
  "Trebuchet MS, sans-serif",
];

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function estimateReadTime(value: string) {
  const words = stripHtml(value).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 180))} min`;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export default function AdminBlogEditor({ post, categories }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const contentInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [description, setDescription] = useState(post?.description || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [categoryId, setCategoryId] = useState(post?.categoryId || categories[0]?.id || "");
  const [coverImage, setCoverImage] = useState(post?.coverImage || "");
  const [coverAlt, setCoverAlt] = useState(post?.coverAlt || "");
  const [tags, setTags] = useState((post?.tags || []).join(", "));
  const [featured, setFeatured] = useState(Boolean(post?.featured));
  const [content, setContent] = useState(
    post?.bodyHtml || post?.rawContent || "<p>Comece seu artigo aqui.</p>"
  );
  const readTime = useMemo(() => estimateReadTime(content), [content]);
  const previewKey = "salaopremium-blog-preview";
  const previewHref = `/admin-master/blog/${slug || "novo"}/preview`;

  function syncContent() {
    const nextContent = editorRef.current?.innerHTML || "";
    setContent(nextContent);
    if (contentInputRef.current) contentInputRef.current.value = nextContent;
  }

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncContent();
  }

  function applyBlock(tag: "h1" | "h2" | "h3" | "p") {
    exec("formatBlock", tag);
  }

  function applyFontSize(size: string) {
    editorRef.current?.focus();
    document.execCommand("fontSize", false, "7");
    editorRef.current
      ?.querySelectorAll("font[size='7']")
      .forEach((node) => {
        const span = document.createElement("span");
        span.style.fontSize = size;
        span.innerHTML = node.innerHTML;
        node.replaceWith(span);
      });
    syncContent();
  }

  function insertLink() {
    const url = window.prompt("Cole o link completo:");
    if (!url) return;
    exec("createLink", url);
  }

  function insertButton() {
    const label = window.prompt("Texto do botão:", "Conhecer o SalaoPremium");
    if (!label) return;
    const url = window.prompt("Link do botão:", "https://salaopremiun.com.br/cadastro-salao");
    if (!url) return;
    exec(
      "insertHTML",
      `<p><a href="${url}" style="display:inline-block;border-radius:999px;background:#111827;color:#fff;padding:12px 20px;font-weight:800;text-decoration:none">${label}</a></p>`
    );
  }

  function readFileAsDataUrl(file: File, callback: (value: string) => void) {
    const reader = new FileReader();
    reader.onload = () => callback(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function handleCoverFile(file?: File) {
    if (!file) return;
    readFileAsDataUrl(file, (value) => {
      setCoverImage(value);
      if (!coverAlt) setCoverAlt(file.name.replace(/\.[^.]+$/, ""));
    });
  }

  function handleInlineImage(file?: File) {
    if (!file) return;
    readFileAsDataUrl(file, (value) => {
      exec(
        "insertHTML",
        `<figure><img src="${value}" alt="${file.name}" style="width:100%;border-radius:18px;margin:16px 0" /><figcaption>${file.name}</figcaption></figure>`
      );
    });
  }

  function handlePreview() {
    const payload = {
      title,
      slug,
      description,
      excerpt,
      categoryName:
        categories.find((category) => category.id === categoryId)?.name || "Blog",
      categoryId,
      coverImage,
      coverAlt,
      tags,
      content: editorRef.current?.innerHTML || content,
      readTime,
      featured,
    };
    window.localStorage.setItem(previewKey, JSON.stringify(payload));
    window.open(`${previewHref}?local=1`, "_blank", "noopener,noreferrer");
  }

  function ensureSlug(nextTitle: string) {
    setTitle(nextTitle);
    if (!post?.slug && !slug) setSlug(slugify(nextTitle));
  }

  return (
    <form action={createBlogPost} className="min-h-screen bg-[#f6f4ee] text-zinc-950">
      <input type="hidden" name="id" value={post?.id || ""} />
      <input ref={contentInputRef} type="hidden" name="conteudo" defaultValue={content} />
      <input type="hidden" name="imagem_capa_url" value={coverImage} />
      <input type="hidden" name="imagem_capa_alt" value={coverAlt} />
      <input type="hidden" name="tempo_leitura" value={readTime} />
      {featured ? <input type="hidden" name="destaque" value="on" /> : null}

      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/admin-master/blog"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-black text-zinc-700 transition hover:border-zinc-950"
          >
            Voltar
          </Link>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePreview}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-800 shadow-sm hover:border-zinc-950"
            >
              <Eye size={16} />
              Preview
            </button>
            <button
              type="submit"
              name="status"
              value="rascunho"
              onClick={syncContent}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-800 shadow-sm hover:border-zinc-950"
            >
              <Save size={16} />
              Rascunho
            </button>
            <button
              type="submit"
              name="status"
              value="publicado"
              onClick={syncContent}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-zinc-800"
            >
              <Send size={16} />
              Publicar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 xl:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-[22px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
              Configurações
            </div>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm font-bold">
                Categoria
                <select
                  name="categoria_id"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-zinc-950"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-bold">
                Slug
                <input
                  name="slug"
                  value={slug}
                  onChange={(event) => setSlug(slugify(event.target.value))}
                  className="rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-950"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold">
                Tags
                <input
                  name="tags"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  className="rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-950"
                />
              </label>
              <label className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(event) => setFeatured(event.target.checked)}
                />
                Post em destaque
              </label>
            </div>
          </section>

          <section className="rounded-[22px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
              Foto de capa
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleCoverFile(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black hover:border-zinc-950"
            >
              <ImagePlus size={17} />
              Carregar do PC
            </button>
            {coverImage ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200">
                {coverImage.startsWith("data:") ? (
                  <img src={coverImage} alt={coverAlt} className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <Image
                    src={coverImage}
                    alt={coverAlt}
                    width={420}
                    height={320}
                    className="aspect-[4/3] w-full object-cover"
                  />
                )}
              </div>
            ) : null}
            <input
              value={coverAlt}
              onChange={(event) => setCoverAlt(event.target.value)}
              placeholder="Texto alternativo da imagem"
              className="mt-3 w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-950"
            />
          </section>
        </aside>

        <section className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 bg-zinc-50 p-3">
            <input
              name="titulo"
              value={title}
              onChange={(event) => ensureSlug(event.target.value)}
              required
              placeholder="Título do post"
              className="w-full bg-transparent font-display text-3xl font-black outline-none sm:text-5xl"
            />
            <textarea
              name="descricao"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              rows={2}
              placeholder="Descrição para Google"
              className="mt-3 w-full resize-none bg-transparent text-base leading-7 text-zinc-600 outline-none"
            />
            <textarea
              name="resumo"
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              rows={2}
              placeholder="Chamada curta do card"
              className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-zinc-950"
            />
          </div>

          <div className="sticky top-[73px] z-30 flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white/95 p-3 backdrop-blur-xl">
            <button type="button" onClick={() => applyBlock("h1")} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Título grande">
              <Heading1 size={18} />
            </button>
            <button type="button" onClick={() => exec("bold")} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Negrito">
              <Bold size={18} />
            </button>
            <button type="button" onClick={insertLink} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Adicionar link">
              <Link2 size={18} />
            </button>
            <button type="button" onClick={insertButton} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Adicionar botão">
              <MousePointerClick size={18} />
            </button>
            <button type="button" onClick={() => inlineImageInputRef.current?.click()} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Adicionar foto no post">
              <ImagePlus size={18} />
            </button>
            <select
              onChange={(event) => exec("fontName", event.target.value)}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-bold"
              defaultValue=""
              title="Selecionar fonte"
            >
              <option value="" disabled>Fonte</option>
              {fontOptions.map((font) => (
                <option key={font} value={font}>{font.split(",")[0]}</option>
              ))}
            </select>
            <select
              onChange={(event) => applyFontSize(event.target.value)}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-bold"
              defaultValue=""
              title="Tamanho da fonte"
            >
              <option value="" disabled>Tamanho</option>
              <option value="16px">Normal</option>
              <option value="20px">Grande</option>
              <option value="28px">Destaque</option>
              <option value="38px">Título</option>
            </select>
            <button type="button" onClick={() => applyBlock("p")} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Parágrafo">
              <Type size={18} />
            </button>
            <input
              ref={inlineImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleInlineImage(event.target.files?.[0])}
            />
          </div>

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncContent}
            className="blog-editor-prose min-h-[640px] px-5 py-6 text-[18px] leading-8 outline-none sm:px-8"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </section>
      </main>
    </form>
  );
}
