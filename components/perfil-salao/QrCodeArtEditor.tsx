"use client";

import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  BringToFront,
  Download,
  FolderOpen,
  Grid3X3,
  Group,
  ImagePlus,
  Layers,
  Lock,
  Palette,
  Redo2,
  Save,
  Search,
  Scissors,
  Shapes,
  Trash2,
  Type,
  Undo2,
  Ungroup,
  Unlock,
  WandSparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import { asLooseSupabaseClient } from "@/lib/supabase/loose-client";

type EditorTab = "modelos" | "texto" | "fotos" | "elementos" | "uploads" | "projetos";
type FabricModule = typeof import("fabric");
type FabricCanvas = import("fabric").Canvas;
type FabricObject = import("fabric").FabricObject;

type Props = {
  open: boolean;
  onClose: () => void;
  publicUrl: string;
  qrCodeUrl: string;
  publicSlug: string;
  salaoNome: string;
  logoUrl?: string | null;
};

type StockPhoto = {
  id: string;
  alt: string;
  thumb: string;
  src: string;
  photographer?: string;
};

type EditorProject = {
  id: string;
  nome: string;
  formato: string;
  largura: number;
  altura: number;
  updated_at?: string;
  thumbnail_url?: string | null;
  payload_json?: unknown;
};

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1350;

const projectFormats = [
  { label: "Story", formato: "story", width: 1080, height: 1920 },
  { label: "Post", formato: "post", width: 1080, height: 1080 },
  { label: "Feed", formato: "feed", width: 1080, height: 1350 },
  { label: "Panfleto", formato: "panfleto", width: 1240, height: 1754 },
] as const;

const templates = [
  { label: "QR Code premium", kind: "qr" },
  { label: "Antes e depois", kind: "before-after" },
  { label: "Agenda aberta", kind: "agenda" },
  { label: "Combo de servicos", kind: "combo" },
  { label: "Depoimento", kind: "review" },
  { label: "Aviso de feriado", kind: "notice" },
  { label: "Aniversario VIP", kind: "birthday" },
  { label: "Contratando", kind: "hiring" },
] as const;

const fontOptions = [
  "Montserrat",
  "Playfair Display",
  "Cinzel",
  "Great Vibes",
  "Lato",
  "Arial",
] as const;

const photoTags = [
  { label: "Cabelo loiro", query: "blonde hair salon" },
  { label: "Unhas decoradas", query: "nail art beauty salon" },
  { label: "Maquiagem", query: "makeup beauty salon" },
  { label: "Estetica", query: "skincare facial spa" },
  { label: "Salao", query: "hair salon beauty" },
] as const;

const elementPresets = [
  { label: "Beauty", src: "/salaopremiun-editor/elementos/beauty.svg" },
  { label: "Chuveiro", src: "/salaopremiun-editor/elementos/chuveiro.svg" },
  { label: "Tesoura classica", src: "/salaopremiun-editor/elementos/scissors.svg" },
  { label: "Secador rosa", src: "/salaopremiun-editor/elementos/secador.svg" },
  { label: "Tesoura premium", src: "/salaopremiun-editor/elementos/tesoura-premium.svg" },
  { label: "Secador luxo", src: "/salaopremiun-editor/elementos/secador-luxo.svg" },
  { label: "Esmalte chic", src: "/salaopremiun-editor/elementos/esmalte-chic.svg" },
  { label: "Batom glam", src: "/salaopremiun-editor/elementos/batom-glam.svg" },
  { label: "Pente dourado", src: "/salaopremiun-editor/elementos/pente-dourado.svg" },
  { label: "Brilho premium", src: "/salaopremiun-editor/elementos/brilho-premium.svg" },
  { label: "Espelho salao", src: "/salaopremiun-editor/elementos/espelho-salao.svg" },
  { label: "Agenda aberta", src: "/salaopremiun-editor/elementos/agenda-aberta.svg" },
  { label: "Maquina de corte", src: "/salaopremiun-editor/elementos/maquina-corte.svg" },
  { label: "Cadeira salao", src: "/salaopremiun-editor/elementos/cadeira-salao-rosa.svg" },
  { label: "Spray rosa", src: "/salaopremiun-editor/elementos/spray-rosa.svg" },
  { label: "Laco rosa", src: "/salaopremiun-editor/elementos/laco-rosa.svg" },
  { label: "Rosto beleza", src: "/salaopremiun-editor/elementos/rosto-beleza.svg" },
] as const;

