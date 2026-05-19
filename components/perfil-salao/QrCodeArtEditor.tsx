"use client";

import {
  Copy,
  Download,
  ImagePlus,
  Palette,
  Plus,
  Trash2,
  Type,
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

type ArtElementType = "text" | "qr" | "logo" | "image";

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
  fontSize?: number;
  fontWeight?: number;
  radius?: number;
};

type DragState = {
  id: string;
  startX: number;
  startY: number;
  elementX: number;
  elementY: number;
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

const templates = [
  {
    id: "clean",
    name: "Claro",
    background: "#fff8e7",
    accent: "#111111",
    text: "#111111",
  },
  {
    id: "dark",
    name: "Premium",
    background: "#111111",
    accent: "#d8b36b",
    text: "#ffffff",
  },
  {
    id: "mint",
    name: "Leve",
    background: "#e8fff5",
    accent: "#047857",
    text: "#10241c",
  },
];

function uid(prefix = "el") {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function moneySafeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-");
}

function buildInitialElements(params: {
  salaoNome: string;
  publicUrl: string;
  qrCodeUrl: string;
  logoUrl?: string | null;
}) {
  return [
    {
      id: "title",
      type: "text",
      label: "Titulo",
      text: params.salaoNome || "SalaoPremium",
      x: 80,
      y: 86,
      w: 560,
      h: 82,
      color: "#111111",
      fontSize: 50,
      fontWeight: 900,
    },
    {
      id: "subtitle",
      type: "text",
      label: "Chamada",
      text: "Agende seu horario pelo app",
      x: 92,
      y: 170,
      w: 536,
      h: 44,
      color: "#5f5f46",
      fontSize: 28,
      fontWeight: 700,
    },
    {
      id: "qr",
      type: "qr",
      label: "QR Code",
      src: params.qrCodeUrl,
      x: 190,
      y: 280,
      w: 340,
      h: 340,
      background: "#ffffff",
      radius: 28,
    },
    {
      id: "url",
      type: "text",
      label: "Link",
      text: params.publicUrl,
      x: 80,
      y: 688,
      w: 560,
      h: 54,
      color: "#111111",
      fontSize: 22,
      fontWeight: 700,
    },
    {
      id: "footer",
      type: "text",
      label: "Rodape",
      text: "Aponte a camera e reserve em poucos segundos",
      x: 80,
      y: 780,
      w: 560,
      h: 44,
      color: "#6b7280",
      fontSize: 22,
      fontWeight: 700,
    },
    ...(params.logoUrl
      ? [
          {
            id: "logo",
            type: "logo" as const,
            label: "Logo",
            src: params.logoUrl,
            x: 298,
            y: 38,
            w: 124,
            h: 124,
            background: "#ffffff",
            radius: 32,
          },
        ]
      : []),
  ] satisfies ArtElement[];
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

export default function QrCodeArtEditor({
  open,
  onClose,
  publicUrl,
  qrCodeUrl,
  publicSlug,
  salaoNome,
  logoUrl,
}: Props) {
  const [background, setBackground] = useState("#fff8e7");
  const [elements, setElements] = useState<ArtElement[]>(() =>
    buildInitialElements({ salaoNome, publicUrl, qrCodeUrl, logoUrl })
  );
  const [selectedId, setSelectedId] = useState("qr");
  const [copiedElement, setCopiedElement] = useState<ArtElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (!open) return;
    setElements(buildInitialElements({ salaoNome, publicUrl, qrCodeUrl, logoUrl }));
    setSelectedId("qr");
    setExportError("");
  }, [logoUrl, open, publicUrl, qrCodeUrl, salaoNome]);

  const selected = useMemo(
    () => elements.find((item) => item.id === selectedId) || null,
    [elements, selectedId]
  );

  function updateElement(id: string, patch: Partial<ArtElement>) {
    setElements((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function applyTemplate(template: (typeof templates)[number]) {
    setBackground(template.background);
    setElements((current) =>
      current.map((item) =>
        item.type === "text"
          ? { ...item, color: item.id === "subtitle" ? template.accent : template.text }
          : item
      )
    );
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
    const point = pointerToArt(event);
    dragRef.current = {
      id: item.id,
      startX: point.x,
      startY: point.y,
      elementX: item.x,
      elementY: item.y,
    };
    setSelectedId(item.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointerToArt(event);
    const item = elements.find((element) => element.id === drag.id);
    if (!item) return;
    updateElement(drag.id, {
      x: clamp(drag.elementX + point.x - drag.startX, 0, ART_WIDTH - item.w),
      y: clamp(drag.elementY + point.y - drag.startY, 0, ART_HEIGHT - item.h),
    });
  }

  function stopDrag() {
    dragRef.current = null;
  }

  function duplicateSelected() {
    if (!selected) return;
    const next = {
      ...selected,
      id: uid(selected.type),
      label: `${selected.label} copia`,
      x: clamp(selected.x + 26, 0, ART_WIDTH - selected.w),
      y: clamp(selected.y + 26, 0, ART_HEIGHT - selected.h),
    };
    setElements((current) => [...current, next]);
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
    };
    setElements((current) => [...current, next]);
    setSelectedId(next.id);
  }

  function deleteSelected() {
    if (!selected || selected.type === "qr") return;
    setElements((current) => current.filter((item) => item.id !== selected.id));
    setSelectedId("qr");
  }

  function addText() {
    const next: ArtElement = {
      id: uid("text"),
      type: "text",
      label: "Novo texto",
      text: "Novo texto",
      x: 120,
      y: 380,
      w: 480,
      h: 58,
      color: "#111111",
      fontSize: 30,
      fontWeight: 800,
    };
    setElements((current) => [...current, next]);
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
        x: 220,
        y: 330,
        w: 220,
        h: 160,
        radius: 20,
      };
      setElements((current) => [...current, next]);
      setSelectedId(next.id);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function exportPng() {
    setExporting(true);
    setExportError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = ART_WIDTH;
      canvas.height = ART_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponivel.");

      ctx.fillStyle = background;
      ctx.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);

      for (const item of elements) {
        if (item.background) {
          ctx.fillStyle = item.background;
          drawRoundedRect(ctx, item.x, item.y, item.w, item.h, item.radius || 0);
          ctx.fill();
        }

        if (item.type === "text") {
          ctx.fillStyle = item.color || "#111111";
          ctx.font = `${item.fontWeight || 700} ${item.fontSize || 24}px Arial, sans-serif`;
          ctx.textBaseline = "top";
          const words = String(item.text || "").split(" ");
          const lines: string[] = [];
          let line = "";
          for (const word of words) {
            const candidate = line ? `${line} ${word}` : word;
            if (ctx.measureText(candidate).width > item.w && line) {
              lines.push(line);
              line = word;
            } else {
              line = candidate;
            }
          }
          if (line) lines.push(line);
          lines.slice(0, Math.max(1, Math.floor(item.h / (item.fontSize || 24)))).forEach((text, index) => {
            ctx.fillText(text, item.x, item.y + index * ((item.fontSize || 24) * 1.18));
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
      link.download = `arte-qrcode-${moneySafeFileName(publicSlug || "salao")}.png`;
      link.click();
    } catch {
      setExportError(
        "Nao foi possivel exportar. Se usou logo externa, envie a imagem pelo botao Adicionar imagem e tente novamente."
      );
    } finally {
      setExporting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/55 px-4 py-5 backdrop-blur-sm">
      <div className="mx-auto grid max-w-7xl gap-4 rounded-[26px] bg-white p-4 shadow-2xl lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                Editor de arte
              </div>
              <h2 className="mt-1 text-xl font-black text-zinc-950">
                Personalizar QR Code
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-700"
            >
              <X size={17} />
            </button>
          </div>

          <div className="flex justify-center overflow-hidden rounded-[24px] border border-zinc-200 bg-zinc-100 p-3">
            <div
              ref={stageRef}
              className="relative aspect-[4/5] w-full max-w-[520px] overflow-hidden rounded-[24px] shadow-xl"
              style={{ background }}
              onPointerMove={moveDrag}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
            >
              {elements.map((item) => {
                const selectedClass =
                  selectedId === item.id
                    ? "ring-2 ring-emerald-500 ring-offset-2"
                    : "ring-1 ring-black/5";
                return (
                  <button
                    key={item.id}
                    type="button"
                    onPointerDown={(event) => startDrag(event, item)}
                    className={`absolute cursor-move overflow-hidden text-left ${selectedClass}`}
                    style={{
                      left: `${(item.x / ART_WIDTH) * 100}%`,
                      top: `${(item.y / ART_HEIGHT) * 100}%`,
                      width: `${(item.w / ART_WIDTH) * 100}%`,
                      height: `${(item.h / ART_HEIGHT) * 100}%`,
                      background: item.background || "transparent",
                      borderRadius: item.radius || 0,
                    }}
                  >
                    {item.type === "text" ? (
                      <span
                        className="block h-full w-full break-words leading-tight"
                        style={{
                          color: item.color,
                          fontSize: `clamp(10px, ${((item.fontSize || 24) / ART_WIDTH) * 100}vw, ${
                            (item.fontSize || 24) * 0.72
                          }px)`,
                          fontWeight: item.fontWeight,
                        }}
                      >
                        {item.text}
                      </span>
                    ) : (
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
        </div>

        <aside className="space-y-3 rounded-[22px] border border-zinc-200 bg-zinc-50 p-3">
          <div className="grid grid-cols-3 gap-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className="rounded-2xl border border-zinc-200 bg-white px-2 py-2 text-xs font-bold text-zinc-700"
              >
                {template.name}
              </button>
            ))}
          </div>

          <label className="block rounded-2xl border border-zinc-200 bg-white p-3 text-sm font-bold text-zinc-800">
            <span className="mb-2 flex items-center gap-2">
              <Palette size={16} />
              Fundo
            </span>
            <input
              type="color"
              value={background}
              onChange={(event) => setBackground(event.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-200"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={addText}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-3 text-sm font-bold text-white"
            >
              <Type size={16} />
              Texto
            </button>
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-800">
              <ImagePlus size={16} />
              Imagem
              <input type="file" accept="image/*" onChange={addImage} className="sr-only" />
            </label>
          </div>

          {selected ? (
            <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-3">
              <div className="text-sm font-black text-zinc-950">
                {selected.label}
              </div>

              {selected.type === "text" ? (
                <>
                  <label className="block text-xs font-bold text-zinc-500">
                    Texto
                    <textarea
                      value={selected.text || ""}
                      onChange={(event) =>
                        updateElement(selected.id, { text: event.target.value })
                      }
                      className="mt-1 min-h-20 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs font-bold text-zinc-500">
                      Cor
                      <input
                        type="color"
                        value={selected.color || "#111111"}
                        onChange={(event) =>
                          updateElement(selected.id, { color: event.target.value })
                        }
                        className="mt-1 h-9 w-full rounded-xl border border-zinc-200"
                      />
                    </label>
                    <label className="block text-xs font-bold text-zinc-500">
                      Tamanho
                      <input
                        type="number"
                        value={selected.fontSize || 24}
                        min={12}
                        max={90}
                        onChange={(event) =>
                          updateElement(selected.id, {
                            fontSize: Number(event.target.value || 24),
                          })
                        }
                        className="mt-1 h-9 w-full rounded-xl border border-zinc-200 px-2"
                      />
                    </label>
                  </div>
                </>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-bold text-zinc-500">
                  Largura
                  <input
                    type="number"
                    value={Math.round(selected.w)}
                    min={60}
                    max={ART_WIDTH}
                    onChange={(event) =>
                      updateElement(selected.id, {
                        w: clamp(Number(event.target.value || selected.w), 60, ART_WIDTH),
                      })
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-zinc-200 px-2"
                  />
                </label>
                <label className="block text-xs font-bold text-zinc-500">
                  Altura
                  <input
                    type="number"
                    value={Math.round(selected.h)}
                    min={36}
                    max={ART_HEIGHT}
                    onChange={(event) =>
                      updateElement(selected.id, {
                        h: clamp(Number(event.target.value || selected.h), 36, ART_HEIGHT),
                      })
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-zinc-200 px-2"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => selected && setCopiedElement(selected)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700"
                  title="Copiar elemento"
                >
                  <Copy size={16} />
                </button>
                <button
                  type="button"
                  onClick={copiedElement ? pasteElement : duplicateSelected}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700"
                  title={copiedElement ? "Colar elemento" : "Duplicar elemento"}
                >
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  onClick={deleteSelected}
                  disabled={selected.type === "qr"}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 text-red-600 disabled:opacity-35"
                  title="Excluir elemento"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ) : null}

          {exportError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {exportError}
            </div>
          ) : null}

          <button
            type="button"
            onClick={exportPng}
            disabled={exporting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-60"
          >
            <Download size={17} />
            {exporting ? "Gerando..." : "Baixar arte PNG"}
          </button>
        </aside>
      </div>
    </div>
  );
}
