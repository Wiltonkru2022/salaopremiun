"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  MousePointerClick,
  Quote,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Type,
  Underline,
  Video,
} from "lucide-react";
import type { BlogCategory, BlogPost } from "@/lib/blog/content";
import { createBlogPost } from "@/app/(admin-master)/admin-master/blog/actions";

type Props = {
  post: BlogPost | null;
  categories: BlogCategory[];
};

type EditorModal =
  | { type: "link"; label: string; url: string }
  | { type: "button"; label: string; url: string }
  | null;

const fontOptions = [
  "Inter, Arial, sans-serif",
  "Manrope, Arial, sans-serif",
  "Playfair Display, Georgia, serif",
  "Georgia, serif",
  "Arial, sans-serif",
  "Verdana, sans-serif",
  "Trebuchet MS, sans-serif",
  "Courier New, monospace",
];

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function estimateReadTime(value: string) {
  const words = stripHtml(value).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 180))} min`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
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
  const readTimeInputRef = useRef<HTMLInputElement>(null);
  const contentValueRef = useRef(
    post?.bodyHtml || post?.rawContent || "<p>Comece seu artigo aqui.</p>"
  );
  const editorInitializedRef = useRef(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const replaceInlineImageInputRef = useRef<HTMLInputElement>(null);
  const inlineVideoInputRef = useRef<HTMLInputElement>(null);
  const replaceInlineVideoInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const selectedInlineImageRef = useRef<HTMLImageElement | null>(null);
  const selectedInlineVideoRef = useRef<HTMLVideoElement | null>(null);
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [description, setDescription] = useState(post?.description || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [categoryId, setCategoryId] = useState(post?.categoryId || categories[0]?.id || "");
  const [coverImage, setCoverImage] = useState(post?.coverImage || "");
  const [coverAlt, setCoverAlt] = useState(post?.coverAlt || "");
  const [tags, setTags] = useState((post?.tags || []).join(", "));
  const [featured, setFeatured] = useState(Boolean(post?.featured));
  const [fontSize, setFontSize] = useState(18);
  const [modal, setModal] = useState<EditorModal>(null);
  const [selectedInlineImageName, setSelectedInlineImageName] = useState("");
  const [selectedInlineVideoName, setSelectedInlineVideoName] = useState("");
  const [readTime, setReadTime] = useState(() =>
    estimateReadTime(contentValueRef.current)
  );
  const previewKey = "salaopremium-blog-preview";
  const previewHref = `/admin-master/blog/${slug || "novo"}/preview`;

  function updateReadTime(value: string, updateVisibleValue = false) {
    const nextReadTime = estimateReadTime(value);
    if (readTimeInputRef.current) readTimeInputRef.current.value = nextReadTime;
    if (updateVisibleValue) setReadTime(nextReadTime);
    return nextReadTime;
  }

  useEffect(() => {
    if (editorInitializedRef.current || !editorRef.current) return;
    editorRef.current.innerHTML = contentValueRef.current;
    if (contentInputRef.current) {
      contentInputRef.current.value = contentValueRef.current;
    }
    updateReadTime(contentValueRef.current, true);
    editorInitializedRef.current = true;
  }, []);

  function syncContent(updateVisibleReadTime = false) {
    const nextContent = editorRef.current?.innerHTML || "";
    contentValueRef.current = nextContent;
    if (contentInputRef.current) contentInputRef.current.value = nextContent;
    updateReadTime(nextContent, updateVisibleReadTime);
    return nextContent;
  }

  function saveSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
  }

  function restoreSelection() {
    const range = savedRangeRef.current;
    if (!range) return false;
    const selection = window.getSelection();
    if (!selection) return false;
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  function insertHtmlAtSelection(html: string) {
    editorRef.current?.focus();
    restoreSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      exec("insertHTML", html);
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    const template = document.createElement("template");
    template.innerHTML = html;
    const fragment = template.content;
    const lastNode = fragment.lastChild;
    range.insertNode(fragment);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    syncContent();
    saveSelection();
  }

  function wrapSelection(
    tag: "span" | "a",
    styles: Partial<CSSStyleDeclaration>,
    attrs: Record<string, string> = {}
  ) {
    editorRef.current?.focus();
    if (!restoreSelection()) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    const element = document.createElement(tag);
    Object.assign(element.style, styles);
    Object.entries(attrs).forEach(([key, value]) =>
      element.setAttribute(key, value)
    );
    if (range.collapsed) {
      element.textContent = "Texto";
    } else {
      element.appendChild(range.extractContents());
    }
    range.insertNode(element);
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(element);
    selection.addRange(newRange);
    savedRangeRef.current = newRange.cloneRange();
    syncContent();
  }

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    syncContent();
    saveSelection();
  }

  function applyBlock(tag: "h1" | "h2" | "h3" | "p" | "blockquote") {
    exec("formatBlock", tag);
  }

  function applyFontSize(size: string) {
    wrapSelection("span", { fontSize: size });
  }

  function applyFontFamily(fontFamily: string) {
    wrapSelection("span", { fontFamily });
  }

  function insertLink() {
    saveSelection();
    setModal({ type: "link", label: "", url: "" });
  }

  function insertButton() {
    saveSelection();
    setModal({
      type: "button",
      label: "Conhecer o SalaoPremium",
      url: "https://salaopremiun.com.br/cadastro-salao",
    });
  }

  function confirmModal() {
    if (!modal) return;
    const url = modal.url.trim();
    const label = modal.label.trim();
    if (!url) return;

    if (modal.type === "link") {
      if (label) {
        insertHtmlAtSelection(
          `<a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
        );
      } else {
        wrapSelection("a", {}, { href: url, target: "_blank", rel: "noreferrer" });
      }
    } else {
      insertHtmlAtSelection(
        `<p><a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer" class="blog-post-button">${escapeHtml(label || "Abrir link")}</a></p>`
      );
    }

    setModal(null);
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
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  function removeCoverImage() {
    setCoverImage("");
    setCoverAlt("");
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  function handleInlineImage(file?: File) {
    if (!file) return;
    readFileAsDataUrl(file, (value) => {
      insertHtmlAtSelection(
        `<figure><img src="${value}" alt="${escapeAttribute(file.name)}" style="width:100%;border-radius:18px;margin:16px 0" /><figcaption>${escapeHtml(file.name)}</figcaption></figure>`
      );
    });
    if (inlineImageInputRef.current) inlineImageInputRef.current.value = "";
  }

  function handleEditorClick(event: React.MouseEvent<HTMLDivElement>) {
    const video = (event.target as HTMLElement).closest("video");
    if (video && editorRef.current?.contains(video)) {
      selectedInlineImageRef.current = null;
      setSelectedInlineImageName("");
      selectedInlineVideoRef.current = video as HTMLVideoElement;
      setSelectedInlineVideoName(
        video.dataset.name || video.getAttribute("src") || "Vídeo do post"
      );
      return;
    }

    const image = (event.target as HTMLElement).closest("img");
    if (!image || !editorRef.current?.contains(image)) {
      selectedInlineImageRef.current = null;
      setSelectedInlineImageName("");
      selectedInlineVideoRef.current = null;
      setSelectedInlineVideoName("");
      saveSelection();
      return;
    }

    selectedInlineVideoRef.current = null;
    setSelectedInlineVideoName("");
    selectedInlineImageRef.current = image as HTMLImageElement;
    setSelectedInlineImageName(
      image.getAttribute("alt") || image.getAttribute("src") || "Imagem do post"
    );
  }

  function removeSelectedInlineImage() {
    const image = selectedInlineImageRef.current;
    if (!image) return;
    const container = image.closest("figure") || image;
    container.remove();
    selectedInlineImageRef.current = null;
    setSelectedInlineImageName("");
    syncContent(true);
  }

  function replaceSelectedInlineImage(file?: File) {
    const image = selectedInlineImageRef.current;
    if (!file || !image) return;
    readFileAsDataUrl(file, (value) => {
      image.setAttribute("src", value);
      image.setAttribute("alt", file.name);
      const figure = image.closest("figure");
      const caption = figure?.querySelector("figcaption");
      if (caption) caption.textContent = file.name;
      setSelectedInlineImageName(file.name);
      syncContent(true);
    });
    if (replaceInlineImageInputRef.current) {
      replaceInlineImageInputRef.current.value = "";
    }
  }

  function handleInlineVideo(file?: File) {
    if (!file) return;
    readFileAsDataUrl(file, (value) => {
      insertHtmlAtSelection(
        `<figure><video src="${value}" data-name="${escapeAttribute(file.name)}" controls playsinline style="width:100%;border-radius:18px;margin:16px 0;background:#111"></video><figcaption>${escapeHtml(file.name)}</figcaption></figure>`
      );
    });
    if (inlineVideoInputRef.current) inlineVideoInputRef.current.value = "";
  }

  function removeSelectedInlineVideo() {
    const video = selectedInlineVideoRef.current;
    if (!video) return;
    const container = video.closest("figure") || video;
    container.remove();
    selectedInlineVideoRef.current = null;
    setSelectedInlineVideoName("");
    syncContent(true);
  }

  function replaceSelectedInlineVideo(file?: File) {
    const video = selectedInlineVideoRef.current;
    if (!file || !video) return;
    readFileAsDataUrl(file, (value) => {
      video.setAttribute("src", value);
      video.dataset.name = file.name;
      const figure = video.closest("figure");
      const caption = figure?.querySelector("figcaption");
      if (caption) caption.textContent = file.name;
      setSelectedInlineVideoName(file.name);
      syncContent(true);
    });
    if (replaceInlineVideoInputRef.current) {
      replaceInlineVideoInputRef.current.value = "";
    }
  }

  function handlePreview() {
    const nextContent = syncContent(true);
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
      content: nextContent,
      readTime: estimateReadTime(nextContent),
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
      <input
        ref={contentInputRef}
        type="hidden"
        name="conteudo"
        defaultValue={contentValueRef.current}
      />
      <input type="hidden" name="imagem_capa_url" value={coverImage} />
      <input type="hidden" name="imagem_capa_alt" value={coverAlt} />
      <input
        ref={readTimeInputRef}
        type="hidden"
        name="tempo_leitura"
        defaultValue={readTime}
      />
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
              onClick={() => syncContent(true)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-800 shadow-sm hover:border-zinc-950"
            >
              <Save size={16} />
              Rascunho
            </button>
            <button
              type="submit"
              name="status"
              value="publicado"
              onClick={() => syncContent(true)}
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
              {coverImage ? "Trocar foto" : "Carregar do PC"}
            </button>
            {coverImage ? (
              <div className="mt-3">
                <div className="overflow-hidden rounded-2xl border border-zinc-200">
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
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-3 py-2 text-xs font-black text-zinc-800 hover:border-zinc-950"
                  >
                    <RefreshCw size={15} />
                    Trocar
                  </button>
                  <button
                    type="button"
                    onClick={removeCoverImage}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 px-3 py-2 text-xs font-black text-red-700 hover:border-red-500"
                  >
                    <Trash2 size={15} />
                    Remover
                  </button>
                </div>
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

          <div
            className="sticky top-[73px] z-30 flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white/95 p-3 backdrop-blur-xl"
            onMouseDown={(event) => {
              if ((event.target as HTMLElement).closest("button")) {
                event.preventDefault();
              }
            }}
          >
            <button type="button" onClick={() => applyBlock("h1")} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Título grande">
              <Heading1 size={18} />
            </button>
            <button type="button" onClick={() => applyBlock("h2")} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Subtítulo">
              <Heading2 size={18} />
            </button>
            <button type="button" onClick={() => applyBlock("h3")} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Chamada">
              <Heading3 size={18} />
            </button>
            <button type="button" onClick={() => exec("bold")} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Negrito">
              <Bold size={18} />
            </button>
            <button type="button" onClick={() => exec("italic")} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Itálico">
              <Italic size={18} />
            </button>
            <button type="button" onClick={() => exec("underline")} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Sublinhado">
              <Underline size={18} />
            </button>
            <button type="button" onClick={() => exec("insertUnorderedList")} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Lista">
              <List size={18} />
            </button>
            <button type="button" onClick={() => exec("insertOrderedList")} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Lista numerada">
              <ListOrdered size={18} />
            </button>
            <button type="button" onClick={() => applyBlock("blockquote")} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Citação">
              <Quote size={18} />
            </button>
            <button type="button" onClick={() => exec("justifyLeft")} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Alinhar esquerda">
              <AlignLeft size={18} />
            </button>
            <button type="button" onClick={() => exec("justifyCenter")} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Centralizar">
              <AlignCenter size={18} />
            </button>
            <button type="button" onClick={() => exec("justifyRight")} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Alinhar direita">
              <AlignRight size={18} />
            </button>
            <button type="button" onClick={insertLink} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Adicionar link">
              <Link2 size={18} />
            </button>
            <button type="button" onClick={insertButton} className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950" title="Adicionar botão">
              <MousePointerClick size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                saveSelection();
                inlineImageInputRef.current?.click();
              }}
              className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950"
              title="Adicionar foto no post"
            >
              <ImagePlus size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                saveSelection();
                inlineVideoInputRef.current?.click();
              }}
              className="rounded-xl border border-zinc-200 p-2 hover:border-zinc-950"
              title="Adicionar vídeo no post"
            >
              <Video size={18} />
            </button>
            <select
              onChange={(event) => applyFontFamily(event.target.value)}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-bold"
              defaultValue=""
              title="Selecionar fonte"
            >
              <option value="" disabled>Fonte</option>
              {fontOptions.map((font) => (
                <option key={font} value={font}>{font.split(",")[0]}</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-700">
              Fonte
              <input
                type="number"
                min={10}
                max={80}
                value={fontSize}
                onChange={(event) => {
                  const nextSize = Number(event.target.value || 18);
                  setFontSize(nextSize);
                  applyFontSize(`${nextSize}px`);
                }}
                className="w-16 bg-transparent text-right font-black outline-none"
              />
              px
            </label>
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
            <input
              ref={replaceInlineImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) =>
                replaceSelectedInlineImage(event.target.files?.[0])
              }
            />
            <input
              ref={inlineVideoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => handleInlineVideo(event.target.files?.[0])}
            />
            <input
              ref={replaceInlineVideoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) =>
                replaceSelectedInlineVideo(event.target.files?.[0])
              }
            />
          </div>

          {selectedInlineImageName ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-[#fff8e6] px-4 py-2 text-sm font-bold text-zinc-800">
              <span className="truncate">
                Imagem selecionada: {selectedInlineImageName}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => replaceInlineImageInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-black hover:border-zinc-950"
                >
                  <RefreshCw size={14} />
                  Trocar imagem
                </button>
                <button
                  type="button"
                  onClick={removeSelectedInlineImage}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-black text-red-700 hover:border-red-500"
                >
                  <Trash2 size={14} />
                  Remover imagem
                </button>
              </div>
            </div>
          ) : null}

          {selectedInlineVideoName ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-[#eef7ff] px-4 py-2 text-sm font-bold text-zinc-800">
              <span className="truncate">
                Vídeo selecionado: {selectedInlineVideoName}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => replaceInlineVideoInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-black hover:border-zinc-950"
                >
                  <RefreshCw size={14} />
                  Trocar vídeo
                </button>
                <button
                  type="button"
                  onClick={removeSelectedInlineVideo}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-black text-red-700 hover:border-red-500"
                >
                  <Trash2 size={14} />
                  Remover vídeo
                </button>
              </div>
            </div>
          ) : null}

          <div
            ref={editorRef}
            contentEditable
            dir="ltr"
            suppressContentEditableWarning
            onInput={() => syncContent()}
            onClick={handleEditorClick}
            onMouseUp={saveSelection}
            onKeyUp={saveSelection}
            onBlur={() => {
              saveSelection();
              syncContent(true);
            }}
            className="blog-editor-prose min-h-[640px] px-5 py-6 text-left text-[18px] leading-8 outline-none sm:px-8"
          />
        </section>
      </main>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[24px] border border-zinc-200 bg-white p-5 shadow-2xl">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">
              {modal.type === "link" ? "Adicionar link" : "Adicionar botão"}
            </div>
            <h2 className="mt-2 font-display text-2xl font-black text-zinc-950">
              {modal.type === "link"
                ? "Configure o link do texto selecionado"
                : "Configure o botão do post"}
            </h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm font-bold text-zinc-700">
                Texto
                <input
                  value={modal.label}
                  onChange={(event) =>
                    setModal({ ...modal, label: event.target.value })
                  }
                  placeholder={
                    modal.type === "link"
                      ? "Opcional se já houver texto selecionado"
                      : "Texto do botão"
                  }
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-zinc-700">
                Link
                <input
                  value={modal.url}
                  onChange={(event) =>
                    setModal({ ...modal, url: event.target.value })
                  }
                  placeholder="https://..."
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-black text-zinc-700 transition hover:border-zinc-950"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal}
                className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-black text-white transition hover:bg-zinc-800"
              >
                Inserir
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