const tabConfig = [
  { id: "modelos", label: "Modelos", icon: WandSparkles },
  { id: "texto", label: "Texto", icon: Type },
  { id: "fotos", label: "Fotos", icon: ImagePlus },
  { id: "elementos", label: "Elementos", icon: Shapes },
  { id: "uploads", label: "Uploads", icon: ImagePlus },
  { id: "projetos", label: "Projetos", icon: FolderOpen },
] as const;

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-");
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function objectIsLocked(object: FabricObject | undefined) {
  return Boolean(
    object &&
      (object.lockMovementX ||
        object.lockMovementY ||
        object.lockScalingX ||
        object.lockScalingY ||
        object.lockRotation)
  );
}

function objectLabel(object: FabricObject | null) {
  if (!object) return "";
  const named = object as FabricObject & { name?: string };
  return named.name || object.type || "Elemento";
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
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<FabricCanvas | null>(null);
  const fabricRef = useRef<FabricModule | null>(null);
  const clipboardRef = useRef<FabricObject | null>(null);
  const historyRef = useRef<string[]>([]);
  const futureRef = useRef<string[]>([]);
  const loadingJsonRef = useRef(false);

  const [activeTab, setActiveTab] = useState<EditorTab>("modelos");
  const [selected, setSelected] = useState<FabricObject | null>(null);
  const [projectName, setProjectName] = useState("Arte sem titulo");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [format, setFormat] = useState("feed");
  const [artSize, setArtSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [zoom, setZoom] = useState(0.48);
  const [showGrid, setShowGrid] = useState(true);
  const [photoQuery, setPhotoQuery] = useState("cabelo salao");
  const [stockPhotos, setStockPhotos] = useState<StockPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState("");
  const [projects, setProjects] = useState<EditorProject[]>([]);
  const [status, setStatus] = useState("");

  const selectedLocked = useMemo(() => objectIsLocked(selected || undefined), [selected]);

  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || loadingJsonRef.current) return;
    const json = JSON.stringify(canvas.toJSON());
    const current = historyRef.current[historyRef.current.length - 1];
    if (current === json) return;
    historyRef.current = [...historyRef.current.slice(-39), json];
    futureRef.current = [];
  }, []);

  const fitZoom = useCallback((width: number, height: number) => {
    const availableW = window.innerWidth > 1200 ? window.innerWidth - 720 : window.innerWidth - 80;
    const availableH = window.innerHeight - 190;
    return Math.max(0.18, Math.min(0.72, availableW / width, availableH / height));
  }, []);

  const addImageFromUrl = useCallback(
    async (src: string, label = "Imagem", targetWidth = 360) => {
      const fabric = fabricRef.current;
      const canvas = canvasRef.current;
      if (!fabric || !canvas) return;
      const image = await fabric.FabricImage.fromURL(src, { crossOrigin: "anonymous" });
      image.set({
        left: artSize.width / 2 - targetWidth / 2,
        top: artSize.height / 2 - targetWidth / 2,
        name: label,
        cornerStyle: "circle",
        transparentCorners: false,
      });
      image.scaleToWidth(targetWidth);
      canvas.add(image);
      canvas.setActiveObject(image);
      canvas.requestRenderAll();
      pushHistory();
    },
    [artSize.height, artSize.width, pushHistory]
  );

  const buildBaseTemplate = useCallback(
    async (width = artSize.width, height = artSize.height) => {
      const fabric = fabricRef.current;
      const canvas = canvasRef.current;
      if (!fabric || !canvas) return;
      loadingJsonRef.current = true;
      canvas.clear();
      canvas.backgroundColor = "#fff8e7";

      const frame = new fabric.Rect({
        left: width * 0.06,
        top: height * 0.05,
        width: width * 0.88,
        height: height * 0.9,
        fill: "transparent",
        stroke: "#d8b36b",
        strokeWidth: 5,
        rx: 28,
        ry: 28,
        selectable: false,
        evented: false,
        name: "Moldura",
      });
      canvas.add(frame);

      if (logoUrl) {
        const logo = await fabric.FabricImage.fromURL(logoUrl, { crossOrigin: "anonymous" });
        logo.set({ left: width / 2 - 70, top: height * 0.08, name: "Logo" });
        logo.scaleToWidth(140);
        canvas.add(logo);
      }

      canvas.add(
        new fabric.IText((salaoNome || "SalaoPremiun").toUpperCase(), {
          left: width * 0.12,
          top: logoUrl ? height * 0.19 : height * 0.1,
          width: width * 0.76,
          fontFamily: "Montserrat",
          fontSize: 58,
          fontWeight: "900",
          fill: "#111111",
          textAlign: "center",
          name: "Titulo",
        })
      );
      canvas.add(
        new fabric.IText("Agende seu horario pelo app", {
          left: width * 0.18,
          top: logoUrl ? height * 0.27 : height * 0.18,
          width: width * 0.64,
          fontFamily: "Lato",
          fontSize: 34,
          fontWeight: "700",
          fill: "#5f5a4f",
          textAlign: "center",
          name: "Chamada",
        })
      );

      const qr = await fabric.FabricImage.fromURL(qrCodeUrl, { crossOrigin: "anonymous" });
      qr.set({ left: width / 2 - 190, top: height * 0.43, name: "QR Code" });
      qr.scaleToWidth(380);
      canvas.add(qr);

      canvas.add(
        new fabric.IText(publicUrl, {
          left: width * 0.13,
          top: height * 0.79,
          width: width * 0.74,
          fontFamily: "Montserrat",
          fontSize: 24,
          fontWeight: "800",
          fill: "#111111",
          textAlign: "center",
          name: "Link",
        })
      );

      canvas.requestRenderAll();
      loadingJsonRef.current = false;
      historyRef.current = [JSON.stringify(canvas.toJSON())];
      futureRef.current = [];
    },
    [artSize.height, artSize.width, logoUrl, publicUrl, qrCodeUrl, salaoNome]
  );

  const resizeProject = useCallback(
    async (width: number, height: number, nextFormat: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setArtSize({ width, height });
      setFormat(nextFormat);
      const nextZoom = fitZoom(width, height);
      setZoom(nextZoom);
      canvas.setDimensions({ width, height });
      canvas.setZoom(nextZoom);
      await buildBaseTemplate(width, height);
    },
    [buildBaseTemplate, fitZoom]
  );

  useEffect(() => {
    if (!open || !canvasElRef.current || canvasRef.current) return;
    let cancelled = false;

    async function init() {
      const fabric = await import("fabric");
      if (cancelled || !canvasElRef.current) return;
      fabricRef.current = fabric;
      const nextZoom = fitZoom(DEFAULT_WIDTH, DEFAULT_HEIGHT);
      setZoom(nextZoom);
      const canvas = new fabric.Canvas(canvasElRef.current, {
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        backgroundColor: "#fff8e7",
        preserveObjectStacking: true,
        selection: true,
      });
      canvas.setZoom(nextZoom);
      canvasRef.current = canvas;

      fabric.FabricObject.ownDefaults.borderColor = "#d8b36b";
      fabric.FabricObject.ownDefaults.cornerColor = "#111111";
      fabric.FabricObject.ownDefaults.cornerStrokeColor = "#ffffff";
      fabric.FabricObject.ownDefaults.cornerStyle = "circle";
      fabric.FabricObject.ownDefaults.transparentCorners = false;

      canvas.on("selection:created", () => setSelected(canvas.getActiveObject() || null));
      canvas.on("selection:updated", () => setSelected(canvas.getActiveObject() || null));
      canvas.on("selection:cleared", () => setSelected(null));
      canvas.on("object:modified", pushHistory);
      canvas.on("object:added", pushHistory);
      canvas.on("object:removed", pushHistory);
      await buildBaseTemplate(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    }

    init();

    return () => {
      cancelled = true;
      canvasRef.current?.dispose();
      canvasRef.current = null;
    };
  }, [buildBaseTemplate, fitZoom, open, pushHistory]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (typing) return;

      if ((event.key === "Delete" || event.key === "Backspace") && active) {
        event.preventDefault();
        canvas.getActiveObjects().forEach((object) => canvas.remove(object));
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        pushHistory();
      }

      if (event.ctrlKey && event.key.toLowerCase() === "c" && active) {
        event.preventDefault();
        active.clone().then((cloned) => {
          clipboardRef.current = cloned as FabricObject;
        });
      }

      if (event.ctrlKey && event.key.toLowerCase() === "v" && clipboardRef.current) {
        event.preventDefault();
        clipboardRef.current.clone().then((cloned) => {
          const object = cloned as FabricObject;
          object.set({
            left: (object.left || 0) + 28,
            top: (object.top || 0) + 28,
            evented: true,
          });
          canvas.add(object);
          canvas.setActiveObject(object);
          canvas.requestRenderAll();
          pushHistory();
        });
      }

      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }

      if (event.ctrlKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function undo() {
    const canvas = canvasRef.current;
    const current = historyRef.current.pop();
    const previous = historyRef.current[historyRef.current.length - 1];
    if (!canvas || !current || !previous) return;
    futureRef.current = [current, ...futureRef.current];
    loadingJsonRef.current = true;
    canvas.loadFromJSON(previous).then(() => {
      canvas.requestRenderAll();
      loadingJsonRef.current = false;
    });
  }

  function redo() {
    const canvas = canvasRef.current;
    const next = futureRef.current.shift();
    if (!canvas || !next) return;
    historyRef.current.push(next);
    loadingJsonRef.current = true;
    canvas.loadFromJSON(next).then(() => {
      canvas.requestRenderAll();
      loadingJsonRef.current = false;
    });
  }

  function addText(kind: "title" | "subtitle" = "title") {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;
    const object = new fabric.IText(kind === "title" ? "NOVO TITULO" : "Escreva sua chamada", {
      left: artSize.width * 0.22,
      top: artSize.height * 0.28,
      width: artSize.width * 0.56,
      fontFamily: kind === "title" ? "Montserrat" : "Lato",
      fontSize: kind === "title" ? 58 : 36,
      fontWeight: kind === "title" ? "900" : "700",
      fill: kind === "title" ? "#111111" : "#5f5a4f",
      textAlign: "center",
      name: kind === "title" ? "Titulo" : "Texto",
    });
    canvas.add(object);
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    pushHistory();
  }

  function addShape(kind: "rect" | "circle" | "line") {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;
    const object =
      kind === "circle"
        ? new fabric.Circle({
            left: artSize.width / 2 - 90,
            top: artSize.height / 2 - 90,
            radius: 90,
            fill: "#d8b36b",
            name: "Circulo",
          })
        : kind === "line"
          ? new fabric.Line([0, 0, 280, 0], {
              left: artSize.width / 2 - 140,
              top: artSize.height / 2,
              stroke: "#111111",
              strokeWidth: 8,
              name: "Linha",
            })
          : new fabric.Rect({
              left: artSize.width / 2 - 120,
              top: artSize.height / 2 - 70,
              width: 240,
              height: 140,
              rx: 24,
              ry: 24,
              fill: "#fff8e7",
              stroke: "#d8b36b",
              strokeWidth: 4,
              name: "Forma",
            });
    canvas.add(object);
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    pushHistory();
  }

  async function addUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await addImageFromUrl(String(reader.result || ""), file.name || "Upload", 420);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function searchPhotos(query = photoQuery) {
    const normalized = query.trim();
    if (!normalized) return;
    setPhotosLoading(true);
    setPhotosError("");
    try {
      const response = await fetch(
        `/api/painel/editor/pexels?query=${encodeURIComponent(normalized)}`
      );
      const result = (await response.json()) as { photos?: StockPhoto[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Erro ao buscar fotos.");
      setStockPhotos(result.photos || []);
    } catch (error) {
      setPhotosError(
        error instanceof Error ? error.message : "Nao foi possivel buscar fotos agora."
      );
    } finally {
      setPhotosLoading(false);
    }
  }

  function addTemplate(kind: string) {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;
    if (kind === "qr") {
      buildBaseTemplate();
      return;
    }

    const centerX = artSize.width / 2;
    const baseTop = artSize.height * 0.33;
    const card = new fabric.Rect({
      left: centerX - 360,
      top: baseTop,
      width: 720,
      height: kind === "before-after" ? 520 : 360,
      fill: kind === "agenda" ? "#111111" : "#ffffff",
      stroke: "#d8b36b",
      strokeWidth: 5,
      rx: 34,
      ry: 34,
      name: "Card template",
    });
    canvas.add(card);

    const titleByKind: Record<string, string> = {
      "before-after": "ANTES E DEPOIS",
      agenda: "AGENDA ABERTA",
      combo: "COMBOS DA SEMANA",
      review: "DEPOIMENTO DA CLIENTE",
      notice: "AVISO IMPORTANTE",
      birthday: "CLIENTE VIP DO MES",
      hiring: "ESTAMOS CONTRATANDO",
    };
    canvas.add(
      new fabric.IText(titleByKind[kind] || "NOVO TEMPLATE", {
        left: centerX - 300,
        top: baseTop + 42,
        width: 600,
        fontFamily: "Montserrat",
        fontSize: 42,
        fontWeight: "900",
        fill: kind === "agenda" ? "#d8b36b" : "#111111",
        textAlign: "center",
        name: "Titulo template",
      })
    );

    if (kind === "before-after") {
      canvas.add(
        new fabric.Rect({
          left: centerX - 315,
          top: baseTop + 130,
          width: 285,
          height: 300,
          fill: "#f4f0e8",
          stroke: "#d8b36b",
          strokeWidth: 3,
          rx: 20,
          ry: 20,
          name: "Slot antes",
        })
      );
      canvas.add(
        new fabric.Rect({
          left: centerX + 30,
          top: baseTop + 130,
          width: 285,
          height: 300,
          fill: "#f4f0e8",
          stroke: "#111111",
          strokeWidth: 3,
          rx: 20,
          ry: 20,
          name: "Slot depois",
        })
      );
    } else {
      canvas.add(
        new fabric.IText(
          kind === "combo"
            ? "Corte + Escova .... R$ 150\nProgressiva ....... R$ 220\nManicure + Pedicure .... R$ 80"
            : kind === "agenda"
              ? "SEG 14:00  16:30\nTER 09:00  11:00\nQUA 15:00  17:00"
              : "Edite este texto com a mensagem do seu salao.",
          {
            left: centerX - 280,
            top: baseTop + 135,
            width: 560,
            fontFamily: "Lato",
            fontSize: 34,
            fontWeight: "700",
            fill: kind === "agenda" ? "#ffffff" : "#5f5a4f",
            textAlign: kind === "combo" || kind === "agenda" ? "left" : "center",
            name: "Texto template",
          }
        )
      );
    }
    canvas.requestRenderAll();
    pushHistory();
  }

  function applySelected(patch: Partial<{
    fill: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    charSpacing: number;
    stroke: string;
    strokeWidth: number;
    shadow: string | null;
  }>) {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    active.set(patch);
    canvas.requestRenderAll();
    pushHistory();
    setSelected(active);
  }

  function selectedTextValue(key: "fontSize" | "fontFamily" | "fill") {
    const value = selected?.get(key);
    return typeof value === "string" || typeof value === "number" ? value : "";
  }

  function lockSelected(locked: boolean) {
    const canvas = canvasRef.current;
    const objects = canvas?.getActiveObjects() || [];
    for (const object of objects) {
      object.set({
        lockMovementX: locked,
        lockMovementY: locked,
        lockScalingX: locked,
        lockScalingY: locked,
        lockRotation: locked,
        hasControls: !locked,
      });
    }
    canvas?.requestRenderAll();
    setSelected(canvas?.getActiveObject() || null);
    pushHistory();
  }

  function groupSelected() {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    const objects = canvas?.getActiveObjects() || [];
    if (!fabric || !canvas || objects.length < 2) return;
    const group = new fabric.Group(objects);
    objects.forEach((object) => canvas.remove(object));
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
    pushHistory();
  }

  function ungroupSelected() {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || active.type !== "group") return;
    const group = active as import("fabric").Group;
    const objects = group.removeAll();
    canvas.remove(group);
    objects.forEach((object) => canvas.add(object));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    pushHistory();
  }

  function alignSelected(type: "h" | "v") {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    if (type === "h") active.set({ left: artSize.width / 2 - active.getScaledWidth() / 2 });
    if (type === "v") active.set({ top: artSize.height / 2 - active.getScaledHeight() / 2 });
    active.setCoords();
    canvas.requestRenderAll();
    pushHistory();
  }

  function changeZoom(next: number) {
    const canvas = canvasRef.current;
    const value = Math.max(0.12, Math.min(1.4, next));
    setZoom(value);
    canvas?.setZoom(value);
    canvas?.requestRenderAll();
  }

  function moveLayer(direction: "front" | "back") {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    if (direction === "front") canvas.bringObjectToFront(active);
    if (direction === "back") canvas.sendObjectToBack(active);
    canvas.requestRenderAll();
    pushHistory();
  }

  function exportImage(formatType: "png" | "jpeg") {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    const dataUrl = canvas.toDataURL({
      format: formatType,
      quality: 1,
      multiplier: 2 / zoom,
    });
    downloadDataUrl(dataUrl, `${safeFileName(projectName || publicSlug)}.${formatType === "jpeg" ? "jpg" : "png"}`);
  }

  async function exportPdf() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { jsPDF } = await import("jspdf");
    const dataUrl = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 / zoom });
    const pdf = new jsPDF({
      orientation: artSize.width > artSize.height ? "landscape" : "portrait",
      unit: "px",
      format: [artSize.width, artSize.height],
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, artSize.width, artSize.height);
    pdf.save(`${safeFileName(projectName || publicSlug)}.pdf`);
  }

  async function loadProjects() {
    const session = await getUsuarioLogado();
    if (!session.ok || !session.idSalao) return;
    const supabase = asLooseSupabaseClient(session.supabase);
    const { data, error } = await supabase
      .from("editor_projetos")
      .select("id, nome, formato, largura, altura, updated_at, thumbnail_url, payload_json")
      .eq("id_salao", session.idSalao)
      .eq("status", "ativo")
      .order("updated_at", { ascending: false })
      .limit(20);
    if (error) {
      setStatus("Ainda nao foi possivel carregar projetos. A migration precisa estar aplicada no Supabase.");
      return;
    }
    setProjects((data || []) as EditorProject[]);
  }

  async function saveProject() {
    const canvas = canvasRef.current;
    const session = await getUsuarioLogado();
    if (!canvas || !session.ok || !session.idSalao) return;
    const supabase = asLooseSupabaseClient(session.supabase);
    const payload = canvas.toJSON();
    const thumbnail = canvas.toDataURL({ format: "png", quality: 0.8, multiplier: 0.25 / zoom });
    const row = {
      id_salao: session.idSalao,
      id_usuario: session.perfil?.id || null,
      nome: projectName || "Arte sem titulo",
      formato: format,
      largura: artSize.width,
      altura: artSize.height,
      thumbnail_url: thumbnail,
      payload_json: payload,
      updated_at: new Date().toISOString(),
    };
    const query = projectId
      ? supabase.from("editor_projetos").update(row).eq("id", projectId).select("id").single<{ id: string }>()
      : supabase.from("editor_projetos").insert(row).select("id").single<{ id: string }>();
    const { data, error } = await query;
    if (error || !data?.id) {
      setStatus("Nao salvou no banco. Verifique se a migration do editor foi aplicada.");
      return;
    }
    setProjectId(data.id);
    setStatus("Projeto salvo.");
    await loadProjects();
  }

  async function openProject(project: EditorProject) {
    const canvas = canvasRef.current;
    if (!canvas || !project.payload_json) return;
    loadingJsonRef.current = true;
    setProjectId(project.id);
    setProjectName(project.nome);
    setFormat(project.formato);
    setArtSize({ width: project.largura, height: project.altura });
    const nextZoom = fitZoom(project.largura, project.altura);
    setZoom(nextZoom);
    canvas.setDimensions({ width: project.largura, height: project.altura });
    canvas.setZoom(nextZoom);
    await canvas.loadFromJSON(project.payload_json);
    canvas.requestRenderAll();
    loadingJsonRef.current = false;
    historyRef.current = [JSON.stringify(canvas.toJSON())];
    futureRef.current = [];
  }

  async function duplicateProject(project: EditorProject) {
    await openProject(project);
    setProjectId(null);
    setProjectName(`${project.nome} copia`);
    setStatus("Projeto duplicado. Clique em salvar para gravar a copia.");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden bg-[#f4f0e8]">
      <div className="flex h-dvh flex-col bg-[#f7f4ed] text-zinc-950">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={salaoNome} className="h-11 w-11 rounded-xl border border-[#d8b36b]/40 bg-white object-contain p-1" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#111111] text-[#d8b36b]">
                <Scissors size={21} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 text-lg font-black leading-none">
                SalãoPremiun Editor
                <span className="rounded-full bg-[#d8b36b]/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#8a5a12]">
                  Beta
                </span>
              </div>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                className="mt-1 w-72 rounded-lg border border-transparent bg-transparent text-xs font-semibold text-zinc-500 outline-none focus:border-zinc-200 focus:bg-zinc-50"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <HeaderButton label="Salvar" onClick={saveProject}><Save size={16} /></HeaderButton>
            <HeaderButton label="Desfazer" onClick={undo}><Undo2 size={16} /></HeaderButton>
            <HeaderButton label="Refazer" onClick={redo}><Redo2 size={16} /></HeaderButton>
            <HeaderButton label="PNG" onClick={() => exportImage("png")}><Download size={16} /></HeaderButton>
            <HeaderButton label="JPG" onClick={() => exportImage("jpeg")}><Download size={16} /></HeaderButton>
            <HeaderButton label="PDF" onClick={exportPdf}><Download size={16} /></HeaderButton>
            <button type="button" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50" aria-label="Fechar editor">
              <X size={19} />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)_330px]">
          <aside className="min-h-0 overflow-y-auto border-r border-zinc-200 bg-white p-4">
            <div className="mb-4 grid grid-cols-6 gap-1 rounded-2xl bg-zinc-100 p-1">
              {tabConfig.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} type="button" onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === "projetos") loadProjects();
                  }} className={`flex h-12 flex-col items-center justify-center rounded-xl text-[9px] font-black transition ${activeTab === tab.id ? "bg-white text-[#8a5a12] shadow-sm" : "text-zinc-500 hover:bg-white/70"}`}>
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === "modelos" ? (
              <Panel title="Novo projeto" icon={<Layers size={15} />}>
                <div className="grid grid-cols-2 gap-2">
                  {projectFormats.map((item) => (
                    <button key={item.formato} type="button" onClick={() => resizeProject(item.width, item.height, item.formato)} className="rounded-xl border border-zinc-200 bg-[#fff8e7] px-3 py-2 text-left text-xs font-black text-zinc-800 transition hover:border-[#d8b36b]">
                      {item.label}<br /><span className="text-[10px] text-zinc-500">{item.width}x{item.height}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {templates.map((item) => (
                    <button key={item.kind} type="button" onClick={() => addTemplate(item.kind)} className="rounded-xl border border-zinc-200 bg-white p-3 text-left text-xs font-black text-zinc-800 shadow-sm transition hover:border-[#d8b36b]">
                      {item.label}
                    </button>
                  ))}
                </div>
              </Panel>
            ) : null}

            {activeTab === "texto" ? (
              <Panel title="Texto avancado" icon={<Type size={15} />}>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => addText("title")} className="h-10 rounded-xl bg-zinc-950 text-xs font-black text-white">Titulo</button>
                  <button type="button" onClick={() => addText("subtitle")} className="h-10 rounded-xl border border-zinc-200 bg-white text-xs font-black">Subtitulo</button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => addShape("rect")} className="rounded-xl border p-2 text-xs font-bold">Forma</button>
                  <button type="button" onClick={() => addShape("circle")} className="rounded-xl border p-2 text-xs font-bold">Circulo</button>
                  <button type="button" onClick={() => addShape("line")} className="rounded-xl border p-2 text-xs font-bold">Linha</button>
                </div>
              </Panel>
            ) : null}

            {activeTab === "fotos" ? (
              <Panel title="Fotos profissionais" icon={<ImagePlus size={15} />}>
                <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); searchPhotos(); }}>
                  <input value={photoQuery} onChange={(event) => setPhotoQuery(event.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-[#d8b36b]" />
                  <button type="submit" className="h-10 w-10 rounded-xl bg-zinc-950 text-white"><Search className="mx-auto" size={16} /></button>
                </form>
                <div className="mt-3 flex flex-wrap gap-2">
                  {photoTags.map((tag) => (
                    <button key={tag.query} type="button" onClick={() => { setPhotoQuery(tag.label); searchPhotos(tag.query); }} className="rounded-full border border-zinc-200 bg-[#fff8e7] px-3 py-1.5 text-[11px] font-black text-[#8a5a12]">
                      {tag.label}
                    </button>
                  ))}
                </div>
                {photosError ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">{photosError}</div> : null}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {photosLoading ? <div className="col-span-2 rounded-xl bg-zinc-100 p-4 text-center text-xs font-bold text-zinc-500">Buscando fotos...</div> : null}
                  {stockPhotos.map((photo) => (
                    <button key={photo.id} type="button" onClick={() => addImageFromUrl(photo.src, photo.alt || "Foto", 520)} className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 text-left" title={photo.photographer || photo.alt}>
                      <img src={photo.thumb} alt={photo.alt || "Foto"} className="h-28 w-full object-cover" draggable={false} />
                    </button>
                  ))}
                </div>
              </Panel>
            ) : null}

            {activeTab === "elementos" ? (
              <Panel title="Elementos do salao" icon={<Shapes size={15} />}>
                <div className="grid grid-cols-2 gap-2">
                  {elementPresets.map((preset) => (
                    <button key={preset.src} type="button" onClick={() => addImageFromUrl(preset.src, preset.label, 240)} className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-xs font-black text-zinc-800 shadow-sm transition hover:border-[#d8b36b]">
                      <img src={preset.src} alt={preset.label} className="h-14 w-14 object-contain" draggable={false} />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </Panel>
            ) : null}

            {activeTab === "uploads" ? (
              <Panel title="Uploads" icon={<ImagePlus size={15} />}>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center transition hover:border-[#d8b36b] hover:bg-[#fff8e7]">
                  <ImagePlus size={24} className="text-[#d8b36b]" />
                  <span className="mt-2 text-xs font-black">Adicionar imagem</span>
                  <span className="mt-1 text-[11px] text-zinc-500">Foto, logo extra ou fundo decorativo</span>
                  <input type="file" accept="image/*" onChange={addUpload} className="sr-only" />
                </label>
              </Panel>
            ) : null}

            {activeTab === "projetos" ? (
              <Panel title="Projetos salvos" icon={<FolderOpen size={15} />}>
                <button type="button" onClick={loadProjects} className="mb-3 h-10 w-full rounded-xl bg-zinc-950 text-xs font-black text-white">Atualizar lista</button>
                <div className="space-y-2">
                  {projects.map((project) => (
                    <div key={project.id} className="rounded-xl border border-zinc-200 bg-white p-2">
                      {project.thumbnail_url ? <img src={project.thumbnail_url} alt={project.nome} className="mb-2 h-24 w-full rounded-lg object-cover" /> : null}
                      <div className="text-xs font-black">{project.nome}</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => openProject(project)} className="rounded-lg border px-2 py-1 text-xs font-bold">Abrir</button>
                        <button type="button" onClick={() => duplicateProject(project)} className="rounded-lg border px-2 py-1 text-xs font-bold">Duplicar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}

            {status ? <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs font-semibold text-zinc-600">{status}</div> : null}
          </aside>

          <main className="relative flex min-h-0 flex-col items-center justify-center overflow-auto bg-[#efebe3] p-4 lg:p-8">
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2">
              <ToolButton label="Zoom -" onClick={() => changeZoom(zoom - 0.08)}><ZoomOut size={15} /></ToolButton>
              <span className="px-2 text-xs font-black">{Math.round(zoom * 100)}%</span>
              <ToolButton label="Zoom +" onClick={() => changeZoom(zoom + 0.08)}><ZoomIn size={15} /></ToolButton>
              <ToolButton label="Grade" onClick={() => setShowGrid((value) => !value)}><Grid3X3 size={15} /></ToolButton>
              <ToolButton label="Centro H" onClick={() => alignSelected("h")}><AlignHorizontalJustifyCenter size={15} /></ToolButton>
              <ToolButton label="Centro V" onClick={() => alignSelected("v")}><AlignVerticalJustifyCenter size={15} /></ToolButton>
              <ToolButton label="Frente" onClick={() => moveLayer("front")}><BringToFront size={15} /></ToolButton>
              <ToolButton label="Atras" onClick={() => moveLayer("back")}><Layers size={15} /></ToolButton>
              <ToolButton label="Agrupar" onClick={groupSelected}><Group size={15} /></ToolButton>
              <ToolButton label="Desagrupar" onClick={ungroupSelected}><Ungroup size={15} /></ToolButton>
              <ToolButton label={selectedLocked ? "Destravar" : "Travar"} onClick={() => lockSelected(!selectedLocked)}>{selectedLocked ? <Unlock size={15} /> : <Lock size={15} />}</ToolButton>
            </div>
            <div className="overflow-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-2xl shadow-black/10">
              <div
                className={showGrid ? "bg-[linear-gradient(rgba(0,0,0,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.045)_1px,transparent_1px)] bg-[size:32px_32px]" : ""}
                style={{ width: artSize.width * zoom, height: artSize.height * zoom }}
              >
                <canvas ref={canvasElRef} />
              </div>
            </div>
          </main>

          <aside className="min-h-0 overflow-y-auto border-l border-zinc-200 bg-white p-4">
            <Panel title="Elemento selecionado" icon={<Palette size={15} />}>
              {selected ? (
                <div className="space-y-3">
                  <div className="text-sm font-black">{objectLabel(selected)}</div>
                  <label className="block text-xs font-black text-zinc-500">Cor
                    <input type="color" value={String(selectedTextValue("fill") || "#111111")} onChange={(event) => applySelected({ fill: event.target.value })} className="mt-1 h-10 w-full rounded-xl border" />
                  </label>
                  <label className="block text-xs font-black text-zinc-500">Fonte
                    <select value={String(selectedTextValue("fontFamily") || "Montserrat")} onChange={(event) => applySelected({ fontFamily: event.target.value })} className="mt-1 h-10 w-full rounded-xl border px-3">
                      {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-black text-zinc-500">Tamanho
                    <input type="number" min={8} max={220} value={Number(selectedTextValue("fontSize") || 32)} onChange={(event) => applySelected({ fontSize: Number(event.target.value || 32) })} className="mt-1 h-10 w-full rounded-xl border px-3" />
                  </label>
                  <label className="block text-xs font-black text-zinc-500">Espacamento letras
                    <input type="range" min={0} max={600} step={10} onChange={(event) => applySelected({ charSpacing: Number(event.target.value) })} className="mt-1 w-full" />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => applySelected({ fontWeight: "900" })} className="h-10 rounded-xl border text-xs font-black">Negrito</button>
                    <button type="button" onClick={() => applySelected({ shadow: "0px 8px 14px rgba(0,0,0,0.25)" })} className="h-10 rounded-xl border text-xs font-black">Sombra</button>
                    <button type="button" onClick={() => applySelected({ stroke: "#ffffff", strokeWidth: 2 })} className="h-10 rounded-xl border text-xs font-black">Contorno</button>
                    <button type="button" onClick={() => applySelected({ shadow: null, strokeWidth: 0 })} className="h-10 rounded-xl border text-xs font-black">Limpar</button>
                  </div>
                  <button type="button" onClick={() => {
                    const canvas = canvasRef.current;
                    canvas?.getActiveObjects().forEach((object) => canvas.remove(object));
                    canvas?.discardActiveObject();
                    canvas?.requestRenderAll();
                    pushHistory();
                  }} className="h-10 w-full rounded-xl border border-rose-200 text-xs font-black text-rose-600">
                    <Trash2 className="mr-2 inline" size={14} /> Apagar
                  </button>
                </div>
              ) : (
                <p className="text-sm font-semibold text-zinc-500">Selecione um item para editar cor, fonte, tamanho, sombra, contorno e camadas.</p>
              )}
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
        <span className="text-[#d8b36b]">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function HeaderButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-black text-zinc-800 transition hover:bg-zinc-50">
      {children}
      {label}
    </button>
  );
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={label} className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-2 text-xs font-black text-zinc-700 transition hover:bg-zinc-50">
      {children}
    </button>
  );
}
