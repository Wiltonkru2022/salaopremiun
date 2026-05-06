"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckCircle2,
  ChevronDown,
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
  Pilcrow,
  Quote,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Type,
  Underline,
  Video,
  WifiOff,
} from "lucide-react";
import type { BlogCategory, BlogPost } from "@/lib/blog/content";
import { createBlogPost } from "@/app/(admin-master)/admin-master/blog/actions";
import { isVideoMedia } from "@/lib/blog/media";

type Props = {
  post: BlogPost | null;
  categories: BlogCategory[];
};

type EditorModal =
  | { type: "link"; label: string; url: string }
  | { type: "button"; label: string; url: string }
  | null;

type FloatingMenu = {
  open: boolean;
  x: number;
  y: number;
  query: string;
};

type BubbleMenu = {
  open: boolean;
  x: number;
  y: number;
};

type UploadState = {
  label: string;
  progress: number;
} | null;

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

const MAX_INLINE_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_INLINE_VIDEO_BYTES = 14 * 1024 * 1024;
const MAX_FORM_CONTENT_BYTES = 22 * 1024 * 1024;
const AUTOSAVE_INTERVAL_MS = 30000;

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function estimateReadTime(value: string) {
  const words = stripHtml(value).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min`;
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

function getEditorImagesWithoutAlt(editor: HTMLDivElement | null) {
  if (!editor) return 0;
  return Array.from(editor.querySelectorAll("img")).filter(
    (image) => !image.getAttribute("alt")?.trim()
  ).length;
}

export default function AdminBlogEditor({ post, categories }: Props) {
  const [actionState, formAction, isSaving] = useActionState(createBlogPost, {});
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
  const slugTouchedRef = useRef(Boolean(post?.slug));
  const autosaveKeyRef = useRef(
    `salaopremium-blog-autosave-${post?.id || post?.slug || "novo"}`
  );
  const autosaveTimerRef = useRef<number | null>(null);
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [description, setDescription] = useState(post?.description || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [categorySlug, setCategorySlug] = useState(
    post?.categorySlug || categories[0]?.slug || ""
  );
  const [coverImage, setCoverImage] = useState(post?.coverImage || "");
  const [coverAlt, setCoverAlt] = useState(post?.coverAlt || "");
  const [tags, setTags] = useState((post?.tags || []).join(", "));
  const [featured, setFeatured] = useState(Boolean(post?.featured));
  const [fontSize, setFontSize] = useState(18);
  const [modal, setModal] = useState<EditorModal>(null);
  const [slashMenu, setSlashMenu] = useState<FloatingMenu>({
    open: false,
    x: 0,
    y: 0,
    query: "",
  });
  const [bubbleMenu, setBubbleMenu] = useState<BubbleMenu>({
    open: false,
    x: 0,
    y: 0,
  });
  const [uploadState, setUploadState] = useState<UploadState>(null);
  const [selectedInlineImageName, setSelectedInlineImageName] = useState("");
  const [selectedInlineVideoName, setSelectedInlineVideoName] = useState("");
  const [editorNotice, setEditorNotice] = useState("");
  const [autosaveStatus, setAutosaveStatus] = useState("Rascunho local pronto");
  const [readTime, setReadTime] = useState(() =>
    estimateReadTime(contentValueRef.current)
  );
  const previewKey = "salaopremium-blog-preview";
  const previewHref = `/admin-master/blog/${slug || "novo"}/preview`;
  const slashCommands = [
    { id: "h2", label: "Subtítulo H2", icon: Heading2 },
    { id: "h3", label: "Chamada H3", icon: Heading3 },
    { id: "p", label: "Parágrafo", icon: Pilcrow },
    { id: "image", label: "Imagem", icon: ImagePlus },
    { id: "video", label: "Vídeo", icon: Video },
    { id: "quote", label: "Citação", icon: Quote },
    { id: "button", label: "Botão", icon: MousePointerClick },
  ];
  const filteredSlashCommands = slashCommands.filter((command) =>
    command.label.toLowerCase().includes(slashMenu.query.toLowerCase())
  );

  function updateReadTime(value: string, updateVisibleValue = false) {
    const nextReadTime = estimateReadTime(value);
    if (readTimeInputRef.current) readTimeInputRef.current.value = nextReadTime;
    if (updateVisibleValue) setReadTime(nextReadTime);
    return nextReadTime;
  }

  const isNewPost = !post?.id;

  useEffect(() => {
    if (editorInitializedRef.current || !editorRef.current) return;
    const savedDraft = window.localStorage.getItem(autosaveKeyRef.current);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft) as {
          title?: string;
          slug?: string;
          description?: string;
          excerpt?: string;
          tags?: string;
          coverImage?: string;
          coverAlt?: string;
          content?: string;
        };
        if (isNewPost) {
          if (draft.title) setTitle(draft.title);
          if (draft.slug) setSlug(draft.slug);
          if (draft.description) setDescription(draft.description);
          if (draft.excerpt) setExcerpt(draft.excerpt);
          if (draft.tags) setTags(draft.tags);
          if (draft.coverImage) setCoverImage(draft.coverImage);
          if (draft.coverAlt) setCoverAlt(draft.coverAlt);
        }
        if (draft.content) contentValueRef.current = draft.content;
        setAutosaveStatus("Rascunho local recuperado");
      } catch {
        setAutosaveStatus("Rascunho local pronto");
      }
    }

    editorRef.current.innerHTML = contentValueRef.current;
    if (contentInputRef.current) {
      contentInputRef.current.value = contentValueRef.current;
    }
    updateReadTime(contentValueRef.current, true);
    editorInitializedRef.current = true;
  }, [isNewPost]);

  useEffect(() => {
    autosaveTimerRef.current = window.setInterval(() => {
      const nextContent = editorRef.current?.innerHTML || "";
      contentValueRef.current = nextContent;
      if (contentInputRef.current) contentInputRef.current.value = nextContent;
      updateReadTime(nextContent, true);
      window.localStorage.setItem(
        autosaveKeyRef.current,
        JSON.stringify({
          title,
          slug,
          description,
          excerpt,
          categorySlug,
          coverImage,
          coverAlt,
          tags,
          featured,
          content: nextContent,
          savedAt: new Date().toISOString(),
        })
      );
      setAutosaveStatus(
        `Rascunho local salvo ${new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      );
    }, AUTOSAVE_INTERVAL_MS);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearInterval(autosaveTimerRef.current);
      }
    };
  }, [
    categorySlug,
    coverAlt,
    coverImage,
    description,
    excerpt,
    featured,
    slug,
    tags,
    title,
  ]);

  const plainContent = stripHtml(contentValueRef.current);
  const keyword = tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)[0];
  const missingAltCount = getEditorImagesWithoutAlt(editorRef.current);
  const seoChecks = [
    {
      label: "Título",
      ok: title.trim().length >= 35 && title.trim().length <= 70,
      hint: "35 a 70 caracteres",
    },
    {
      label: "Descrição",
      ok:
        description.trim().length >= 90 &&
        description.trim().length <= 160 &&
        (!keyword ||
          description.toLowerCase().includes(keyword.toLowerCase()) ||
          title.toLowerCase().includes(keyword.toLowerCase())),
      hint: keyword ? `inclua "${keyword}"` : "90 a 160 caracteres",
    },
    {
      label: "Imagens",
      ok: missingAltCount === 0 && Boolean(coverAlt.trim()),
      hint: missingAltCount
        ? `${missingAltCount} imagem(ns) sem alt`
        : "capa e imagens com alt",
    },
    {
      label: "Conteúdo",
      ok: plainContent.split(/\s+/).filter(Boolean).length >= 300,
      hint: "300+ palavras",
    },
  ];
  const seoScore = seoChecks.filter((check) => check.ok).length;
  const seoStatus =
    seoScore >= 4
      ? { label: "SEO forte", color: "bg-emerald-500", text: "text-emerald-700" }
      : seoScore >= 2
        ? { label: "SEO médio", color: "bg-amber-500", text: "text-amber-700" }
        : { label: "SEO fraco", color: "bg-red-500", text: "text-red-700" };

  function syncContent(updateVisibleReadTime = false) {
    const nextContent = editorRef.current?.innerHTML || "";
    contentValueRef.current = nextContent;
    if (contentInputRef.current) contentInputRef.current.value = nextContent;
    updateReadTime(nextContent, updateVisibleReadTime);
    return nextContent;
  }

  function saveLocalDraft() {
    const nextContent = syncContent(true);
    const payload = {
      title,
      slug,
      description,
      excerpt,
      categorySlug,
      coverImage,
      coverAlt,
      tags,
      featured,
      content: nextContent,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(autosaveKeyRef.current, JSON.stringify(payload));
    setAutosaveStatus(
      `Rascunho local salvo ${new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    );
  }

  function getRangeRect(range: Range) {
    const rect = range.getBoundingClientRect();
    if (rect.width || rect.height) return rect;
    const marker = document.createElement("span");
    marker.appendChild(document.createTextNode("\u200b"));
    range.insertNode(marker);
    const markerRect = marker.getBoundingClientRect();
    marker.remove();
    return markerRect;
  }

  function updateBubbleMenu() {
    const selection = window.getSelection();
    if (
      !selection ||
      selection.rangeCount === 0 ||
      selection.isCollapsed ||
      !editorRef.current?.contains(selection.getRangeAt(0).commonAncestorContainer)
    ) {
      setBubbleMenu((current) => ({ ...current, open: false }));
      return;
    }

    const rect = selection.getRangeAt(0).getBoundingClientRect();
    setBubbleMenu({
      open: true,
      x: rect.left + rect.width / 2,
      y: Math.max(74, rect.top - 12),
    });
    saveSelection();
  }

  async function uploadBlogMedia(file: File, placement: string) {
    setUploadState({ label: `Enviando ${file.name}`, progress: 12 });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("placement", placement);

    const response = await fetch("/api/admin-master/blog/media", {
      method: "POST",
      body: formData,
    });
    setUploadState({ label: `Processando ${file.name}`, progress: 78 });
    const payload = (await response.json().catch(() => ({}))) as {
      publicUrl?: string;
      message?: string;
      type?: "image" | "video";
      name?: string;
    };

    if (!response.ok || !payload.publicUrl) {
      throw new Error(payload.message || "Nao foi possivel enviar a midia.");
    }

    setUploadState({ label: `${file.name} enviado`, progress: 100 });
    window.setTimeout(() => setUploadState(null), 700);
    return payload;
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

  function fileSizeLabel(bytes: number) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function canUseFile(file: File, maxBytes: number, kind: string) {
    if (file.size <= maxBytes) {
      setEditorNotice("");
      return true;
    }

    setEditorNotice(
      `${kind} muito grande (${fileSizeLabel(file.size)}). Use um arquivo de até ${fileSizeLabel(maxBytes)} para publicar sem erro.`
    );
    return false;
  }

  async function handleCoverFile(file?: File) {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    if (
      !canUseFile(
        file,
        isVideo ? MAX_INLINE_VIDEO_BYTES : MAX_INLINE_IMAGE_BYTES,
        isVideo ? "Vídeo de capa" : "Imagem de capa"
      )
    ) {
      if (coverInputRef.current) coverInputRef.current.value = "";
      return;
    }
    try {
      const uploaded = await uploadBlogMedia(file, "cover");
      setCoverImage(uploaded.publicUrl || "");
      if (!coverAlt) setCoverAlt(file.name.replace(/\.[^.]+$/, ""));
      setEditorNotice("");
    } catch (error) {
      setEditorNotice(
        error instanceof Error ? error.message : "Nao foi possivel enviar a capa."
      );
    }
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  function removeCoverImage() {
    setCoverImage("");
    setCoverAlt("");
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  async function handleInlineImage(file?: File) {
    if (!file) return;
    if (!canUseFile(file, MAX_INLINE_IMAGE_BYTES, "Imagem")) {
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = "";
      return;
    }
    try {
      const uploaded = await uploadBlogMedia(file, "inline-image");
      insertHtmlAtSelection(
        `<figure><img src="${escapeAttribute(uploaded.publicUrl || "")}" alt="${escapeAttribute(file.name)}" style="width:100%;border-radius:18px;margin:16px 0" loading="lazy" /><figcaption>${escapeHtml(file.name)}</figcaption></figure>`
      );
    } catch (error) {
      setEditorNotice(
        error instanceof Error
          ? error.message
          : "Nao foi possivel enviar a imagem."
      );
    }
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

  async function replaceSelectedInlineImage(file?: File) {
    const image = selectedInlineImageRef.current;
    if (!file || !image) return;
    if (!canUseFile(file, MAX_INLINE_IMAGE_BYTES, "Imagem")) {
      if (replaceInlineImageInputRef.current) {
        replaceInlineImageInputRef.current.value = "";
      }
      return;
    }
    try {
      const uploaded = await uploadBlogMedia(file, "inline-image");
      image.setAttribute("src", uploaded.publicUrl || "");
      image.setAttribute("alt", file.name);
      const figure = image.closest("figure");
      const caption = figure?.querySelector("figcaption");
      if (caption) caption.textContent = file.name;
      setSelectedInlineImageName(file.name);
      syncContent(true);
    } catch (error) {
      setEditorNotice(
        error instanceof Error
          ? error.message
          : "Nao foi possivel trocar a imagem."
      );
    }
    if (replaceInlineImageInputRef.current) {
      replaceInlineImageInputRef.current.value = "";
    }
  }

  async function handleInlineVideo(file?: File) {
    if (!file) return;
    if (!canUseFile(file, MAX_INLINE_VIDEO_BYTES, "Vídeo")) {
      if (inlineVideoInputRef.current) inlineVideoInputRef.current.value = "";
      return;
    }
    try {
      const uploaded = await uploadBlogMedia(file, "inline-video");
      insertHtmlAtSelection(
        `<figure><video src="${escapeAttribute(uploaded.publicUrl || "")}" data-name="${escapeAttribute(file.name)}" controls playsinline preload="metadata" style="width:100%;border-radius:18px;margin:16px 0;background:#111"></video><figcaption>${escapeHtml(file.name)}</figcaption></figure>`
      );
    } catch (error) {
      setEditorNotice(
        error instanceof Error ? error.message : "Nao foi possivel enviar o video."
      );
    }
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

  async function replaceSelectedInlineVideo(file?: File) {
    const video = selectedInlineVideoRef.current;
    if (!file || !video) return;
    if (!canUseFile(file, MAX_INLINE_VIDEO_BYTES, "Vídeo")) {
      if (replaceInlineVideoInputRef.current) {
        replaceInlineVideoInputRef.current.value = "";
      }
      return;
    }
    try {
      const uploaded = await uploadBlogMedia(file, "inline-video");
      video.setAttribute("src", uploaded.publicUrl || "");
      video.dataset.name = file.name;
      const figure = video.closest("figure");
      const caption = figure?.querySelector("figcaption");
      if (caption) caption.textContent = file.name;
      setSelectedInlineVideoName(file.name);
      syncContent(true);
    } catch (error) {
      setEditorNotice(
        error instanceof Error ? error.message : "Nao foi possivel trocar o video."
      );
    }
    if (replaceInlineVideoInputRef.current) {
      replaceInlineVideoInputRef.current.value = "";
    }
  }

  function getSlashQuery() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return null;

    const preRange = range.cloneRange();
    preRange.selectNodeContents(editorRef.current);
    preRange.setEnd(range.endContainer, range.endOffset);
    const text = preRange.toString();
    const match = text.match(/(?:^|\s)\/([\p{L}\p{N}-]*)$/u);
    return match ? match[1] : null;
  }

  function updateSlashMenu() {
    const query = getSlashQuery();
    if (query === null) {
      setSlashMenu((current) => ({ ...current, open: false }));
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const rect = getRangeRect(selection.getRangeAt(0).cloneRange());
    setSlashMenu({
      open: true,
      query,
      x: Math.max(16, rect.left),
      y: rect.bottom + 10,
    });
  }

  function deleteSlashCommand() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const query = getSlashQuery();
    if (query === null) return;
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;
    const start = Math.max(0, range.startOffset - query.length - 1);
    range.setStart(node, start);
    range.deleteContents();
  }

  function runSlashCommand(command: string) {
    editorRef.current?.focus();
    restoreSelection();
    deleteSlashCommand();
    setSlashMenu((current) => ({ ...current, open: false }));

    if (command === "h2") applyBlock("h2");
    if (command === "h3") applyBlock("h3");
    if (command === "p") applyBlock("p");
    if (command === "quote") applyBlock("blockquote");
    if (command === "button") insertButton();
    if (command === "image") inlineImageInputRef.current?.click();
    if (command === "video") inlineVideoInputRef.current?.click();
    syncContent(true);
  }

  async function handleEditorPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const image = Array.from(event.clipboardData.files).find((file) =>
      file.type.startsWith("image/")
    );
    if (!image) return;

    event.preventDefault();
    saveSelection();
    await handleInlineImage(image);
  }

  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (slashMenu.open) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSlashMenu((current) => ({ ...current, open: false }));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        runSlashCommand(filteredSlashCommands[0]?.id || "p");
        return;
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveLocalDraft();
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
        categories.find((category) => category.slug === categorySlug)?.name || "Blog",
      categoryId: categorySlug,
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
    if (!slugTouchedRef.current) setSlug(slugify(nextTitle));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const nextContent = syncContent(true);
    const totalSize = new Blob([nextContent, coverImage]).size;
    if (totalSize > MAX_FORM_CONTENT_BYTES) {
      event.preventDefault();
      setEditorNotice(
        `O post está com ${fileSizeLabel(totalSize)} em mídia dentro do texto. Remova ou reduza vídeos/imagens para ficar abaixo de ${fileSizeLabel(MAX_FORM_CONTENT_BYTES)}.`
      );
    }
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className="min-h-screen bg-[#f6f4ee] text-zinc-950"
    >
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
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-800 shadow-sm hover:border-zinc-950"
            >
              <Save size={16} />
              {isSaving ? "Salvando..." : "Rascunho"}
            </button>
            <button
              type="submit"
              name="status"
              value="publicado"
              onClick={() => syncContent(true)}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-zinc-800"
            >
              <Send size={16} />
              {isSaving ? "Publicando..." : "Publicar"}
            </button>
          </div>
        </div>
      </header>

      {actionState.error || editorNotice ? (
        <div className="mx-auto mt-4 max-w-7xl px-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-800">
            {actionState.error || editorNotice}
          </div>
        </div>
      ) : null}

      {uploadState ? (
        <div className="fixed bottom-5 left-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl">
          <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
            <span>{uploadState.label}</span>
            <span>{uploadState.progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-zinc-950 transition-all"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        </div>
      ) : null}

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
                  value={categorySlug}
                  onChange={(event) => setCategorySlug(event.target.value)}
                  className="rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-zinc-950"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
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
                  onChange={(event) => {
                    slugTouchedRef.current = true;
                    setSlug(slugify(event.target.value));
                  }}
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
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
                SEO em tempo real
              </div>
              <span className={`inline-flex items-center gap-2 text-xs font-black ${seoStatus.text}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${seoStatus.color}`} />
                {seoStatus.label}
              </span>
            </div>
            <div className="mt-4 grid gap-2">
              {seoChecks.map((check) => (
                <div
                  key={check.label}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs"
                >
                  <span className="font-black text-zinc-800">{check.label}</span>
                  <span
                    className={`text-right font-bold ${
                      check.ok ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {check.ok ? "Ok" : check.hint}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
              Capa do post
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(event) => {
                void handleCoverFile(event.target.files?.[0]);
              }}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black hover:border-zinc-950"
            >
              {isVideoMedia(coverImage) ? <Video size={17} /> : <ImagePlus size={17} />}
              {coverImage ? "Trocar capa" : "Carregar imagem ou vídeo"}
            </button>
            {coverImage ? (
              <div className="mt-3">
                <div className="overflow-hidden rounded-2xl border border-zinc-200">
                  {isVideoMedia(coverImage) ? (
                    <video
                      src={coverImage}
                      className="aspect-[4/3] w-full bg-zinc-950 object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                      aria-label={coverAlt || "Vídeo de capa"}
                    />
                  ) : coverImage.startsWith("data:") ? (
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
              placeholder="Texto alternativo ou descrição da capa"
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
              onChange={(event) => {
                void handleInlineImage(event.target.files?.[0]);
              }}
            />
            <input
              ref={replaceInlineImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) =>
                void replaceSelectedInlineImage(event.target.files?.[0])
              }
            />
            <input
              ref={inlineVideoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => {
                void handleInlineVideo(event.target.files?.[0]);
              }}
            />
            <input
              ref={replaceInlineVideoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) =>
                void replaceSelectedInlineVideo(event.target.files?.[0])
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Tempo estimado: {readTime}
            </span>
            <span className="inline-flex items-center gap-2">
              {typeof navigator !== "undefined" && !navigator.onLine ? (
                <WifiOff size={14} className="text-amber-600" />
              ) : (
                <Save size={14} className="text-zinc-400" />
              )}
              {autosaveStatus}
            </span>
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
            onInput={() => {
              syncContent(true);
              updateSlashMenu();
            }}
            onClick={handleEditorClick}
            onMouseUp={() => {
              saveSelection();
              updateBubbleMenu();
            }}
            onKeyDown={handleEditorKeyDown}
            onKeyUp={() => {
              saveSelection();
              updateBubbleMenu();
              updateSlashMenu();
            }}
            onPaste={(event) => {
              void handleEditorPaste(event);
            }}
            onBlur={() => {
              saveSelection();
              syncContent(true);
            }}
            className="blog-editor-prose min-h-[640px] px-5 py-6 text-left text-[18px] leading-8 outline-none sm:px-8"
          />
        </section>
      </main>

      {bubbleMenu.open ? (
        <div
          className="fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-2xl border border-zinc-200 bg-zinc-950 p-1 text-white shadow-2xl"
          style={{ left: bubbleMenu.x, top: bubbleMenu.y }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <button type="button" onClick={() => exec("bold")} className="rounded-xl p-2 hover:bg-white/10" title="Negrito">
            <Bold size={16} />
          </button>
          <button type="button" onClick={() => exec("italic")} className="rounded-xl p-2 hover:bg-white/10" title="Itálico">
            <Italic size={16} />
          </button>
          <button type="button" onClick={insertLink} className="rounded-xl p-2 hover:bg-white/10" title="Link">
            <Link2 size={16} />
          </button>
          <button type="button" onClick={() => applyFontSize(`${fontSize}px`)} className="rounded-xl px-2 py-1 text-xs font-black hover:bg-white/10" title="Aplicar tamanho">
            {fontSize}px
          </button>
        </div>
      ) : null}

      {slashMenu.open ? (
        <div
          className="fixed z-50 w-72 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
          style={{ left: slashMenu.x, top: slashMenu.y }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
            Inserir bloco <ChevronDown size={14} />
          </div>
          <div className="p-1">
            {(filteredSlashCommands.length ? filteredSlashCommands : slashCommands).map(
              (command) => {
                const Icon = command.icon;
                return (
                  <button
                    key={command.id}
                    type="button"
                    onClick={() => runSlashCommand(command.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-100"
                  >
                    <Icon size={16} />
                    {command.label}
                  </button>
                );
              }
            )}
          </div>
        </div>
      ) : null}

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
