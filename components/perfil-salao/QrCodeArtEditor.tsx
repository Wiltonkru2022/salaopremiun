"use client";

import {
  AlignCenter,
  BringToFront,
  CheckCircle2,
  Copy,
  Download,
  ImagePlus,
  Layers,
  Palette,
  Plus,
  Redo2,
  Scissors,
  Trash2,
  Type,
  Undo2,
  WandSparkles,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

type ArtElementType = "text" | "qr" | "logo" | "image" | "frame";
type TextAlign = "left" | "center" | "right";

type ArtElement = {
  id: string;
  type: ArtElementType;
  label: string;
  text?: string;
  src?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  background?: string;
  borderColor?: string;
  borderWidth?: number;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  textAlign?: TextAlign;
  radius?: number;
  locked?: boolean;
};

type ArtState = {
  background: string;
  primary: string;
  accent: string;
  text: string;
  elements: ArtElement[];
};

type DragState = {
  id: string;
  startX: number;
  startY: number;
  elementX: number;
  elementY: number;
  before: ArtState;
};

type Props = {
  open: boolean;
  onClose: () => void;
  publicUrl: string;
  qrCodeUrl: string;
  publicSlug: string;
  salaoNome: string;
  logoUrl?: string | null;
};

const ART_WIDTH = 720;
const ART_HEIGHT = 900;
const MAX_HISTORY = 40;

const templates = [
  {
    id: "claro",
    name: "Claro",
    background: "#fff8e7",
    primary: "#09090b",
    accent: "#c7a25c",
    text: "#5f5a4f",
    titleFont: "Montserrat",
    subtitleFont: "Lato",
  },
  {
    id: "premium",
    name: "Premium",
    background: "#09090b",
    primary: "#ffffff",
    accent: "#c7a25c",
    text: "#d6d3d1",
    titleFont: "Cinzel",
    subtitleFont: "Playfair Display",
  },
  {
    id: "leve",
    name: "Leve",
    background: "#f7ebe3",
    primary: "#17251f",
    accent: "#d39e82",
    text: "#65736d",
    titleFont: "Playfair Display",
    subtitleFont: "Great Vibes",
  },
  {
    id: "salon",
    name: "SalaoPremium",
    background: "#f7f4ed",
    primary: "#111111",
    accent: "#d8b36b",
    text: "#66615a",
    titleFont: "Montserrat",
    subtitleFont: "Lato",
  },
] as const;

const quickCalls = [
  {
    label: "Agendamento rapido",
    title: "AGENDE SEU HORARIO",
    subtitle: "Escaneie para ver nossa agenda de servicos",
  },
  {
    label: "Cardapio de servicos",
    title: "CARDAPIO DE SERVICOS",
    subtitle: "Confira valores, horarios e especialidades",
  },
  {
    label: "Vitrine do salao",
    title: "CONHECA NOSSO SALAO",
    subtitle: "Veja fotos, equipe e escolha seu atendimento",
  },
] as const;

const fontOptions = [
  { value: "Montserrat", label: "Montserrat" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Cinzel", label: "Cinzel" },
  { value: "Great Vibes", label: "Great Vibes" },
  { value: "Lato", label: "Lato" },
  { value: "Arial", label: "Arial" },
] as const;

function uid(prefix = "el") {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-");
}

function buildInitialState(params: {
  salaoNome: string;
  publicUrl: string;
  qrCodeUrl: string;
  logoUrl?: string | null;
}): ArtState {
  return {
    background: "#fff8e7",
    primary: "#09090b",
    accent: "#c7a25c",
    text: "#5f5a4f",
    elements: [
      {
        id: "frame",
        type: "frame",
        label: "Moldura",
        x: 34,
        y: 34,
        w: 652,
        h: 832,
        borderColor: "#c7a25c",
        borderWidth: 3,
        radius: 20,
        locked: true,
      },
      ...(params.logoUrl
        ? [
            {
              id: "logo",
              type: "logo" as const,
              label: "Logo",
              src: params.logoUrl,
              x: 292,
              y: 54,
              w: 136,
              h: 136,
              background: "#ffffff",
              radius: 34,
            },
          ]
        : []),
      {
        id: "title",
        type: "text",
        label: "Titulo",
        text: (params.salaoNome || "SalaoPremium").toUpperCase(),
        x: 82,
        y: params.logoUrl ? 208 : 102,
        w: 556,
        h: 78,
        color: "#09090b",
        fontSize: 42,
        fontWeight: 900,
        fontFamily: "Montserrat",
        textAlign: "center",
      },
      {
        id: "subtitle",
        type: "text",
        label: "Chamada",
        text: "Agende seu horario pelo app",
        x: 90,
        y: params.logoUrl ? 288 : 184,
        w: 540,
        h: 54,
        color: "#5f5a4f",
        fontSize: 26,
        fontWeight: 700,
        fontFamily: "Lato",
        textAlign: "center",
      },
      {
        id: "qr",
        type: "qr",
        label: "QR Code",
        src: params.qrCodeUrl,
        x: 190,
        y: 372,
        w: 340,
        h: 340,
        background: "#ffffff",
        radius: 30,
      },
      {
        id: "url",
        type: "text",
        label: "Link",
        text: params.publicUrl,
        x: 82,
        y: 748,
        w: 556,
        h: 52,
        color: "#09090b",
        fontSize: 22,
        fontWeight: 800,
        fontFamily: "Montserrat",
        textAlign: "center",
      },
      {
        id: "footer",
        type: "text",
        label: "Rodape",
        text: "Aponte a camera e reserve em poucos segundos",
        x: 88,
        y: 814,
        w: 544,
        h: 42,
        color: "#756f65",
        fontSize: 20,
        fontWeight: 700,
        fontFamily: "Lato",
        textAlign: "center",
      },
    ],
  };
}

function cloneState(state: ArtState): ArtState {
  return {
    ...state,
    elements: state.elements.map((item) => ({ ...item })),
  };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function contrastScore(background: string, foreground: string) {
  const bg = hexToRgb(background);
  const fg = hexToRgb(foreground);
  return Math.abs(
    0.2126 * bg.r +
      0.7152 * bg.g +
      0.0722 * bg.b -
      (0.2126 * fg.r + 0.7152 * fg.g + 0.0722 * fg.b)
  );
}

function textAlignToCanvas(textAlign: TextAlign | undefined) {
  if (textAlign === "right") return "right";
  if (textAlign === "left") return "left";
  return "center";
}

function textAnchorX(item: ArtElement) {
  if (item.textAlign === "left") return item.x;
  if (item.textAlign === "right") return item.x + item.w;
  return item.x + item.w / 2;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export default function QrCodeArtEditor({
  open,
  onClose,
  publicUrl,
  qrCodeUrl,
  publicSlug,
  salaoNome,
  logoUrl,
}: Props) {
  const [art, setArt] = useState<ArtState>(() =>
    buildInitialState({ salaoNome, publicUrl, qrCodeUrl, logoUrl })
  );
  const [selectedId, setSelectedId] = useState("qr");
  const [copiedElement, setCopiedElement] = useState<ArtElement | null>(null);
  const [past, setPast] = useState<ArtState[]>([]);
  const [future, setFuture] = useState<ArtState[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (!open) return;
    setArt(buildInitialState({ salaoNome, publicUrl, qrCodeUrl, logoUrl }));
    setSelectedId("qr");
    setCopiedElement(null);
    setPast([]);
    setFuture([]);
    setExportError("");
  }, [logoUrl, open, publicUrl, qrCodeUrl, salaoNome]);

  const selected = useMemo(
    () => art.elements.find((item) => item.id === selectedId) || null,
    [art.elements, selectedId]
  );

  const contrast = useMemo(
    () => contrastScore(art.background, art.primary),
    [art.background, art.primary]
  );

  const contrastStatus = useMemo(() => {
    if (contrast > 120) {
      return {
        label: "Perfeito",
        className: "bg-emerald-500/10 text-emerald-300",
        description: "O QR Code esta com contraste alto para leitura por celular.",
      };
    }
    if (contrast > 70) {
      return {
        label: "Atencao",
        className: "bg-amber-500/10 text-amber-300",
        description: "O contraste esta mediano. Funciona melhor em boa luz.",
      };
    }
    return {
      label: "Inseguro",
      className: "bg-rose-500/10 text-rose-300",
      description: "Contraste baixo. Troque fundo ou cor principal antes de imprimir.",
    };
  }, [contrast]);

  function commit(next: ArtState) {
    setPast((current) => [...current.slice(-(MAX_HISTORY - 1)), cloneState(art)]);
    setFuture([]);
    setArt(next);
  }

  function updateArt(mutator: (current: ArtState) => ArtState) {
    commit(mutator(cloneState(art)));
  }

  function updateElement(id: string, patch: Partial<ArtElement>) {
    updateArt((current) => ({
      ...current,
      elements: current.elements.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  }

  function undo() {
    const previous = past[past.length - 1];
    if (!previous) return;
    setPast((current) => current.slice(0, -1));
    setFuture((current) => [cloneState(art), ...current]);
    setArt(cloneState(previous));
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setFuture((current) => current.slice(1));
    setPast((current) => [...current.slice(-(MAX_HISTORY - 1)), cloneState(art)]);
    setArt(cloneState(next));
  }

  function applyTemplate(template: (typeof templates)[number]) {
    updateArt((current) => ({
      ...current,
      background: template.background,
      primary: template.primary,
      accent: template.accent,
      text: template.text,
      elements: current.elements.map((item) => {
        if (item.id === "frame") {
          return { ...item, borderColor: template.accent };
        }
        if (item.id === "title") {
          return {
            ...item,
            color: template.primary,
            fontFamily: template.titleFont,
            fontSize: template.id === "leve" ? 48 : 42,
          };
        }
        if (item.id === "subtitle") {
          return {
            ...item,
            color: template.text,
            fontFamily: template.subtitleFont,
            fontSize: template.id === "leve" ? 34 : 26,
          };
        }
        if (item.type === "text") {
          return { ...item, color: item.id === "footer" ? template.text : template.primary };
        }
        return item;
      }),
    }));
  }

  function applyQuickCall(title: string, subtitle: string) {
    updateArt((current) => ({
      ...current,
      elements: current.elements.map((item) => {
        if (item.id === "title") return { ...item, text: title };
        if (item.id === "subtitle") return { ...item, text: subtitle };
        return item;
      }),
    }));
  }

  function updatePalette(patch: Partial<Pick<ArtState, "background" | "primary" | "accent" | "text">>) {
    updateArt((current) => ({
      ...current,
      ...patch,
      elements: current.elements.map((item) => {
        if (patch.accent && item.id === "frame") return { ...item, borderColor: patch.accent };
        if (patch.primary && item.id === "title") return { ...item, color: patch.primary };
        if (patch.text && (item.id === "subtitle" || item.id === "footer")) {
          return { ...item, color: patch.text };
        }
        return item;
      }),
    }));
  }

  function pointerToArt(event: ReactPointerEvent) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - rect.left) / rect.width) * ART_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * ART_HEIGHT,
    };
  }

  function startDrag(event: ReactPointerEvent, item: ArtElement) {
    if (item.locked) return;
    const point = pointerToArt(event);
    dragRef.current = {
      id: item.id,
      startX: point.x,
      startY: point.y,
      elementX: item.x,
      elementY: item.y,
      before: cloneState(art),
    };
    setSelectedId(item.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointerToArt(event);
    const item = art.elements.find((element) => element.id === drag.id);
    if (!item) return;
    setArt((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === drag.id
          ? {
              ...element,
              x: clamp(drag.elementX + point.x - drag.startX, 0, ART_WIDTH - element.w),
              y: clamp(drag.elementY + point.y - drag.startY, 0, ART_HEIGHT - element.h),
            }
          : element
      ),
    }));
  }

  function stopDrag() {
    const drag = dragRef.current;
    if (drag) {
      setPast((current) => [...current.slice(-(MAX_HISTORY - 1)), drag.before]);
      setFuture([]);
    }
    dragRef.current = null;
  }

  function addText(kind: "title" | "subtitle" = "title") {
    const next: ArtElement = {
      id: uid("text"),
      type: "text",
      label: kind === "title" ? "Novo titulo" : "Novo subtitulo",
      text: kind === "title" ? "NOVO TEXTO" : "Escreva sua chamada",
      x: 120,
      y: kind === "title" ? 252 : 316,
      w: 480,
      h: kind === "title" ? 64 : 46,
      color: kind === "title" ? art.primary : art.text,
      fontSize: kind === "title" ? 34 : 24,
      fontWeight: kind === "title" ? 900 : 700,
      fontFamily: kind === "title" ? "Montserrat" : "Lato",
      textAlign: "center",
    };
    updateArt((current) => ({ ...current, elements: [...current.elements, next] }));
    setSelectedId(next.id);
  }

  function addImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const next: ArtElement = {
        id: uid("image"),
        type: "image",
        label: file.name || "Imagem",
        src: String(reader.result || ""),
        x: 250,
        y: 340,
        w: 220,
        h: 170,
        radius: 18,
      };
      updateArt((current) => ({ ...current, elements: [...current.elements, next] }));
      setSelectedId(next.id);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function duplicateSelected() {
    if (!selected || selected.locked) return;
    const next = {
      ...selected,
      id: uid(selected.type),
      label: `${selected.label} copia`,
      x: clamp(selected.x + 26, 0, ART_WIDTH - selected.w),
      y: clamp(selected.y + 26, 0, ART_HEIGHT - selected.h),
      locked: false,
    };
    updateArt((current) => ({ ...current, elements: [...current.elements, next] }));
    setSelectedId(next.id);
  }

  function pasteElement() {
    if (!copiedElement) return;
    const next = {
      ...copiedElement,
      id: uid(copiedElement.type),
      label: `${copiedElement.label} copia`,
      x: clamp(copiedElement.x + 32, 0, ART_WIDTH - copiedElement.w),
      y: clamp(copiedElement.y + 32, 0, ART_HEIGHT - copiedElement.h),
      locked: false,
    };
    updateArt((current) => ({ ...current, elements: [...current.elements, next] }));
    setSelectedId(next.id);
  }

  function deleteSelected() {
    if (!selected || selected.locked || selected.type === "qr") return;
    updateArt((current) => ({
      ...current,
      elements: current.elements.filter((item) => item.id !== selected.id),
    }));
    setSelectedId("qr");
  }

  function alignSelected(position: "left" | "center" | "right") {
    if (!selected || selected.locked) return;
    const x =
      position === "left"
        ? 64
        : position === "right"
          ? ART_WIDTH - selected.w - 64
          : (ART_WIDTH - selected.w) / 2;
    updateElement(selected.id, { x });
  }

  function bringSelectedToFront() {
    if (!selected || selected.locked) return;
    updateArt((current) => ({
      ...current,
      elements: [
        ...current.elements.filter((item) => item.id !== selected.id),
        selected,
      ],
    }));
  }

  function sendSelectedBack() {
    if (!selected || selected.locked || selected.type === "qr") return;
    updateArt((current) => {
      const without = current.elements.filter((item) => item.id !== selected.id);
      const frameIndex = without.findIndex((item) => item.id === "frame");
      const next = [...without];
      next.splice(frameIndex + 1, 0, selected);
      return { ...current, elements: next };
    });
  }

  async function exportPng() {
    setExporting(true);
    setExportError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = ART_WIDTH * 2;
      canvas.height = ART_HEIGHT * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponivel.");
      ctx.scale(2, 2);

      ctx.fillStyle = art.background;
      ctx.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);

      for (const item of art.elements) {
        if (item.type === "frame") {
          ctx.strokeStyle = item.borderColor || art.accent;
          ctx.lineWidth = item.borderWidth || 2;
          drawRoundedRect(ctx, item.x, item.y, item.w, item.h, item.radius || 0);
          ctx.stroke();
          continue;
        }

        if (item.background) {
          ctx.fillStyle = item.background;
          drawRoundedRect(ctx, item.x, item.y, item.w, item.h, item.radius || 0);
          ctx.fill();
        }

        if (item.type === "text") {
          const fontSize = item.fontSize || 24;
          ctx.fillStyle = item.color || art.primary;
          ctx.font = `${item.fontWeight || 700} ${fontSize}px ${item.fontFamily || "Arial"}, Arial, sans-serif`;
          ctx.textBaseline = "top";
          ctx.textAlign = textAlignToCanvas(item.textAlign);
          const lines = wrapText(ctx, String(item.text || ""), item.w);
          const maxLines = Math.max(1, Math.floor(item.h / (fontSize * 1.18)));
          lines.slice(0, maxLines).forEach((text, index) => {
            ctx.fillText(text, textAnchorX(item), item.y + index * fontSize * 1.18);
          });
        }

        if ((item.type === "qr" || item.type === "logo" || item.type === "image") && item.src) {
          const image = await loadImage(item.src);
          ctx.save();
          drawRoundedRect(ctx, item.x, item.y, item.w, item.h, item.radius || 0);
          ctx.clip();
          ctx.drawImage(image, item.x, item.y, item.w, item.h);
          ctx.restore();
        }
      }

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `arte-qrcode-${safeFileName(publicSlug || "salao")}.png`;
      link.click();
    } catch {
      setExportError(
        "Nao foi possivel exportar. Se usou logo externa, envie a imagem pelo botao Imagem e tente de novo."
      );
    } finally {
      setExporting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden bg-[#f4f0e8]">
      <div className="flex h-dvh flex-col bg-[#f7f4ed] text-zinc-950">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={salaoNome || "SalãoPremiun"}
                className="h-11 w-11 rounded-xl border border-[#d8b36b]/40 bg-white object-contain p-1"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#111111] text-[#d8b36b]">
                <Scissors size={21} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 text-lg font-black leading-none">
                SalãoPremiun Editor
                <span className="rounded-full bg-[#d8b36b]/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#8a5a12]">
                  Marketing
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-zinc-500">
                Artes, QR Code, stories e posts para o seu salao
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
              <IconButton label="Desfazer" onClick={undo} disabled={!past.length}>
                <Undo2 size={17} />
              </IconButton>
              <IconButton label="Refazer" onClick={redo} disabled={!future.length}>
                <Redo2 size={17} />
              </IconButton>
            </div>
            <button
              type="button"
              onClick={exportPng}
              disabled={exporting}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-black text-white shadow-lg shadow-black/10 transition active:scale-[0.98] disabled:opacity-60"
            >
              <Download size={17} />
              {exporting ? "Gerando..." : "Baixar PNG"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
              aria-label="Fechar editor"
            >
              <X size={19} />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
          <aside className="min-h-0 overflow-y-auto border-r border-zinc-200 bg-white p-4">
            <PanelTitle icon={<Layers size={15} />} title="Novo projeto" />
            <div className="mb-6 grid grid-cols-2 gap-2">
              {[
                "Story 1080x1920",
                "Post 1080x1080",
                "Feed 1080x1350",
                "Personalizado",
              ].map((format) => (
                <button
                  key={format}
                  type="button"
                  className="rounded-xl border border-zinc-200 bg-[#fff8e7] px-3 py-2 text-left text-xs font-black text-zinc-800 transition hover:border-[#d8b36b]"
                >
                  {format}
                </button>
              ))}
            </div>
            <PanelTitle icon={<WandSparkles size={15} />} title="Modelos de estilo" />
            <div className="grid grid-cols-2 gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="rounded-xl border border-zinc-200 bg-white p-2 text-left shadow-sm transition hover:border-[#d8b36b]"
                >
                  <div
                    className="mb-2 flex h-14 items-center justify-center rounded-lg border text-sm font-black"
                    style={{
                      backgroundColor: template.background,
                      color: template.primary,
                      borderColor: template.accent,
                    }}
                  >
                    A
                  </div>
                  <span className="text-xs font-black">{template.name}</span>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <PanelTitle icon={<Type size={15} />} title="Texto e chamadas" />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => addText("title")}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 text-xs font-black text-white transition hover:bg-zinc-800"
                >
                  <Plus size={14} />
                  Titulo
                </button>
                <button
                  type="button"
                  onClick={() => addText("subtitle")}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-xs font-black text-zinc-800 transition hover:bg-zinc-50"
                >
                  <Plus size={14} />
                  Subtitulo
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {quickCalls.map((call) => (
                  <button
                    key={call.label}
                    type="button"
                    onClick={() => applyQuickCall(call.title, call.subtitle)}
                    className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition hover:border-[#d8b36b]"
                  >
                    <span className="block text-xs font-black text-[#d8b36b]">
                      {call.label}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold text-zinc-500">
                      {call.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <PanelTitle icon={<ImagePlus size={15} />} title="Imagens e logo" />
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center transition hover:border-[#d8b36b] hover:bg-[#fff8e7]">
                <ImagePlus size={24} className="text-[#d8b36b]" />
                <span className="mt-2 text-xs font-black">Adicionar imagem</span>
                <span className="mt-1 text-[11px] text-zinc-500">
                  Foto, logo extra ou fundo decorativo
                </span>
                <input type="file" accept="image/*" onChange={addImage} className="sr-only" />
              </label>
            </div>

            <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                  Validador QR
                </span>
                <span className={`rounded-full px-2 py-1 text-[10px] font-black ${contrastStatus.className}`}>
                  {contrastStatus.label}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-600">
                {contrastStatus.description}
              </p>
            </div>
          </aside>

          <main className="relative flex min-h-0 flex-col items-center justify-center overflow-auto bg-[#efebe3] p-4 lg:p-8">
            <div className="rounded-xl border border-zinc-200 bg-white p-1 shadow-2xl shadow-black/10">
              <div
                ref={stageRef}
                className="relative aspect-[4/5] w-[min(72vw,520px)] max-w-[520px] overflow-hidden"
                style={{ background: art.background }}
                onPointerMove={moveDrag}
                onPointerUp={stopDrag}
                onPointerCancel={stopDrag}
              >
                {art.elements.map((item) => {
                  const selectedClass =
                    selectedId === item.id
                      ? "ring-2 ring-[#d8b36b] ring-offset-2 ring-offset-white"
                      : item.locked
                        ? ""
                        : "ring-1 ring-black/5";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onPointerDown={(event) => startDrag(event, item)}
                      onClick={() => setSelectedId(item.id)}
                      className={`absolute overflow-hidden text-left ${item.locked ? "pointer-events-none" : "cursor-move"} ${selectedClass}`}
                      style={{
                        left: `${(item.x / ART_WIDTH) * 100}%`,
                        top: `${(item.y / ART_HEIGHT) * 100}%`,
                        width: `${(item.w / ART_WIDTH) * 100}%`,
                        height: `${(item.h / ART_HEIGHT) * 100}%`,
                        background: item.background || "transparent",
                        borderColor: item.borderColor || "transparent",
                        borderWidth: item.borderWidth || 0,
                        borderRadius: item.radius || 0,
                      }}
                    >
                      {item.type === "text" ? (
                        <span
                          className="block h-full w-full break-words leading-tight"
                          style={{
                            color: item.color,
                            fontFamily: `${item.fontFamily || "Arial"}, Arial, sans-serif`,
                            fontSize: `clamp(9px, ${((item.fontSize || 24) / ART_WIDTH) * 80}vw, ${
                              (item.fontSize || 24) * 0.72
                            }px)`,
                            fontWeight: item.fontWeight,
                            textAlign: item.textAlign || "center",
                          }}
                        >
                          {item.text}
                        </span>
                      ) : item.type === "frame" ? null : (
                        <img
                          src={item.src}
                          alt={item.label}
                          className="h-full w-full object-contain"
                          draggable={false}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <CheckCircle2 size={14} />
              Arraste elementos. Edite texto, fonte, tamanho e cores no painel.
            </p>
          </main>

          <aside className="min-h-0 overflow-y-auto border-l border-zinc-200 bg-white p-4">
            <PanelTitle icon={<Palette size={15} />} title="Paleta da arte" />
            <div className="space-y-3">
              <ColorField
                label="Fundo"
                description="Base da arte"
                value={art.background}
                onChange={(value) => updatePalette({ background: value })}
              />
              <ColorField
                label="Principal"
                description="Titulo e contraste"
                value={art.primary}
                onChange={(value) => updatePalette({ primary: value })}
              />
              <ColorField
                label="Destaque"
                description="Molduras e detalhes"
                value={art.accent}
                onChange={(value) => updatePalette({ accent: value })}
              />
              <ColorField
                label="Texto"
                description="Subtitulos e apoio"
                value={art.text}
                onChange={(value) => updatePalette({ text: value })}
              />
            </div>

            {selected ? (
              <div className="mt-6 border-t border-zinc-200 pt-5">
                <PanelTitle icon={<Type size={15} />} title="Elemento selecionado" />
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-sm font-black">{selected.label}</div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <IconAction label="Centro" onClick={() => alignSelected("center")}>
                      <AlignCenter size={16} />
                    </IconAction>
                    <IconAction label="Frente" onClick={bringSelectedToFront}>
                      <BringToFront size={16} />
                    </IconAction>
                    <IconAction label="Atras" onClick={sendSelectedBack}>
                      <Layers size={16} />
                    </IconAction>
                    <IconAction label="Duplicar" onClick={duplicateSelected}>
                      <Copy size={16} />
                    </IconAction>
                  </div>

                  {selected.type === "text" ? (
                    <div className="mt-3 space-y-3">
                      <label className="block text-xs font-black text-zinc-500">
                        Texto
                        <textarea
                          value={selected.text || ""}
                          onChange={(event) =>
                            updateElement(selected.id, { text: event.target.value })
                          }
                          className="mt-1 min-h-20 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-[#d8b36b]"
                        />
                      </label>
                      <label className="block text-xs font-black text-zinc-500">
                        Fonte
                        <select
                          value={selected.fontFamily || "Montserrat"}
                          onChange={(event) =>
                            updateElement(selected.id, { fontFamily: event.target.value })
                          }
                          className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-[#d8b36b]"
                        >
                          {fontOptions.map((font) => (
                            <option key={font.value} value={font.value}>
                              {font.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <ColorField
                          compact
                          label="Cor"
                          value={selected.color || art.primary}
                          onChange={(value) => updateElement(selected.id, { color: value })}
                        />
                        <NumberField
                          label="Tamanho"
                          value={selected.fontSize || 24}
                          min={10}
                          max={96}
                          onChange={(value) => updateElement(selected.id, { fontSize: value })}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 rounded-xl bg-zinc-100 p-1">
                        {(["left", "center", "right"] as const).map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => updateElement(selected.id, { textAlign: align })}
                            className={`h-9 rounded-lg text-xs font-black transition ${
                              selected.textAlign === align
                                ? "bg-[#d8b36b] text-black"
                                : "text-zinc-600 hover:bg-white"
                            }`}
                          >
                            {align === "left" ? "Esq" : align === "right" ? "Dir" : "Centro"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {!selected.locked ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <NumberField
                        label="Largura"
                        value={Math.round(selected.w)}
                        min={40}
                        max={ART_WIDTH}
                        onChange={(value) =>
                          updateElement(selected.id, {
                            w: clamp(value, 40, ART_WIDTH - selected.x),
                          })
                        }
                      />
                      <NumberField
                        label="Altura"
                        value={Math.round(selected.h)}
                        min={32}
                        max={ART_HEIGHT}
                        onChange={(value) =>
                          updateElement(selected.id, {
                            h: clamp(value, 32, ART_HEIGHT - selected.y),
                          })
                        }
                      />
                    </div>
                  ) : null}

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <IconAction
                      label="Copiar"
                      onClick={() => selected && setCopiedElement(selected)}
                    >
                      <Copy size={16} />
                    </IconAction>
                    <IconAction
                      label={copiedElement ? "Colar" : "Duplicar"}
                      onClick={copiedElement ? pasteElement : duplicateSelected}
                    >
                      <Plus size={16} />
                    </IconAction>
                    <IconAction
                      label="Apagar"
                      onClick={deleteSelected}
                      disabled={selected.locked || selected.type === "qr"}
                      danger
                    >
                      <Trash2 size={16} />
                    </IconAction>
                  </div>
                </div>
              </div>
            ) : null}

            {exportError ? (
              <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">
                {exportError}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

function PanelTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
      <span className="text-[#d8b36b]">{icon}</span>
      {title}
    </div>
  );
}

function ColorField({
  label,
  description,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 ${
        compact ? "p-2" : "p-3"
      }`}
    >
      <span>
        <span className="block text-xs font-black text-zinc-900">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[11px] font-semibold text-zinc-500">
            {description}
          </span>
        ) : null}
      </span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs font-black text-zinc-500">
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value || min))}
        className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-[#d8b36b]"
      />
    </label>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function IconAction({
  label,
  disabled,
  danger,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center rounded-xl border text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-35 ${
        danger
          ? "border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
      }`}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}
