"use client";

import {
  AlignHorizontalJustifyCenter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  ArrowRight,
  BringToFront,
  Circle,
  Download,
  Eye,
  EyeOff,
  FolderOpen,
  Grid3X3,
  Group,
  ImagePlus,
  Italic,
  Layers,
  Lock,
  Palette,
  PenLine,
  Redo2,
  Save,
  Search,
  Scissors,
  Shapes,
  Star,
  Heart,
  Trash2,
  Type,
  Underline,
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

type EditorTab = "modelos" | "texto" | "fotos" | "formas" | "elementos" | "uploads" | "projetos";
type RightPanelMode = "none" | "inspector" | "layers";
type FabricModule = typeof import("fabric");
type FabricCanvas = import("fabric").Canvas;
type FabricObject = import("fabric").FabricObject;
type FrameObject = FabricObject & { data?: { isFrame?: boolean; frameShape?: string } };

type Props = {
  open: boolean;
  onClose: () => void;
  publicUrl: string;
  qrCodeUrl: string;
  publicSlug: string;
  salaoNome: string;
  logoUrl?: string | null;
  initialProjectSlug?: string | null;
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

type TemplatePreset = {
  label: string;
  kind: string;
  description: string;
};

type UploadedAsset = {
  id: string;
  name: string;
  src: string;
};

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1350;
const LOCAL_PROJECTS_KEY = "salaopremiun-editor:dev-projects";

const projectFormats = [
  { label: "Story", formato: "story", width: 1080, height: 1920 },
  { label: "Post", formato: "post", width: 1080, height: 1080 },
  { label: "Feed", formato: "feed", width: 1080, height: 1350 },
  { label: "Panfleto", formato: "panfleto", width: 1240, height: 1754 },
] as const;

const templates: TemplatePreset[] = [
  { label: "QR Code premium", kind: "qr", description: "Arte limpa para levar clientes ao app" },
  { label: "Campanha premium", kind: "top-campaign", description: "Post forte para vender servicos de beleza" },
  { label: "Promo luxo", kind: "promo-luxo", description: "Oferta com preco grande e chamada direta" },
  { label: "Agenda glam", kind: "agenda-glam", description: "Horarios disponiveis com visual premium" },
  { label: "Antes e depois", kind: "before-after", description: "Dois slots para fotos de transformacao" },
  { label: "Agenda aberta", kind: "agenda", description: "Lista de horarios da semana" },
  { label: "Combo de servicos", kind: "combo", description: "Servicos e precos em formato de card" },
  { label: "Depoimento", kind: "review", description: "Mensagem de cliente estilo prova social" },
  { label: "Avaliacao 5 estrelas", kind: "stars-review", description: "Post para elogios e reputacao" },
  { label: "Aviso de feriado", kind: "notice", description: "Comunicado elegante para redes sociais" },
  { label: "Contratando", kind: "hiring", description: "Vaga aberta para profissional do salao" },
  { label: "Cartao fidelidade", kind: "loyalty", description: "Modelo com selos de visitas" },
  { label: "Ultimos horarios", kind: "free-time", description: "Story para preencher agenda do dia" },
  { label: "Cliente do mes", kind: "client-month", description: "Post de relacionamento e carinho" },
  { label: "Menu de precos", kind: "price-menu", description: "Tabela visual para servicos principais" },
  { label: "Cupom relampago", kind: "flash-coupon", description: "Promocao rapida com selo de desconto" },
  { label: "Frase beleza", kind: "quote", description: "Conteudo leve para engajamento" },
  { label: "Story premium", kind: "story-premium", description: "Story com composicao editorial" },
];

const startCards = [
  { label: "Comecar em branco", kind: "blank", description: "Tela livre para criar do zero" },
  { label: "QR Code de agendamento", kind: "qr", description: "Leve o cliente direto para reserva" },
  { label: "Campanha premium", kind: "top-campaign", description: "Arte forte com cara de marketing" },
  { label: "Promocao da semana", kind: "promo-luxo", description: "Oferta bonita para vender hoje" },
  { label: "Agenda aberta", kind: "agenda-glam", description: "Mostre horarios livres" },
  { label: "Antes e depois", kind: "before-after", description: "Mostre resultado com duas fotos" },
  { label: "Combo de servicos", kind: "combo", description: "Monte pacote e preco" },
] as const;

const quickCreateCards = [
  { label: "Story", description: "1080x1920", color: "#111111", format: projectFormats[0] },
  { label: "Post Instagram", description: "1080x1080", color: "#d8b36b", format: projectFormats[1] },
  { label: "Feed vertical", description: "1080x1350", color: "#f2efe8", format: projectFormats[2] },
  { label: "Panfleto", description: "1240x1754", color: "#ffffff", format: projectFormats[3] },
] as const;

const textPresets = [
  { label: "Titulo luxo", text: "BELEZA PREMIUM", fontFamily: "Playfair Display", fontSize: 76, fontWeight: "900", fill: "#111111" },
  { label: "Assinatura elegante", text: "Studio Maos de Fadas", fontFamily: "Great Vibes", fontSize: 72, fontWeight: "400", fill: "#d8b36b" },
  { label: "Oferta forte", text: "PROMO DA SEMANA", fontFamily: "Montserrat", fontSize: 58, fontWeight: "900", fill: "#111111", charSpacing: 80 },
  { label: "Preco grande", text: "R$ 150", fontFamily: "Playfair Display", fontSize: 96, fontWeight: "900", fill: "#111111" },
  { label: "Chamada botao", text: "AGENDE PELO APP", fontFamily: "Montserrat", fontSize: 34, fontWeight: "900", fill: "#111111", backgroundColor: "#d8b36b" },
  { label: "Depoimento", text: "\"Resultado impecavel!\"", fontFamily: "Playfair Display", fontSize: 42, fontWeight: "700", fill: "#3d372f" },
] as const;

const framePresets = [
  { label: "Foto arredondada", kind: "rounded", ratio: "4/5" },
  { label: "Circulo", kind: "circle", ratio: "1/1" },
  { label: "Antes e depois", kind: "before-after", ratio: "2 slots" },
  { label: "Celular", kind: "phone", ratio: "mockup" },
  { label: "Notebook", kind: "laptop", ratio: "mockup" },
  { label: "Grade 2 fotos", kind: "grid-2", ratio: "grid" },
] as const;

const elementCategories = [
  "Tudo",
  "Cabelo",
  "Unhas",
  "Maquiagem",
  "Estetica",
  "Agenda",
  "Promocao",
  "Luxo",
  "Redes sociais",
  "QR Code",
  "Avaliacao",
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
  { label: "Beauty", src: "/salaopremiun-editor/elementos/beauty.svg", category: "Estetica" },
  { label: "Chuveiro", src: "/salaopremiun-editor/elementos/chuveiro.svg", category: "Cabelo" },
  { label: "Tesoura classica", src: "/salaopremiun-editor/elementos/scissors.svg", category: "Cabelo" },
  { label: "Secador rosa", src: "/salaopremiun-editor/elementos/secador.svg", category: "Cabelo" },
  { label: "Tesoura premium", src: "/salaopremiun-editor/elementos/tesoura-premium.svg", category: "Luxo" },
  { label: "Secador luxo", src: "/salaopremiun-editor/elementos/secador-luxo.svg", category: "Luxo" },
  { label: "Esmalte chic", src: "/salaopremiun-editor/elementos/esmalte-chic.svg", category: "Unhas" },
  { label: "Batom glam", src: "/salaopremiun-editor/elementos/batom-glam.svg", category: "Maquiagem" },
  { label: "Pente dourado", src: "/salaopremiun-editor/elementos/pente-dourado.svg", category: "Cabelo" },
  { label: "Brilho premium", src: "/salaopremiun-editor/elementos/brilho-premium.svg", category: "Luxo" },
  { label: "Espelho salao", src: "/salaopremiun-editor/elementos/espelho-salao.svg", category: "Estetica" },
  { label: "Agenda aberta", src: "/salaopremiun-editor/elementos/agenda-aberta.svg", category: "Agenda" },
  { label: "Maquina de corte", src: "/salaopremiun-editor/elementos/maquina-corte.svg", category: "Cabelo" },
  { label: "Cadeira salao", src: "/salaopremiun-editor/elementos/cadeira-salao-rosa.svg", category: "Estetica" },
  { label: "Spray rosa", src: "/salaopremiun-editor/elementos/spray-rosa.svg", category: "Cabelo" },
  { label: "Laco rosa", src: "/salaopremiun-editor/elementos/laco-rosa.svg", category: "Promocao" },
  { label: "Rosto beleza", src: "/salaopremiun-editor/elementos/rosto-beleza.svg", category: "Estetica" },
] as const;

const tabConfig = [
  { id: "modelos", label: "Modelos", icon: WandSparkles },
  { id: "texto", label: "Texto", icon: Type },
  { id: "fotos", label: "Fotos", icon: ImagePlus },
  { id: "formas", label: "Ferramentas", icon: PenLine },
  { id: "elementos", label: "Elementos", icon: Shapes },
  { id: "uploads", label: "Uploads", icon: ImagePlus },
  { id: "projetos", label: "Projetos", icon: FolderOpen },
] as const;

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-");
}

function slugifyProjectName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "arte-sem-titulo";
}

function titleFromSlug(slug?: string | null) {
  if (!slug) return "Arte sem titulo";
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isPublicEditorRoute() {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/salaopremiuneditor");
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

function applyFillDeep(object: FabricObject, fill: string) {
  const maybeGroup = object as FabricObject & { getObjects?: () => FabricObject[] };
  if (typeof maybeGroup.getObjects === "function") {
    maybeGroup.getObjects().forEach((child) => applyFillDeep(child, fill));
  }
  if (object.type !== "image") {
    object.set({ fill });
  }
}

function applyStrokeDeep(object: FabricObject, stroke: string, strokeWidth = 3) {
  const maybeGroup = object as FabricObject & { getObjects?: () => FabricObject[] };
  if (typeof maybeGroup.getObjects === "function") {
    maybeGroup.getObjects().forEach((child) => applyStrokeDeep(child, stroke, strokeWidth));
  }
  if (object.type !== "image") {
    object.set({ stroke, strokeWidth });
  }
}

function applyCanvasDisplayScale(canvas: FabricCanvas | null, width: number, height: number, scale: number) {
  if (!canvas) return;
  canvas.setZoom(1);
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.setDimensions(
    {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    },
    { cssOnly: true }
  );
  canvas.calcOffset();
  canvas.requestRenderAll();
}

function objectIsFrame(object: FabricObject | null | undefined): object is FrameObject {
  return Boolean((object as FrameObject | null | undefined)?.data?.isFrame);
}

function colorDistance(a: number[], b: number[]) {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 +
      (a[1] - b[1]) ** 2 +
      (a[2] - b[2]) ** 2
  );
}

export default function QrCodeArtEditor({
  open,
  onClose,
  publicUrl,
  qrCodeUrl,
  publicSlug,
  salaoNome,
  logoUrl,
  initialProjectSlug = null,
}: Props) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<FabricCanvas | null>(null);
  const fabricRef = useRef<FabricModule | null>(null);
  const clipboardRef = useRef<FabricObject | null>(null);
  const historyRef = useRef<string[]>([]);
  const futureRef = useRef<string[]>([]);
  const loadingJsonRef = useRef(false);
  const loadedInitialSlugRef = useRef<string | null>(null);
  const pendingStartRef = useRef<{
    width: number;
    height: number;
    formato: string;
    templateKind?: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<EditorTab | null>(null);
  const [selected, setSelected] = useState<FabricObject | null>(null);
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>("none");
  const [elementCategory, setElementCategory] = useState<(typeof elementCategories)[number]>("Tudo");
  const [colorPanelOpen, setColorPanelOpen] = useState(false);
  const [projectName, setProjectName] = useState(titleFromSlug(initialProjectSlug));
  const [projectSlug, setProjectSlug] = useState(initialProjectSlug || "");
  const [projectId, setProjectId] = useState<string | null>(initialProjectSlug);
  const [projectStarted, setProjectStarted] = useState(Boolean(initialProjectSlug));
  const [format, setFormat] = useState("feed");
  const [artSize, setArtSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [zoom, setZoom] = useState(0.48);
  const [showGrid, setShowGrid] = useState(true);
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [photoQuery, setPhotoQuery] = useState("cabelo salao");
  const [stockPhotos, setStockPhotos] = useState<StockPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState("");
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [projects, setProjects] = useState<EditorProject[]>([]);
  const [status, setStatus] = useState("");
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1080);
  const [backgroundColor, setBackgroundColor] = useState("#fff7e6");
  const [layerVersion, setLayerVersion] = useState(0);

  const selectedLocked = useMemo(() => objectIsLocked(selected || undefined), [selected]);
  const isTextSelected = Boolean(selected && ["i-text", "text", "textbox"].includes(selected.type));
  const isImageSelected = selected?.type === "image";
  const isVectorSelected = Boolean(selected && !isTextSelected && !isImageSelected);
  const rightPanelOpen = rightPanelMode === "layers" || Boolean(selected);
  const documentColors = useMemo(() => ["#111111", "#ffffff", "#d8b36b", "#f7f2e7", "#3d372f", "#8b7a55", "#f2efe8", "#000000"], []);
  const filteredElementPresets = useMemo(
    () => elementCategory === "Tudo" ? elementPresets : elementPresets.filter((preset) => preset.category === elementCategory),
    [elementCategory]
  );
  const canvasLayers = useMemo(() => {
    const canvas = canvasRef.current;
    return canvas ? [...canvas.getObjects()].reverse() : [];
  }, [layerVersion, selected]);

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
    const availableW = window.innerWidth > 1180 ? window.innerWidth - 760 : window.innerWidth - 64;
    const availableH = window.innerHeight - 190;
    return Math.max(0.16, Math.min(0.86, availableW / width, availableH / height));
  }, []);

  const addImageFromUrl = useCallback(
    async (src: string, label = "Imagem", targetWidth = 360) => {
      const fabric = fabricRef.current;
      const canvas = canvasRef.current;
      if (!fabric || !canvas) return;
      const image = await fabric.FabricImage.fromURL(src, { crossOrigin: "anonymous" });
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const active = canvas.getActiveObject();
      if (objectIsFrame(active)) {
        const frame = active;
        const frameLeft = frame.left || 0;
        const frameTop = frame.top || 0;
        const frameWidth = frame.getScaledWidth();
        const frameHeight = frame.getScaledHeight();
        const scale = Math.max(frameWidth / (image.width || 1), frameHeight / (image.height || 1));
        const clipPath = (await frame.clone()) as FabricObject;
        clipPath.set({
          left: frameLeft,
          top: frameTop,
          absolutePositioned: true,
          fill: "#000000",
          strokeWidth: 0,
        });
        image.set({
          left: frameLeft + frameWidth / 2 - ((image.width || 0) * scale) / 2,
          top: frameTop + frameHeight / 2 - ((image.height || 0) * scale) / 2,
          scaleX: scale,
          scaleY: scale,
          clipPath,
          name: label,
        });
        canvas.add(image);
        canvas.bringObjectToFront(frame);
        canvas.setActiveObject(image);
        canvas.requestRenderAll();
        setLayerVersion((value) => value + 1);
        pushHistory();
        return;
      }
      image.set({
        left: canvasWidth / 2 - targetWidth / 2,
        top: canvasHeight / 2 - targetWidth / 2,
        name: label,
        cornerStyle: "circle",
        transparentCorners: false,
      });
      image.scaleToWidth(targetWidth);
      canvas.add(image);
      canvas.setActiveObject(image);
      canvas.requestRenderAll();
      setLayerVersion((value) => value + 1);
      pushHistory();
    },
    [pushHistory]
  );

  const addSvgFromUrl = useCallback(
    async (src: string, label = "Elemento", targetWidth = 240) => {
      const fabric = fabricRef.current;
      const canvas = canvasRef.current;
      if (!fabric || !canvas) return;
      const svg = await fetch(src).then((response) => response.text());
      const loaded = await fabric.loadSVGFromString(svg);
      const objects = loaded.objects.filter((object): object is FabricObject => Boolean(object));
      const group = fabric.util.groupSVGElements(objects, loaded.options);
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      group.set({
        left: canvasWidth / 2 - targetWidth / 2,
        top: canvasHeight / 2 - targetWidth / 2,
        name: label,
      });
      applyFillDeep(group as FabricObject, "#111111");
      group.scaleToWidth(targetWidth);
      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.requestRenderAll();
      setLayerVersion((value) => value + 1);
      pushHistory();
    },
    [pushHistory]
  );

  const buildBaseTemplate = useCallback(
    async (nextWidth?: number, nextHeight?: number) => {
      const fabric = fabricRef.current;
      const canvas = canvasRef.current;
      if (!fabric || !canvas) return;
      const width = nextWidth ?? canvas.getWidth();
      const height = nextHeight ?? canvas.getHeight();
      loadingJsonRef.current = true;
      canvas.clear();
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      canvas.backgroundColor = transparentBackground ? "" : backgroundColor;

      const contentWidth = width * 0.78;
      const centerX = width / 2;
      const topY = height * 0.1;

      const card = new fabric.Rect({
        left: centerX - contentWidth / 2,
        top: height * 0.055,
        width: contentWidth,
        height: height * 0.89,
        fill: "#fffaf0",
        stroke: "#e2bf6e",
        strokeWidth: 4,
        rx: 34,
        ry: 34,
        selectable: false,
        evented: false,
        name: "Fundo",
      });
      canvas.add(card);

      if (logoUrl) {
        const logo = await fabric.FabricImage.fromURL(logoUrl, { crossOrigin: "anonymous" });
        logo.set({ left: centerX - 55, top: topY, name: "Logo" });
        logo.scaleToWidth(110);
        canvas.add(logo);
      }

      canvas.add(
        new fabric.Textbox((salaoNome || "SalaoPremiun").toUpperCase(), {
          left: centerX - (contentWidth * 0.94) / 2,
          top: logoUrl ? height * 0.2 : height * 0.13,
          width: contentWidth * 0.94,
          fontFamily: "Montserrat",
          fontSize: Math.round(width * 0.026),
          fontWeight: "900",
          fill: "#111111",
          textAlign: "center",
          lineHeight: 1.04,
          name: "Titulo",
        })
      );
      canvas.add(
        new fabric.Textbox("Agende seu horario pelo app", {
          left: centerX - (contentWidth * 0.74) / 2,
          top: logoUrl ? height * 0.31 : height * 0.24,
          width: contentWidth * 0.74,
          fontFamily: "Montserrat",
          fontSize: Math.round(width * 0.028),
          fontWeight: "800",
          fill: "#5f5a4f",
          textAlign: "center",
          name: "Chamada",
        })
      );

      const qrBoxSize = Math.min(width * 0.43, height * 0.26);
      canvas.add(
        new fabric.Rect({
          left: centerX - qrBoxSize / 2 - 28,
          top: height * 0.43 - 28,
          width: qrBoxSize + 56,
          height: qrBoxSize + 56,
          fill: "#ffffff",
          stroke: "#e2bf6e",
          strokeWidth: 3,
          rx: 28,
          ry: 28,
          selectable: false,
          evented: false,
          name: "Moldura QR Code",
        })
      );
      const qr = await fabric.FabricImage.fromURL(qrCodeUrl, { crossOrigin: "anonymous" });
      qr.set({ left: centerX - qrBoxSize / 2, top: height * 0.43, name: "QR Code" });
      qr.scaleToWidth(qrBoxSize);
      canvas.add(qr);

      canvas.add(
        new fabric.Textbox(publicUrl, {
          left: centerX - (contentWidth * 0.76) / 2,
          top: height * 0.77,
          width: contentWidth * 0.76,
          fontFamily: "Montserrat",
          fontSize: Math.round(width * 0.018),
          fontWeight: "800",
          fill: "#111111",
          textAlign: "center",
          name: "Link",
        })
      );
      canvas.add(
        new fabric.Textbox("Aponte a camera e reserve em poucos segundos", {
          left: centerX - (contentWidth * 0.74) / 2,
          top: height * 0.84,
          width: contentWidth * 0.74,
          fontFamily: "Montserrat",
          fontSize: Math.round(width * 0.022),
          fontWeight: "700",
          fill: "#6b6255",
          textAlign: "center",
          name: "Instrucao",
        })
      );

      canvas.requestRenderAll();
      setLayerVersion((value) => value + 1);
      loadingJsonRef.current = false;
      historyRef.current = [JSON.stringify(canvas.toJSON())];
      futureRef.current = [];
    },
    [backgroundColor, logoUrl, publicUrl, qrCodeUrl, salaoNome, transparentBackground]
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
      applyCanvasDisplayScale(canvas, width, height, nextZoom);
      canvas.clear();
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      canvas.backgroundColor = transparentBackground ? "" : backgroundColor;
      canvas.requestRenderAll();
      setLayerVersion((value) => value + 1);
      historyRef.current = [JSON.stringify(canvas.toJSON())];
      futureRef.current = [];
    },
    [backgroundColor, fitZoom, transparentBackground]
  );

  async function startProject(options: {
    width: number;
    height: number;
    formato: string;
    templateKind?: string;
    name?: string;
  }) {
    const name = options.name || "Arte sem titulo";
    const slug = slugifyProjectName(name);
    pendingStartRef.current = {
      width: options.width,
      height: options.height,
      formato: options.formato,
      templateKind: options.templateKind,
    };
    setProjectStarted(true);
    setProjectName(name);
    setProjectSlug(slug);
    setProjectId(slug);
    setArtSize({ width: options.width, height: options.height });
    setFormat(options.formato);
    const path = `/salaopremiuneditor/${slug}`;
    window.history.replaceState(null, "", path);
  }

  function applyProjectNameToUrl() {
    if (!projectStarted) return;
    const slug = slugifyProjectName(projectName);
    if (slug === projectSlug) return;
    setProjectSlug(slug);
    setProjectId((current) => (current === projectSlug || !current ? slug : current));
    const path = `/salaopremiuneditor/${slug}`;
    window.history.replaceState(null, "", path);
  }

  useEffect(() => {
    if (!open || !projectStarted || !canvasElRef.current || canvasRef.current) return;
    let cancelled = false;

    async function init() {
      const fabric = await import("fabric");
      if (cancelled || !canvasElRef.current) return;
      fabricRef.current = fabric;
      const pending = pendingStartRef.current;
      const initialWidth = pending?.width || artSize.width;
      const initialHeight = pending?.height || artSize.height;
      const nextZoom = fitZoom(initialWidth, initialHeight);
      setZoom(nextZoom);
      const canvas = new fabric.Canvas(canvasElRef.current, {
        width: initialWidth,
        height: initialHeight,
        backgroundColor: transparentBackground ? "" : backgroundColor,
        preserveObjectStacking: true,
        selection: true,
      });
      applyCanvasDisplayScale(canvas, initialWidth, initialHeight, nextZoom);
      canvasRef.current = canvas;

      fabric.FabricObject.ownDefaults.borderColor = "#d8b36b";
      fabric.FabricObject.ownDefaults.cornerColor = "#111111";
      fabric.FabricObject.ownDefaults.cornerStrokeColor = "#ffffff";
      fabric.FabricObject.ownDefaults.cornerStyle = "circle";
      fabric.FabricObject.ownDefaults.transparentCorners = false;
      fabric.FabricObject.ownDefaults.originX = "left";
      fabric.FabricObject.ownDefaults.originY = "top";

      const syncSelection = () => {
        const active = canvas.getActiveObject() || null;
        setSelected(active);
        if (active) setRightPanelMode("inspector");
      };
      canvas.on("selection:created", syncSelection);
      canvas.on("selection:updated", syncSelection);
      canvas.on("selection:cleared", () => {
        setSelected(null);
        setRightPanelMode("none");
        setColorPanelOpen(false);
      });
      canvas.on("object:modified", () => {
        pushHistory();
        setLayerVersion((value) => value + 1);
      });
      canvas.on("object:added", () => {
        pushHistory();
        setLayerVersion((value) => value + 1);
      });
      canvas.on("object:removed", () => {
        pushHistory();
        setLayerVersion((value) => value + 1);
      });
      historyRef.current = [JSON.stringify(canvas.toJSON())];
      if (pending) {
        pendingStartRef.current = null;
        setArtSize({ width: pending.width, height: pending.height });
        setFormat(pending.formato);
        const templateKind = pending.templateKind;
        if (templateKind && templateKind !== "blank") {
          window.setTimeout(() => addTemplate(templateKind), 120);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      canvasRef.current?.dispose();
      canvasRef.current = null;
    };
  }, [fitZoom, open, projectStarted, pushHistory]);

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

  useEffect(() => {
    if (!open) return;
    function onResize() {
      const nextZoom = fitZoom(artSize.width, artSize.height);
      setZoom(nextZoom);
      applyCanvasDisplayScale(canvasRef.current, artSize.width, artSize.height, nextZoom);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [artSize.height, artSize.width, fitZoom, open]);

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
    setLayerVersion((value) => value + 1);
    pushHistory();
  }

  function addTextPreset(preset: (typeof textPresets)[number]) {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;
    const object = new fabric.Textbox(preset.text, {
      left: artSize.width * 0.18,
      top: artSize.height * 0.18,
      width: artSize.width * 0.64,
      fontFamily: preset.fontFamily,
      fontSize: preset.fontSize,
      fontWeight: preset.fontWeight,
      fill: preset.fill,
      textAlign: "center",
      charSpacing: "charSpacing" in preset ? preset.charSpacing : 0,
      backgroundColor: "backgroundColor" in preset ? preset.backgroundColor : "",
      name: preset.label,
    });
    canvas.add(object);
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    setLayerVersion((value) => value + 1);
    pushHistory();
  }

  function addStickyNote(color = "#f6d365") {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;
    const centerX = canvas.getWidth() / 2;
    const centerY = canvas.getHeight() / 2;
    const note = new fabric.Group([
      new fabric.Rect({
        left: 0,
        top: 0,
        width: 330,
        height: 260,
        rx: 18,
        ry: 18,
        fill: color,
        shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.18)", blur: 24, offsetX: 0, offsetY: 14 }),
      }),
      new fabric.Textbox("Digite sua nota", {
        left: 28,
        top: 32,
        width: 270,
        fontFamily: "Montserrat",
        fontSize: 28,
        fontWeight: "800",
        fill: "#111111",
        textAlign: "center",
      }),
    ], {
      left: centerX - 165,
      top: centerY - 130,
      name: "Nota adesiva",
    } as Partial<import("fabric").GroupProps> & { name: string });
    canvas.add(note);
    canvas.setActiveObject(note);
    canvas.requestRenderAll();
    setLayerVersion((value) => value + 1);
    pushHistory();
  }

  function addTableBlock() {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;
    const centerX = canvas.getWidth() / 2;
    const centerY = canvas.getHeight() / 2;
    const width = 620;
    const height = 360;
    const objects: FabricObject[] = [
      new fabric.Rect({ left: 0, top: 0, width, height, rx: 22, ry: 22, fill: "#ffffff", stroke: "#d8b36b", strokeWidth: 4 }) as FabricObject,
      new fabric.Rect({ left: 0, top: 0, width, height: 78, rx: 22, ry: 22, fill: "#111111" }) as FabricObject,
      new fabric.Textbox("SERVICO", { left: 34, top: 24, width: 300, fontFamily: "Montserrat", fontSize: 22, fontWeight: "900", fill: "#d8b36b" }) as FabricObject,
      new fabric.Textbox("VALOR", { left: 430, top: 24, width: 140, fontFamily: "Montserrat", fontSize: 22, fontWeight: "900", fill: "#d8b36b", textAlign: "right" }) as FabricObject,
    ];
    [150, 230, 310].forEach((top) => {
      objects.push(new fabric.Line([28, top, width - 28, top], { stroke: "#eee4cf", strokeWidth: 3 }) as FabricObject);
    });
    [
      ["Corte feminino", "R$ 80"],
      ["Escova modelada", "R$ 70"],
      ["Combo beleza", "R$ 150"],
    ].forEach(([service, price], index) => {
      const top = 108 + index * 80;
      objects.push(new fabric.Textbox(service, { left: 34, top, width: 330, fontFamily: "Lato", fontSize: 27, fontWeight: "800", fill: "#111111" }) as FabricObject);
      objects.push(new fabric.Textbox(price, { left: 420, top, width: 150, fontFamily: "Montserrat", fontSize: 27, fontWeight: "900", fill: "#111111", textAlign: "right" }) as FabricObject);
    });
    const table = new fabric.Group(objects, {
      left: centerX - width / 2,
      top: centerY - height / 2,
      name: "Tabela de precos",
    } as Partial<import("fabric").GroupProps> & { name: string });
    canvas.add(table);
    canvas.setActiveObject(table);
    canvas.requestRenderAll();
    setLayerVersion((value) => value + 1);
    pushHistory();
  }

  function makeFrameRect(left: number, top: number, width: number, height: number, name: string, rx = 32) {
    const fabric = fabricRef.current;
    if (!fabric) return null;
    const frame = new fabric.Rect({
      left,
      top,
      width,
      height,
      rx,
      ry: rx,
      fill: "rgba(255,255,255,0.28)",
      stroke: "#d8b36b",
      strokeWidth: 8,
      strokeDashArray: [18, 12],
      name,
    }) as FrameObject;
    frame.data = { isFrame: true, frameShape: "rect" };
    return frame;
  }

  function addFramePreset(kind: (typeof framePresets)[number]["kind"]) {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;
    const centerX = canvas.getWidth() / 2;
    const centerY = canvas.getHeight() / 2;
    const added: FabricObject[] = [];
    if (kind === "circle") {
      const frame = new fabric.Circle({
        left: centerX - 190,
        top: centerY - 190,
        radius: 190,
        fill: "rgba(255,255,255,0.28)",
        stroke: "#d8b36b",
        strokeWidth: 8,
        strokeDashArray: [18, 12],
        name: "Moldura circular",
      }) as FrameObject;
      frame.data = { isFrame: true, frameShape: "circle" };
      added.push(frame);
    } else if (kind === "before-after") {
      const left = makeFrameRect(centerX - 390, centerY - 250, 350, 500, "Foto antes", 28);
      const right = makeFrameRect(centerX + 40, centerY - 250, 350, 500, "Foto depois", 28);
      if (left && right) added.push(left, right);
    } else if (kind === "grid-2") {
      const top = makeFrameRect(centerX - 250, centerY - 360, 500, 320, "Foto superior", 26);
      const bottom = makeFrameRect(centerX - 250, centerY + 30, 500, 320, "Foto inferior", 26);
      if (top && bottom) added.push(top, bottom);
    } else if (kind === "phone") {
      const outer = new fabric.Rect({
        left: centerX - 180,
        top: centerY - 355,
        width: 360,
        height: 710,
        rx: 54,
        ry: 54,
        fill: "#111111",
        name: "Mockup celular",
      });
      const screen = makeFrameRect(centerX - 150, centerY - 295, 300, 590, "Tela do celular", 34);
      if (screen) added.push(outer, screen);
    } else if (kind === "laptop") {
      const body = new fabric.Rect({
        left: centerX - 370,
        top: centerY - 235,
        width: 740,
        height: 460,
        rx: 34,
        ry: 34,
        fill: "#111111",
        name: "Mockup notebook",
      });
      const base = new fabric.Rect({
        left: centerX - 430,
        top: centerY + 230,
        width: 860,
        height: 44,
        rx: 18,
        ry: 18,
        fill: "#d8b36b",
        name: "Base notebook",
      });
      const screen = makeFrameRect(centerX - 330, centerY - 195, 660, 390, "Tela do notebook", 20);
      if (screen) added.push(body, screen, base);
    } else {
      const frame = makeFrameRect(centerX - 230, centerY - 300, 460, 600, "Moldura de foto", 38);
      if (frame) added.push(frame);
    }
    added.forEach((object) => canvas.add(object));
    const selectable = added.find(objectIsFrame) || added[added.length - 1];
    if (selectable) canvas.setActiveObject(selectable);
    canvas.requestRenderAll();
    setLayerVersion((value) => value + 1);
    pushHistory();
  }

  function addShape(kind: "rect" | "circle" | "line" | "arrow" | "star" | "heart" | "badge" | "tag" | "speech" | "frame" | "separator" | "qr-corners") {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;
    const centerX = canvas.getWidth() / 2;
    const centerY = canvas.getHeight() / 2;
    const starPoints = Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI) / 5;
      const radius = index % 2 === 0 ? 96 : 42;
      return {
        x: Math.cos(angle) * radius + 96,
        y: Math.sin(angle) * radius + 96,
      };
    });
    const object =
      kind === "circle" ? new fabric.Circle({
        left: centerX - 90,
        top: centerY - 90,
        radius: 90,
        fill: "#d8b36b",
        name: "Circulo",
      }) : kind === "line" ? new fabric.Line([0, 0, 280, 0], {
        left: centerX - 140,
        top: centerY,
        stroke: "#111111",
        strokeWidth: 8,
        name: "Linha",
      }) : kind === "arrow" ? new fabric.Group([
        new fabric.Line([0, 0, 260, 0], { stroke: "#111111", strokeWidth: 10, left: 0, top: 30 }),
        new fabric.Triangle({ left: 245, top: 15, width: 42, height: 42, fill: "#111111", angle: 90 }),
      ], { left: centerX - 145, top: centerY - 30, name: "Seta" } as Partial<import("fabric").GroupProps> & { name: string }) : kind === "star" ? new fabric.Polygon(starPoints, {
        left: centerX - 96,
        top: centerY - 96,
        fill: "#d8b36b",
        name: "Estrela",
      } as Partial<import("fabric").FabricObjectProps> & { name: string }) : kind === "heart" ? new fabric.Path("M 80 28 C 62 0 18 8 18 44 C 18 78 80 116 80 116 C 80 116 142 78 142 44 C 142 8 98 0 80 28 Z", {
        left: centerX - 80,
        top: centerY - 62,
        fill: "#ed4f8c",
        name: "Coracao",
      } as Partial<import("fabric").FabricObjectProps> & { name: string }) : kind === "badge" ? new fabric.Circle({
        left: centerX - 115,
        top: centerY - 115,
        radius: 115,
        fill: "#111111",
        stroke: "#d8b36b",
        strokeWidth: 8,
        name: "Selo de desconto",
      } as Partial<import("fabric").CircleProps> & { name: string }) : kind === "tag" ? new fabric.Polygon([
        { x: 0, y: 0 }, { x: 250, y: 0 }, { x: 310, y: 70 }, { x: 250, y: 140 }, { x: 0, y: 140 },
      ], {
        left: centerX - 155,
        top: centerY - 70,
        fill: "#fff8e7",
        stroke: "#d8b36b",
        strokeWidth: 5,
        name: "Tag de preco",
      } as Partial<import("fabric").FabricObjectProps> & { name: string }) : kind === "speech" ? new fabric.Path("M 20 0 H 320 Q 340 0 340 20 V 150 Q 340 170 320 170 H 120 L 64 220 L 78 170 H 20 Q 0 170 0 150 V 20 Q 0 0 20 0 Z", {
        left: centerX - 170,
        top: centerY - 110,
        fill: "#ffffff",
        stroke: "#d8b36b",
        strokeWidth: 5,
        name: "Balao de fala",
      } as Partial<import("fabric").FabricObjectProps> & { name: string }) : kind === "frame" ? new fabric.Rect({
        left: centerX - 180,
        top: centerY - 220,
        width: 360,
        height: 440,
        rx: 34,
        ry: 34,
        fill: "transparent",
        stroke: "#d8b36b",
        strokeWidth: 10,
        name: "Moldura de foto",
      }) : kind === "separator" ? new fabric.Group([
        new fabric.Line([0, 0, 420, 0], { stroke: "#d8b36b", strokeWidth: 4, left: 0, top: 20 }),
        new fabric.Circle({ left: 196, top: 0, radius: 20, fill: "#d8b36b" }),
      ], { left: centerX - 210, top: centerY - 20, name: "Separador elegante" } as Partial<import("fabric").GroupProps> & { name: string }) : kind === "qr-corners" ? new fabric.Group([
        new fabric.Path("M0 70 V0 H70", { left: 0, top: 0, stroke: "#111111", strokeWidth: 12, fill: "" }),
        new fabric.Path("M70 0 H0 V70", { left: 250, top: 0, stroke: "#111111", strokeWidth: 12, fill: "" }),
        new fabric.Path("M70 0 H0 V70", { left: 0, top: 250, angle: 180, stroke: "#111111", strokeWidth: 12, fill: "" }),
        new fabric.Path("M0 70 V0 H70", { left: 250, top: 250, angle: 180, stroke: "#111111", strokeWidth: 12, fill: "" }),
      ], { left: centerX - 160, top: centerY - 160, name: "Cantoneiras QR Code" } as Partial<import("fabric").GroupProps> & { name: string }) : new fabric.Rect({
        left: centerX - 120,
        top: centerY - 70,
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
    setLayerVersion((value) => value + 1);
    pushHistory();
  }

  function addMarketingBlock(kind: "price-list" | "testimonial" | "coupon" | "availability" | "stars") {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;
    const centerX = canvas.getWidth() / 2;
    const centerY = canvas.getHeight() / 2;
    const card = new fabric.Rect({
      left: centerX - 300,
      top: centerY - 160,
      width: 600,
      height: kind === "price-list" ? 360 : 300,
      rx: 32,
      ry: 32,
      fill: kind === "coupon" ? "#111111" : "#ffffff",
      stroke: "#d8b36b",
      strokeWidth: 4,
      shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.16)", blur: 35, offsetX: 0, offsetY: 18 }),
      name: "Bloco de marketing",
    });
    const titleByKind = {
      "price-list": "MENU DE SERVICOS",
      testimonial: "CLIENTE APAIXONADA",
      coupon: "CUPOM RELAMPAGO",
      availability: "HORARIOS LIVRES HOJE",
      stars: "5 ESTRELAS",
    } as const;
    const bodyByKind = {
      "price-list": "Corte feminino ........ R$ 80\nEscova modelada ...... R$ 70\nCombo beleza ........ R$ 150",
      testimonial: "\"Atendimento impecavel e resultado maravilhoso!\"",
      coupon: "20% OFF\nvalido somente hoje",
      availability: "14:00  |  16:30  |  18:00\nToque no QR Code e reserve",
      stars: "Avaliacao 5 estrelas\nStudio Maos de Fadas",
    } as const;
    canvas.add(card);
    canvas.add(new fabric.Textbox(titleByKind[kind], {
      left: centerX - 240,
      top: centerY - 115,
      width: 480,
      fontFamily: kind === "stars" ? "Montserrat" : "Montserrat",
      fontSize: kind === "coupon" ? 46 : 34,
      fontWeight: "900",
      fill: kind === "coupon" ? "#d8b36b" : kind === "stars" ? "#d8b36b" : "#111111",
      textAlign: "center",
      name: "Titulo do bloco",
    }));
    canvas.add(new fabric.Textbox(bodyByKind[kind], {
      left: centerX - 250,
      top: centerY - 35,
      width: 500,
      fontFamily: kind === "testimonial" ? "Playfair Display" : "Lato",
      fontSize: kind === "coupon" ? 54 : 28,
      fontWeight: kind === "coupon" ? "900" : "700",
      fill: kind === "coupon" ? "#fff8e7" : "#5f5a4f",
      textAlign: "center",
      lineHeight: 1.25,
      name: "Texto do bloco",
    }));
    canvas.requestRenderAll();
    pushHistory();
  }

  async function addUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const src = String(reader.result || "");
      setUploadedAssets((items) => [
        { id: `${Date.now()}-${file.name}`, name: file.name || "Upload", src },
        ...items,
      ].slice(0, 30));
      await addImageFromUrl(src, file.name || "Upload", 420);
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

    if (kind === "top-campaign") {
      canvas.clear();
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      canvas.backgroundColor = transparentBackground ? "" : "#f7ead3";
      const width = canvas.getWidth();
      const height = canvas.getHeight();
      const pad = width * 0.07;
      canvas.add(new fabric.Rect({
        left: 0,
        top: 0,
        width,
        height,
        fill: "#f7ead3",
        selectable: false,
        evented: false,
        name: "Fundo champagne",
      }));
      canvas.add(new fabric.Rect({
        left: pad,
        top: pad,
        width: width - pad * 2,
        height: height - pad * 2,
        rx: 48,
        ry: 48,
        fill: "#14110d",
        stroke: "#d8b36b",
        strokeWidth: 7,
        name: "Base premium",
      }));
      canvas.add(new fabric.Circle({
        left: width * 0.58,
        top: height * 0.08,
        radius: width * 0.24,
        fill: "#d8b36b",
        opacity: 0.14,
        name: "Luz dourada",
      }));
      canvas.add(new fabric.Circle({
        left: -width * 0.18,
        top: height * 0.55,
        radius: width * 0.28,
        fill: "#ed4f8c",
        opacity: 0.12,
        name: "Luz rosa",
      }));
      canvas.add(new fabric.Textbox("STUDIO MAOS DE FADAS", {
        left: width * 0.18,
        top: height * 0.14,
        width: width * 0.64,
        fontFamily: "Montserrat",
        fontSize: Math.round(width * 0.032),
        fontWeight: "900",
        charSpacing: 50,
        fill: "#f3d37a",
        textAlign: "center",
        name: "Marca",
      }));
      canvas.add(new fabric.Textbox("DIA DE\nBELEZA", {
        left: width * 0.12,
        top: height * 0.255,
        width: width * 0.76,
        fontFamily: "Playfair Display",
        fontSize: Math.round(width * 0.094),
        fontWeight: "900",
        fill: "#fff8e7",
        textAlign: "center",
        lineHeight: 0.9,
        name: "Titulo principal",
      }));
      canvas.add(new fabric.Textbox("Corte + escova + finalizacao", {
        left: width * 0.18,
        top: height * 0.49,
        width: width * 0.64,
        fontFamily: "Montserrat",
        fontSize: Math.round(width * 0.032),
        fontWeight: "800",
        fill: "#f3d37a",
        textAlign: "center",
        name: "Subtitulo campanha",
      }));
      canvas.add(new fabric.Rect({
        left: width * 0.24,
        top: height * 0.585,
        width: width * 0.52,
        height: height * 0.11,
        rx: 34,
        ry: 34,
        fill: "#fff8e7",
        shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.24)", blur: 30, offsetX: 0, offsetY: 18 }),
        name: "Etiqueta preco",
      }));
      canvas.add(new fabric.Textbox("R$ 150", {
        left: width * 0.28,
        top: height * 0.607,
        width: width * 0.44,
        fontFamily: "Montserrat",
        fontSize: Math.round(width * 0.068),
        fontWeight: "900",
        fill: "#111111",
        textAlign: "center",
        name: "Preco destaque",
      }));
      canvas.add(new fabric.Textbox("AGENDE PELO APP", {
        left: width * 0.28,
        top: height * 0.765,
        width: width * 0.44,
        fontFamily: "Montserrat",
        fontSize: Math.round(width * 0.027),
        fontWeight: "900",
        fill: "#111111",
        textAlign: "center",
        backgroundColor: "#d8b36b",
        name: "Chamada final",
      }));
      canvas.add(new fabric.Textbox(publicUrl, {
        left: width * 0.22,
        top: height * 0.87,
        width: width * 0.56,
        fontFamily: "Lato",
        fontSize: Math.round(width * 0.017),
        fontWeight: "700",
        fill: "#fff8e7",
        textAlign: "center",
        name: "Link de agendamento",
      }));
      canvas.requestRenderAll();
      setLayerVersion((value) => value + 1);
      pushHistory();
      return;
    }

    if (kind === "promo-luxo" || kind === "agenda-glam") {
      canvas.clear();
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      canvas.backgroundColor = transparentBackground ? "" : "#fff7e6";
      const width = canvas.getWidth();
      const height = canvas.getHeight();
      const centerX = width / 2;
      const panelW = width * 0.74;
      const panelX = centerX - panelW / 2;
      const panelY = height * 0.08;
      const panelH = height * 0.78;
      canvas.add(
        new fabric.Rect({
          left: panelX,
          top: panelY,
          width: panelW,
          height: panelH,
          rx: 36,
          ry: 36,
          fill: kind === "promo-luxo" ? "#17120d" : "#fffdf7",
          stroke: "#d8b36b",
          strokeWidth: 4,
          name: "Fundo premium",
        })
      );
      canvas.add(
        new fabric.Circle({
          left: panelX + panelW * 0.08,
          top: panelY + panelH * 0.08,
          radius: Math.round(panelW * 0.2),
          fill: kind === "promo-luxo" ? "#d8b36b" : "#f0c45b",
          opacity: 0.16,
          selectable: false,
          evented: false,
          name: "Luz decorativa",
        })
      );
      canvas.add(
        new fabric.Rect({
          left: centerX - panelW * 0.24,
          top: panelY + panelH * 0.13,
          width: panelW * 0.48,
          height: 3,
          fill: "#d8b36b",
          opacity: 0.9,
          name: "Linha superior",
        })
      );
      canvas.add(
        new fabric.Textbox(kind === "promo-luxo" ? "PROMO DA SEMANA" : "AGENDA ABERTA", {
          left: centerX - (panelW * 0.72) / 2,
          top: panelY + panelH * 0.18,
          width: panelW * 0.72,
          fontFamily: "Montserrat",
          fontSize: Math.round(width * 0.054),
          fontWeight: "900",
          fill: kind === "promo-luxo" ? "#fff8e7" : "#111111",
          textAlign: "center",
          lineHeight: 0.98,
          name: "Titulo premium",
        })
      );
      canvas.add(
        new fabric.Textbox(
          kind === "promo-luxo"
            ? "Corte + escova com acabamento premium"
            : "Escolha seu melhor horario e reserve pelo QR Code",
          {
            left: centerX - (panelW * 0.66) / 2,
            top: panelY + panelH * 0.34,
            width: panelW * 0.66,
            fontFamily: "Montserrat",
            fontSize: Math.round(width * 0.028),
            fontWeight: "700",
            fill: kind === "promo-luxo" ? "#f3d37a" : "#6b6255",
            textAlign: "center",
            name: "Chamada premium",
          }
        )
      );
      canvas.add(
        new fabric.Textbox(kind === "promo-luxo" ? "R$ 150" : "Hoje: 14:00 | 16:30 | 18:00", {
          left: centerX - (panelW * 0.7) / 2,
          top: panelY + panelH * 0.46,
          width: panelW * 0.7,
          fontFamily: "Playfair Display",
          fontSize: Math.round(width * 0.082),
          fontWeight: "900",
          fill: kind === "promo-luxo" ? "#ffffff" : "#111111",
          textAlign: "center",
          name: "Destaque premium",
        })
      );
      canvas.add(
        new fabric.Textbox(kind === "promo-luxo" ? "AGENDE PELO APP" : "VAGAS LIMITADAS", {
          left: centerX - (panelW * 0.46) / 2,
          top: panelY + panelH * 0.64,
          width: panelW * 0.46,
          fontFamily: "Montserrat",
          fontSize: Math.round(width * 0.026),
          fontWeight: "900",
          fill: kind === "promo-luxo" ? "#17120d" : "#17120d",
          textAlign: "center",
          backgroundColor: "#f2cf76",
          name: "Botao premium",
        })
      );
      canvas.add(
        new fabric.Textbox("Studio Maos de Fadas", {
          left: centerX - (panelW * 0.7) / 2,
          top: panelY + panelH * 0.77,
          width: panelW * 0.7,
          fontFamily: "Great Vibes",
          fontSize: Math.round(width * 0.05),
          fill: kind === "promo-luxo" ? "#f3d37a" : "#d8b36b",
          textAlign: "center",
          name: "Assinatura",
        })
      );
      canvas.requestRenderAll();
      setLayerVersion((value) => value + 1);
      pushHistory();
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
    setLayerVersion((value) => value + 1);
    pushHistory();
  }

  function applySelected(patch: Partial<{
    fill: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    charSpacing: number;
    fontStyle: string;
    underline: boolean;
    linethrough: boolean;
    textAlign: string;
    backgroundColor: string;
    stroke: string;
    strokeWidth: number;
    shadow: string | null;
    opacity: number;
    flipX: boolean;
    flipY: boolean;
    rx: number;
    ry: number;
    clipPath: undefined;
  }>) {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    const { fill, stroke, strokeWidth, ...rest } = patch;
    if (fill) {
      applyFillDeep(active, fill);
    }
    if (stroke) {
      applyStrokeDeep(active, stroke, strokeWidth || 3);
    } else if (typeof strokeWidth === "number") {
      active.set({ strokeWidth });
    }
    active.set(rest);
    canvas.requestRenderAll();
    pushHistory();
    setSelected(active);
  }

  function transformSelectedText(mode: "upper" | "lower") {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject() as (FabricObject & { text?: string }) | undefined;
    if (!canvas || !active || typeof active.text !== "string") return;
    active.set({ text: mode === "upper" ? active.text.toUpperCase() : active.text.toLowerCase() });
    canvas.requestRenderAll();
    pushHistory();
    setSelected(active);
  }

  function toggleTransparentBackground() {
    const canvas = canvasRef.current;
    const next = !transparentBackground;
    setTransparentBackground(next);
    if (canvas) {
      canvas.backgroundColor = next ? "" : "#fff7e6";
      canvas.requestRenderAll();
      pushHistory();
    }
  }

  async function removeSelectedImageBackground() {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject() as (FabricObject & {
      getElement?: () => HTMLImageElement | HTMLCanvasElement;
      setSrc?: (src: string, options?: { crossOrigin?: string }) => Promise<void>;
    }) | null;
    if (!fabric || !canvas || !active || active.type !== "image" || !active.getElement) {
      setStatus("Selecione uma foto para remover o fundo.");
      return;
    }

    try {
      const source = active.getElement();
      const width = source instanceof HTMLImageElement ? source.naturalWidth || source.width : source.width;
      const height = source instanceof HTMLImageElement ? source.naturalHeight || source.height : source.height;
      const scratch = document.createElement("canvas");
      scratch.width = width;
      scratch.height = height;
      const context = scratch.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(source, 0, 0, width, height);
      const image = context.getImageData(0, 0, width, height);
      const data = image.data;
      const corner = [data[0], data[1], data[2]];

      for (let index = 0; index < data.length; index += 4) {
        const color = [data[index], data[index + 1], data[index + 2]];
        const brightness = (color[0] + color[1] + color[2]) / 3;
        const saturation = Math.max(...color) - Math.min(...color);
        const closeToCorner = colorDistance(color, corner) < 72;
        const plainLight = brightness > 226 && saturation < 42;
        if (closeToCorner || plainLight) {
          data[index + 3] = 0;
        }
      }

      context.putImageData(image, 0, 0);
      const cleaned = scratch.toDataURL("image/png");
      await active.setSrc?.(cleaned, { crossOrigin: "anonymous" });
      active.set({ dirty: true });
      canvas.requestRenderAll();
      pushHistory();
      setSelected(active);
      setStatus("Fundo claro removido da foto.");
    } catch {
      setStatus("Nao consegui remover o fundo desta imagem. Tente uma foto com fundo claro.");
    }
  }

  function selectedTextValue(key: "fontSize" | "fontFamily" | "fill") {
    const value = selected?.get(key);
    return typeof value === "string" || typeof value === "number" ? value : "";
  }

  function selectedNumberValue(key: "opacity") {
    const value = selected?.get(key);
    return typeof value === "number" ? value : key === "opacity" ? 1 : 0;
  }

  function applyImageFilter(kind: "auto" | "grayscale" | "blur" | "warm" | "contrast" | "saturate" | "reset") {
    const fabric = fabricRef.current as (FabricModule & {
      filters?: Record<string, new (options?: Record<string, unknown>) => unknown>;
    }) | null;
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject() as (FabricObject & {
      filters?: unknown[];
      applyFilters?: () => void;
    }) | null;
    if (!fabric || !canvas || !active || active.type !== "image") {
      setStatus("Selecione uma foto para aplicar filtros.");
      return;
    }

    const filters = fabric.filters || {};
    if (kind === "reset") {
      active.filters = [];
    } else {
      const nextFilters: unknown[] = [];
      if (kind === "auto") {
        if (filters.Brightness) nextFilters.push(new filters.Brightness({ brightness: 0.06 }));
        if (filters.Contrast) nextFilters.push(new filters.Contrast({ contrast: 0.08 }));
        if (filters.Saturation) nextFilters.push(new filters.Saturation({ saturation: 0.12 }));
      }
      if (kind === "grayscale" && filters.Grayscale) nextFilters.push(new filters.Grayscale());
      if (kind === "blur" && filters.Blur) nextFilters.push(new filters.Blur({ blur: 0.18 }));
      if (kind === "warm") {
        if (filters.Brightness) nextFilters.push(new filters.Brightness({ brightness: 0.04 }));
        if (filters.Saturation) nextFilters.push(new filters.Saturation({ saturation: 0.18 }));
      }
      if (kind === "contrast" && filters.Contrast) nextFilters.push(new filters.Contrast({ contrast: 0.18 }));
      if (kind === "saturate" && filters.Saturation) nextFilters.push(new filters.Saturation({ saturation: 0.3 }));
      active.filters = nextFilters;
    }

    active.applyFilters?.();
    active.set({ dirty: true });
    canvas.requestRenderAll();
    pushHistory();
    setSelected(active);
    setStatus(kind === "reset" ? "Filtros removidos." : "Filtro aplicado na foto.");
  }

  function applyImageAdjust(kind: "brightness" | "contrast" | "saturation" | "blur", value: number) {
    const fabric = fabricRef.current as (FabricModule & {
      filters?: Record<string, new (options?: Record<string, unknown>) => unknown>;
    }) | null;
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject() as (FabricObject & {
      filters?: unknown[];
      applyFilters?: () => void;
    }) | null;
    if (!fabric || !canvas || !active || active.type !== "image") return;
    const FilterClass =
      kind === "brightness"
        ? fabric.filters?.Brightness
        : kind === "contrast"
          ? fabric.filters?.Contrast
          : kind === "saturation"
            ? fabric.filters?.Saturation
            : fabric.filters?.Blur;
    if (!FilterClass) return;
    active.filters = [new FilterClass({ [kind === "blur" ? "blur" : kind]: value })];
    active.applyFilters?.();
    active.set({ dirty: true });
    canvas.requestRenderAll();
    pushHistory();
    setSelected(active);
  }

  function cropSelectedImage(shape: "circle" | "square") {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!fabric || !canvas || !active || active.type !== "image") return;
    const width = active.width || 240;
    const height = active.height || 240;
    active.set({
      clipPath:
        shape === "circle"
          ? new fabric.Circle({
              radius: Math.min(width, height) / 2,
              originX: "center",
              originY: "center",
            })
          : new fabric.Rect({
              width: Math.min(width, height),
              height: Math.min(width, height),
              originX: "center",
              originY: "center",
            }),
    });
    canvas.requestRenderAll();
    pushHistory();
    setSelected(active);
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
    applyCanvasDisplayScale(canvas || null, artSize.width, artSize.height, value);
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

  function selectLayer(object: FabricObject) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    setSelected(object);
    setRightPanelMode("inspector");
  }

  function toggleLayerVisibility(object: FabricObject) {
    object.set({ visible: !object.visible });
    canvasRef.current?.requestRenderAll();
    setLayerVersion((value) => value + 1);
    pushHistory();
  }

  function renameLayer(object: FabricObject) {
    const current = objectLabel(object);
    const next = window.prompt("Nome da camada", current);
    if (!next) return;
    (object as FabricObject & { name?: string }).name = next;
    setLayerVersion((value) => value + 1);
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
      multiplier: 2,
    });
    downloadDataUrl(dataUrl, `${safeFileName(projectName || publicSlug)}.${formatType === "jpeg" ? "jpg" : "png"}`);
  }

  function exportSvg() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    const svg = canvas.toSVG({
      suppressPreamble: false,
      width: String(artSize.width),
      height: String(artSize.height),
      viewBox: {
        x: 0,
        y: 0,
        width: artSize.width,
        height: artSize.height,
      },
    });
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, `${safeFileName(projectName || publicSlug)}.svg`);
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  async function exportPdf() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { jsPDF } = await import("jspdf");
    const dataUrl = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
    const pdf = new jsPDF({
      orientation: artSize.width > artSize.height ? "landscape" : "portrait",
      unit: "px",
      format: [artSize.width, artSize.height],
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, artSize.width, artSize.height);
    pdf.save(`${safeFileName(projectName || publicSlug)}.pdf`);
  }

  function readLocalProjects() {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(LOCAL_PROJECTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as EditorProject[]) : [];
    } catch {
      return [];
    }
  }

  function writeLocalProjects(nextProjects: EditorProject[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      LOCAL_PROJECTS_KEY,
      JSON.stringify(nextProjects.slice(0, 30))
    );
  }

  async function loadProjects() {
    const session = await getUsuarioLogado();
    if (!session.ok || !session.idSalao) {
      setProjects(readLocalProjects());
      setStatus("Projetos carregados deste navegador.");
      return;
    }
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
    if (!canvas) return;
    const payload = canvas.toJSON();
    const thumbnail = canvas.toDataURL({ format: "png", quality: 0.8, multiplier: 0.22 });
    if (isPublicEditorRoute()) {
      const now = new Date().toISOString();
      const localId = projectSlug || slugifyProjectName(projectName);
      const localProject: EditorProject = {
        id: localId,
        nome: projectName || "Arte sem titulo",
        formato: format,
        largura: artSize.width,
        altura: artSize.height,
        thumbnail_url: thumbnail,
        payload_json: payload,
        updated_at: now,
      };
      const nextProjects = [
        localProject,
        ...readLocalProjects().filter((project) => project.id !== localId),
      ];
      writeLocalProjects(nextProjects);
      setProjectId(localId);
      setProjectSlug(localId);
      setProjects(nextProjects);
      setStatus("Projeto salvo neste navegador.");
      const path = `/salaopremiuneditor/${localId}`;
      window.history.replaceState(null, "", path);
      return;
    }

    const session = await getUsuarioLogado();
    if (!session.ok || !session.idSalao) {
      setStatus("Projeto salvo apenas em modo local quando o editor esta publico.");
      return;
    }

    const supabase = asLooseSupabaseClient(session.supabase);
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
    setProjectStarted(true);
    setProjectId(project.id);
    setProjectName(project.nome);
    setProjectSlug(project.id);
    setFormat(project.formato);
    setArtSize({ width: project.largura, height: project.altura });
    const nextZoom = fitZoom(project.largura, project.altura);
    setZoom(nextZoom);
    canvas.setDimensions({ width: project.largura, height: project.altura });
    applyCanvasDisplayScale(canvas, project.largura, project.altura, nextZoom);
    await canvas.loadFromJSON(project.payload_json);
    canvas.requestRenderAll();
    loadingJsonRef.current = false;
    historyRef.current = [JSON.stringify(canvas.toJSON())];
    futureRef.current = [];
    const path = `/salaopremiuneditor/${project.id}`;
    window.history.replaceState(null, "", path);
  }

  async function duplicateProject(project: EditorProject) {
    await openProject(project);
    setProjectId(null);
    setProjectName(`${project.nome} copia`);
    setStatus("Projeto duplicado. Clique em salvar para gravar a copia.");
  }

  useEffect(() => {
    if (!initialProjectSlug || loadedInitialSlugRef.current === initialProjectSlug) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    loadedInitialSlugRef.current = initialProjectSlug;
    const localProject = readLocalProjects().find((project) => project.id === initialProjectSlug);
    if (localProject) {
      openProject(localProject);
      return;
    }
    const nextName = titleFromSlug(initialProjectSlug);
    setProjectStarted(true);
    setProjectName(nextName);
    setProjectSlug(initialProjectSlug);
    setProjectId(initialProjectSlug);
    resizeProject(DEFAULT_WIDTH, DEFAULT_HEIGHT, "feed");
  }, [initialProjectSlug, resizeProject]);

  if (!open) return null;

  if (!projectStarted) {
    return (
      <div className="fixed inset-0 z-[90] overflow-hidden bg-[#f7f7f5] text-zinc-950">
        <canvas ref={canvasElRef} className="hidden" />
        <header className="flex h-[72px] items-center justify-between border-b border-zinc-200 bg-white px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#111111] text-[#d8b36b]">
              <Scissors size={21} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-lg font-black leading-none">
                SalaoPremiun Editor
                <span className="rounded-full bg-[#f3ead2] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#8b6a28]">
                  desenvolvimento
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-zinc-500">Escolha um formato para comecar em branco ou use um modelo pronto.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50" aria-label="Fechar editor">
            <X size={19} />
          </button>
        </header>

        <main className="h-[calc(100vh-72px)] overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-7xl">
            <section className="mb-9 overflow-hidden rounded-[34px] border border-zinc-200 bg-white shadow-sm">
              <div className="relative px-8 py-10 lg:px-12">
                <div className="absolute right-10 top-8 h-24 w-24 rounded-full border border-[#d8b36b]/40" />
                <div className="absolute bottom-8 right-32 h-3 w-32 rounded-full bg-[#d8b36b]" />
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8b6a28]">SalaoPremiun Editor</p>
                <h1 className="mt-4 max-w-3xl text-5xl font-black tracking-tight text-zinc-950">Bora criar uma arte bonita para o salao?</h1>
                <div className="mt-8 flex max-w-3xl items-center gap-3 rounded-2xl border border-zinc-200 bg-[#f7f7f5] px-5 py-4">
                  <Search size={20} className="text-zinc-500" />
                  <input className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none" placeholder="Busque modelos, posts, agenda aberta, combo, depoimento..." />
                </div>
                <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {quickCreateCards.map((card) => (
                    <button
                      key={card.label}
                      type="button"
                      onClick={() => startProject({ width: card.format.width, height: card.format.height, formato: card.format.formato, name: `${card.label} sem titulo` })}
                      className="group rounded-3xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#d8b36b] hover:shadow-xl"
                    >
                      <div className="mb-4 flex h-24 items-end overflow-hidden rounded-2xl border border-zinc-100 bg-[#f8f8f7] p-3">
                        <div className="h-12 w-12 rounded-2xl" style={{ backgroundColor: card.color }} />
                        <div className="ml-auto h-16 w-10 rounded-t-full border border-[#d8b36b]" />
                      </div>
                      <div className="text-sm font-black">{card.label}</div>
                      <div className="mt-1 text-xs font-bold text-zinc-500">{card.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="mb-8 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black">Comecar em branco</h2>
                <button type="button" onClick={() => startProject({ width: customWidth, height: customHeight, formato: "personalizado", name: "Projeto personalizado" })} className="rounded-xl border border-[#d8b36b] bg-[#111111] px-4 py-2 text-xs font-black text-[#d8b36b]">
                  Usar tamanho personalizado
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {projectFormats.map((item) => (
                  <button
                    key={item.formato}
                    type="button"
                    onClick={() => startProject({ width: item.width, height: item.height, formato: item.formato, name: `${item.label} sem titulo` })}
                    className="rounded-2xl border border-zinc-200 bg-[#fbfbfa] p-4 text-left transition hover:border-[#d8b36b]"
                  >
                    <div className="text-sm font-black">{item.label}</div>
                    <div className="mt-1 text-xs font-bold text-zinc-500">{item.width}x{item.height}</div>
                  </button>
                ))}
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-[#fbfbfa] p-3">
                  <input type="number" value={customWidth} onChange={(event) => setCustomWidth(Number(event.target.value || 1080))} className="h-10 rounded-xl border border-zinc-200 px-2 text-xs font-black" />
                  <input type="number" value={customHeight} onChange={(event) => setCustomHeight(Number(event.target.value || 1080))} className="h-10 rounded-xl border border-zinc-200 px-2 text-xs font-black" />
                </div>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black">Comece com um modelo</h2>
                <button type="button" onClick={loadProjects} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-black">Ver projetos salvos</button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {startCards.map((card) => (
                  <button
                    key={card.kind}
                    type="button"
                    onClick={() => startProject({
                      width: card.kind === "blank" ? DEFAULT_WIDTH : 1080,
                      height: card.kind === "blank" ? DEFAULT_HEIGHT : card.kind === "agenda-glam" ? 1920 : 1350,
                      formato: card.kind === "agenda-glam" ? "story" : "feed",
                      templateKind: card.kind,
                      name: card.label,
                    })}
                    className="group overflow-hidden rounded-[28px] border border-zinc-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-[#d8b36b] hover:shadow-2xl"
                  >
                    <div className="relative h-44 bg-[#111111]">
                      <div className="absolute inset-5 rounded-2xl border border-[#d8b36b]/60 bg-white" />
                      <div className="absolute left-8 top-8 h-16 w-16 rounded-full bg-[#d8b36b]/30" />
                      <div className="absolute bottom-8 left-8 right-8 h-3 rounded-full bg-[#d8b36b]" />
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-black">{card.label}</h3>
                        <ArrowRight className="transition group-hover:translate-x-1" size={18} />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-zinc-500">{card.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden bg-[#f7f7f5]">
      <div className="flex h-dvh flex-col bg-[#f7f7f5] text-zinc-950">
        <header className="flex h-[66px] shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4">
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
                SalaoPremiun Editor
                <span className="rounded-full bg-[#f3ead2] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#8b6a28]">
                  Beta
                </span>
              </div>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                onBlur={applyProjectNameToUrl}
                className="mt-1 w-72 rounded-lg border border-transparent bg-transparent text-xs font-semibold text-zinc-500 outline-none focus:border-zinc-200 focus:bg-zinc-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status ? <span className="hidden rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-600 lg:inline-flex">{status}</span> : null}
            <HeaderButton label="Salvar" onClick={saveProject}><Save size={16} /></HeaderButton>
            <HeaderButton label="Camadas" onClick={() => setRightPanelMode((mode) => mode === "layers" ? "none" : "layers")}><Layers size={16} /></HeaderButton>
            <HeaderButton label="Desfazer" onClick={undo}><Undo2 size={16} /></HeaderButton>
            <HeaderButton label="Refazer" onClick={redo}><Redo2 size={16} /></HeaderButton>
            <HeaderButton label="PNG" onClick={() => exportImage("png")}><Download size={16} /></HeaderButton>
            <HeaderButton label="JPG" onClick={() => exportImage("jpeg")}><Download size={16} /></HeaderButton>
            <HeaderButton label="SVG" onClick={exportSvg}><Download size={16} /></HeaderButton>
            <HeaderButton label="PDF" onClick={exportPdf}><Download size={16} /></HeaderButton>
            <button type="button" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50" aria-label="Fechar editor">
              <X size={19} />
            </button>
          </div>
        </header>

        <div
          className="grid min-h-0 flex-1 grid-cols-1"
          style={{ gridTemplateColumns: `${activeTab ? "400px" : "76px"} minmax(0,1fr) ${rightPanelOpen ? "320px" : "0px"}` }}
        >
          <aside className="min-h-0 border-r border-zinc-200 bg-white">
            <div className="flex h-full">
            <nav className="flex w-[88px] shrink-0 flex-col items-center gap-1 border-r border-zinc-200 bg-white px-2 py-3">
              {tabConfig.map((tab) => {
                const Icon = tab.icon;
                const openTab = () => {
                  setActiveTab((current) => current === tab.id ? null : tab.id);
                  if (tab.id === "projetos") loadProjects();
                };
                return (
                  <button key={tab.id} type="button" onMouseEnter={() => setActiveTab(tab.id)} onClick={openTab} className={`group relative flex h-[62px] w-full flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-black leading-tight transition ${activeTab === tab.id ? "bg-[#111111] text-[#d8b36b] shadow-sm" : "text-zinc-500 hover:bg-[#f7f7f5]"}`} aria-pressed={activeTab === tab.id}>
                    <Icon size={14} />
                    {tab.label}
                    <span className={`absolute left-full top-1/2 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-bold text-zinc-700 shadow-lg ${activeTab === tab.id ? "" : "group-hover:block"}`}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </nav>
            {activeTab ? <div className="min-w-0 flex-1 overflow-y-auto p-4">

            {activeTab === "modelos" ? (
              <Panel title="Novo projeto" icon={<Layers size={15} />}>
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-[#f7f7f5] px-3 py-2">
                  <Search size={16} className="text-zinc-400" />
                  <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" placeholder="Descreva seu design ideal" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {projectFormats.map((item) => (
                    <button key={item.formato} type="button" onClick={() => resizeProject(item.width, item.height, item.formato)} className="rounded-xl border border-zinc-200 bg-[#fbfbfa] px-3 py-2 text-left text-xs font-black text-zinc-800 transition hover:border-[#d8b36b]">
                      {item.label}<br /><span className="text-[10px] text-zinc-500">{item.width}x{item.height}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {templates.map((item) => (
                    <button key={item.kind} type="button" onClick={() => addTemplate(item.kind)} className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left text-xs font-black text-zinc-800 shadow-sm transition hover:border-[#d8b36b]">
                      <div className="relative h-28 bg-[#111111] p-3">
                        <div className="h-full rounded-xl border border-[#d8b36b]/70 bg-white" />
                        <div className="absolute left-6 top-6 h-4 w-24 rounded-full bg-[#111111]" />
                        <div className="absolute bottom-6 left-6 h-3 w-20 rounded-full bg-[#d8b36b]" />
                      </div>
                      <div className="p-3">
                        <div>{item.label}</div>
                        <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-zinc-500">{item.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-6">
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Blocos rapidos</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["price-list", "Tabela de precos"],
                      ["testimonial", "Depoimento"],
                      ["coupon", "Cupom"],
                      ["availability", "Horarios livres"],
                      ["stars", "5 estrelas"],
                    ].map(([kind, label]) => (
                      <button key={kind} type="button" onClick={() => addMarketingBlock(kind as Parameters<typeof addMarketingBlock>[0])} className="rounded-xl border border-zinc-200 bg-[#fff8e7] p-3 text-left text-xs font-black text-zinc-800 transition hover:border-[#d8b36b]">
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </Panel>
            ) : null}

            {activeTab === "texto" ? (
              <Panel title="Texto avancado" icon={<Type size={15} />}>
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-[#f7f7f5] px-3 py-2">
                  <Search size={16} className="text-zinc-400" />
                  <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" placeholder="Busque fontes e combinacoes" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => addText("title")} className="h-10 rounded-xl bg-zinc-950 text-xs font-black text-white">Titulo</button>
                  <button type="button" onClick={() => addText("subtitle")} className="h-10 rounded-xl border border-zinc-200 bg-white text-xs font-black">Subtitulo</button>
                </div>
                <div className="mt-5 space-y-2">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Estilos prontos</div>
                  {textPresets.map((preset) => (
                    <button key={preset.label} type="button" onClick={() => addTextPreset(preset)} className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-[#d8b36b]">
                      <div className="truncate" style={{ fontFamily: preset.fontFamily, fontSize: Math.min(28, preset.fontSize / 2), fontWeight: preset.fontWeight, color: preset.fill }}>
                        {preset.text}
                      </div>
                      <div className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-zinc-400">{preset.label}</div>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={toggleTransparentBackground} className={`mt-3 h-10 w-full rounded-xl border text-xs font-black ${transparentBackground ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-white text-zinc-800"}`}>
                  Fundo {transparentBackground ? "transparente ativo" : "transparente"}
                </button>
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-[#fff8e7] p-3 text-xs font-semibold text-zinc-600">
                  Selecione um texto na arte para liberar fonte, cor, sombra, contorno, alinhamento e efeitos no painel da direita.
                </div>
              </Panel>
            ) : null}

            {activeTab === "formas" ? (
              <Panel title="Ferramentas" icon={<PenLine size={15} />}>
                <div className="mb-5 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => addText("title")} className="rounded-xl border border-zinc-200 bg-white p-3 text-xs font-black">Texto</button>
                  <button type="button" onClick={addTableBlock} className="rounded-xl border border-zinc-200 bg-white p-3 text-xs font-black">Tabela</button>
                  <button type="button" onClick={() => addStickyNote()} className="rounded-xl border border-zinc-200 bg-white p-3 text-xs font-black">Nota</button>
                  <button type="button" onClick={() => addShape("line")} className="rounded-xl border border-zinc-200 bg-white p-3 text-xs font-black">Linha</button>
                  <button type="button" onClick={() => addShape("rect")} className="rounded-xl border border-zinc-200 bg-white p-3 text-xs font-black">Forma</button>
                  <button type="button" onClick={() => setShowGrid((value) => !value)} className="rounded-xl border border-zinc-200 bg-white p-3 text-xs font-black">Grade</button>
                </div>
                <div className="mb-5">
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Notas adesivas</div>
                  <div className="grid grid-cols-5 gap-2">
                    {["#f6d365", "#fda4af", "#93c5fd", "#86efac", "#ffffff"].map((color) => (
                      <button key={color} type="button" onClick={() => addStickyNote(color)} className="h-11 rounded-xl border border-zinc-200 shadow-sm" style={{ backgroundColor: color }} aria-label={`Nota ${color}`} />
                    ))}
                  </div>
                </div>
                <div className="mb-5">
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Molduras e mockups</div>
                  <div className="grid grid-cols-2 gap-2">
                    {framePresets.map((frame) => (
                      <button key={frame.kind} type="button" onClick={() => addFramePreset(frame.kind)} className="rounded-2xl border border-zinc-200 bg-white p-3 text-left text-xs font-black transition hover:border-[#d8b36b]">
                        <div className="mb-2 h-20 rounded-xl border-2 border-dashed border-[#d8b36b] bg-[#f7f7f5]" />
                        {frame.label}<br /><span className="text-[10px] text-zinc-500">{frame.ratio}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["rect", "Retangulo"],
                    ["circle", "Circulo"],
                    ["line", "Linha"],
                    ["arrow", "Seta"],
                    ["star", "Estrela"],
                    ["heart", "Coracao"],
                    ["badge", "Selo"],
                    ["tag", "Tag"],
                    ["speech", "Balao"],
                    ["frame", "Moldura"],
                    ["separator", "Separador"],
                    ["qr-corners", "Cantoneiras"],
                  ].map(([kind, label]) => (
                    <button key={kind} type="button" onClick={() => addShape(kind as Parameters<typeof addShape>[0])} className="rounded-xl border border-zinc-200 bg-white p-2 text-xs font-bold transition hover:border-[#d8b36b]">
                      {label}
                    </button>
                  ))}
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
                <div className="mb-4 flex flex-wrap gap-2">
                  {elementCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setElementCategory(category)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-black transition ${elementCategory === category ? "border-[#d8b36b] bg-[#111111] text-[#f3d37a]" : "border-zinc-200 bg-[#fff8e7] text-[#8a5a12] hover:border-[#d8b36b]"}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {filteredElementPresets.map((preset) => (
                    <button key={preset.src} type="button" onClick={() => addSvgFromUrl(preset.src, preset.label, 240)} className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-xs font-black text-zinc-800 shadow-sm transition hover:border-[#d8b36b]">
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
                <button type="button" onClick={removeSelectedImageBackground} className="mt-3 h-10 w-full rounded-xl border border-zinc-200 bg-white text-xs font-black text-zinc-800 transition hover:border-[#d8b36b]">
                  Remover fundo da foto selecionada
                </button>
                <div className="mt-5">
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Imagens enviadas</div>
                  {uploadedAssets.length ? (
                    <div className="grid grid-cols-2 gap-2">
                      {uploadedAssets.map((asset) => (
                        <button key={asset.id} type="button" onClick={() => addImageFromUrl(asset.src, asset.name, 440)} className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                          <img src={asset.src} alt={asset.name} className="h-28 w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-zinc-200 bg-[#f7f7f5] p-3 text-xs font-semibold text-zinc-500">As fotos que voce subir aparecem aqui para reutilizar no projeto.</p>
                  )}
                </div>
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
            </div> : null}
            </div>
          </aside>

          <main className="relative flex min-h-0 flex-col items-center overflow-auto bg-[#f0f0ee] p-4 lg:p-6">
            {selected ? (
              <div className="sticky top-0 z-20 mb-4 flex max-w-full flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white/95 px-3 py-2 shadow-lg shadow-black/10 backdrop-blur">
                {isTextSelected ? (
                  <>
                    <select value={String(selectedTextValue("fontFamily") || "Montserrat")} onChange={(event) => applySelected({ fontFamily: event.target.value })} className="h-9 w-36 rounded-lg border border-zinc-200 bg-white px-2 text-sm font-bold outline-none">
                      {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
                    </select>
                    <div className="flex h-9 items-center overflow-hidden rounded-lg border border-zinc-200">
                      <button type="button" onClick={() => applySelected({ fontSize: Math.max(8, Number(selectedTextValue("fontSize") || 32) - 2) })} className="h-9 px-3 text-sm font-black">-</button>
                      <input value={Number(selectedTextValue("fontSize") || 32)} onChange={(event) => applySelected({ fontSize: Number(event.target.value || 32) })} className="h-9 w-12 border-x border-zinc-200 text-center text-sm font-black outline-none" />
                      <button type="button" onClick={() => applySelected({ fontSize: Number(selectedTextValue("fontSize") || 32) + 2 })} className="h-9 px-3 text-sm font-black">+</button>
                    </div>
                  </>
                ) : (
                  <span className="mr-1 text-sm font-black">Editar</span>
                )}
                <div className="h-6 w-px bg-zinc-200" />
                <div className="relative">
                  <ToolButton label="Cor" onClick={() => setColorPanelOpen((value) => !value)}><span className="flex h-6 w-6 items-center justify-center border-b-4 border-[#d8b36b] text-sm font-black">A</span></ToolButton>
                  {colorPanelOpen ? (
                    <div className="absolute left-0 top-12 z-30 w-72 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl shadow-black/15">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-black">Cor do elemento</span>
                        <button type="button" onClick={() => setColorPanelOpen(false)} className="text-zinc-500 hover:text-zinc-950">×</button>
                      </div>
                      <input
                        type="color"
                        value={String(selectedTextValue("fill") || "#111111")}
                        onChange={(event) => applySelected({ fill: event.target.value })}
                        className="mb-4 h-10 w-full rounded-xl border"
                      />
                      <div className="mb-2 text-xs font-black text-zinc-500">Cores no documento</div>
                      <div className="flex flex-wrap gap-2">
                        {documentColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => applySelected({ fill: color })}
                            className="h-9 w-9 rounded-full border border-zinc-200 shadow-sm"
                            style={{ backgroundColor: color }}
                            aria-label={`Aplicar cor ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                {isTextSelected ? (
                  <>
                    <ToolButton label="Negrito" onClick={() => applySelected({ fontWeight: "900" })}><span className="text-base font-black">B</span></ToolButton>
                    <ToolButton label="Italico" onClick={() => applySelected({ fontStyle: "italic" })}><Italic size={15} /></ToolButton>
                    <ToolButton label="Sublinhado" onClick={() => applySelected({ underline: true })}><Underline size={15} /></ToolButton>
                    <ToolButton label="Tachado" onClick={() => applySelected({ linethrough: true })}><span className="text-sm font-black line-through">S</span></ToolButton>
                    <ToolButton label="Caixa alta" onClick={() => transformSelectedText("upper")}><span className="text-sm font-black">aA</span></ToolButton>
                    <ToolButton label="Alinhar esquerda" onClick={() => applySelected({ textAlign: "left" })}><AlignLeft size={15} /></ToolButton>
                    <ToolButton label="Alinhar centro" onClick={() => applySelected({ textAlign: "center" })}><AlignCenter size={15} /></ToolButton>
                    <ToolButton label="Alinhar direita" onClick={() => applySelected({ textAlign: "right" })}><AlignRight size={15} /></ToolButton>
                    <button type="button" onClick={() => applySelected({ shadow: "0px 10px 22px rgba(0,0,0,0.25)" })} className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-black">Efeitos</button>
                    <button type="button" onClick={() => applySelected({ opacity: 0.72 })} className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-black">Transp.</button>
                    <button type="button" onClick={() => setRightPanelMode("inspector")} className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-black">Posicao</button>
                  </>
                ) : null}
                <ToolButton label="Centro H" onClick={() => alignSelected("h")}><AlignHorizontalJustifyCenter size={15} /></ToolButton>
                <ToolButton label="Centro V" onClick={() => alignSelected("v")}><AlignVerticalJustifyCenter size={15} /></ToolButton>
                <div className="h-6 w-px bg-zinc-200" />
                <ToolButton label="Frente" onClick={() => moveLayer("front")}><BringToFront size={15} /></ToolButton>
                <ToolButton label="Atras" onClick={() => moveLayer("back")}><Layers size={15} /></ToolButton>
                <ToolButton label="Agrupar" onClick={groupSelected}><Group size={15} /></ToolButton>
                <ToolButton label="Desagrupar" onClick={ungroupSelected}><Ungroup size={15} /></ToolButton>
                <ToolButton label={selectedLocked ? "Destravar" : "Travar"} onClick={() => lockSelected(!selectedLocked)}>{selectedLocked ? <Unlock size={15} /> : <Lock size={15} />}</ToolButton>
                <button type="button" onClick={() => {
                  const canvas = canvasRef.current;
                  canvas?.getActiveObjects().forEach((object) => canvas.remove(object));
                  canvas?.discardActiveObject();
                  canvas?.requestRenderAll();
                  setSelected(null);
                  setRightPanelMode("none");
                  pushHistory();
                }} className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-transparent px-2 text-zinc-700 transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600" title="Apagar">
                  <Trash2 size={15} />
                </button>
              </div>
            ) : (
              <div className="mb-4 h-[42px]" />
            )}

            <div className="flex min-h-[calc(100vh-170px)] w-full items-start justify-center overflow-auto rounded-2xl bg-[#f0f0ee] px-6 pb-20 pt-2">
            <div className="rounded-[10px] border border-zinc-200 bg-white shadow-2xl shadow-black/10">
              <div
                className={showGrid ? "bg-[linear-gradient(rgba(0,0,0,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.045)_1px,transparent_1px)] bg-[size:32px_32px]" : ""}
                style={{ width: artSize.width * zoom, height: artSize.height * zoom }}
              >
                <canvas ref={canvasElRef} />
              </div>
            </div>
            </div>
            <div className="pointer-events-none sticky bottom-0 z-20 flex w-full items-center justify-end gap-4 bg-gradient-to-t from-[#f0f0ee] via-[#f0f0ee]/95 to-transparent px-4 pb-2 pt-5">
              <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-zinc-200 bg-white/95 px-3 py-2 shadow-lg shadow-black/10 backdrop-blur">
                <ToolButton label="Zoom -" onClick={() => changeZoom(zoom - 0.08)}><ZoomOut size={15} /></ToolButton>
                <input
                  aria-label="Zoom"
                  type="range"
                  min={0.12}
                  max={1.4}
                  step={0.02}
                  value={zoom}
                  onChange={(event) => changeZoom(Number(event.target.value))}
                  className="w-36 accent-[#d8b36b]"
                />
                <span className="w-10 text-center text-xs font-black">{Math.round(zoom * 100)}%</span>
                <ToolButton label="Zoom +" onClick={() => changeZoom(zoom + 0.08)}><ZoomIn size={15} /></ToolButton>
                <div className="h-6 w-px bg-zinc-200" />
                <ToolButton label="Grade" onClick={() => setShowGrid((value) => !value)}><Grid3X3 size={15} /></ToolButton>
                <span className="px-2 text-xs font-black text-zinc-600">1/1</span>
              </div>
            </div>
          </main>

          {rightPanelOpen ? (
          <aside className="min-h-0 overflow-y-auto border-l border-zinc-200 bg-white p-4">
            {rightPanelMode === "inspector" && selected ? (
            <Panel title="Elemento selecionado" icon={<Palette size={15} />}>
              {selected ? (
                <div className="space-y-3">
                  <div className="text-sm font-black">{objectLabel(selected)}</div>
                  <label className="block text-xs font-black text-zinc-500">Cor
                    <input type="color" value={String(selectedTextValue("fill") || "#111111")} onChange={(event) => applySelected({ fill: event.target.value })} className="mt-1 h-10 w-full rounded-xl border" />
                  </label>
                  <div className="rounded-2xl border border-zinc-200 bg-[#f7f7f5] p-3">
                    <div className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-zinc-500">Cores do projeto</div>
                    <div className="flex flex-wrap gap-2">
                      {documentColors.map((color) => (
                        <button
                          key={`inspector-${color}`}
                          type="button"
                          onClick={() => applySelected({ fill: color })}
                          className="h-9 w-9 rounded-full border border-zinc-200 shadow-sm"
                          style={{ backgroundColor: color }}
                          aria-label={`Aplicar cor ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                  {isVectorSelected ? (
                    <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-3">
                      <div className="text-xs font-black uppercase tracking-[0.12em] text-zinc-500">Elemento SVG / forma</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => applySelected({ fill: "#111111" })} className="h-9 rounded-xl border bg-white text-xs font-black">Preto</button>
                        <button type="button" onClick={() => applySelected({ fill: "#d8b36b" })} className="h-9 rounded-xl border bg-white text-xs font-black">Dourado</button>
                        <button type="button" onClick={() => applySelected({ fill: "#ffffff" })} className="h-9 rounded-xl border bg-white text-xs font-black">Branco</button>
                        <button type="button" onClick={() => applySelected({ fill: "#ed4f8c" })} className="h-9 rounded-xl border bg-white text-xs font-black">Rosa</button>
                        <button type="button" onClick={() => applySelected({ stroke: "#d8b36b", strokeWidth: 5 })} className="h-9 rounded-xl border bg-white text-xs font-black">Contorno ouro</button>
                        <button type="button" onClick={() => applySelected({ stroke: "#111111", strokeWidth: 5 })} className="h-9 rounded-xl border bg-white text-xs font-black">Contorno preto</button>
                        <button type="button" onClick={() => applySelected({ shadow: "0px 18px 30px rgba(0,0,0,0.2)" })} className="h-9 rounded-xl border bg-white text-xs font-black">Sombra</button>
                        <button type="button" onClick={() => applySelected({ opacity: 0.65 })} className="h-9 rounded-xl border bg-white text-xs font-black">Transparente</button>
                      </div>
                    </div>
                  ) : null}
                  <label className={`${isTextSelected ? "block" : "hidden"} text-xs font-black text-zinc-500`}>Fonte
                    <select value={String(selectedTextValue("fontFamily") || "Montserrat")} onChange={(event) => applySelected({ fontFamily: event.target.value })} className="mt-1 h-10 w-full rounded-xl border px-3">
                      {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
                    </select>
                  </label>
                  <label className={`${isTextSelected ? "block" : "hidden"} text-xs font-black text-zinc-500`}>Tamanho
                    <input type="number" min={8} max={220} value={Number(selectedTextValue("fontSize") || 32)} onChange={(event) => applySelected({ fontSize: Number(event.target.value || 32) })} className="mt-1 h-10 w-full rounded-xl border px-3" />
                  </label>
                  <label className={`${isTextSelected ? "block" : "hidden"} text-xs font-black text-zinc-500`}>Espacamento letras
                    <input type="range" min={0} max={600} step={10} onChange={(event) => applySelected({ charSpacing: Number(event.target.value) })} className="mt-1 w-full" />
                  </label>
                  <label className="block text-xs font-black text-zinc-500">Opacidade
                    <input
                      type="range"
                      min={0.08}
                      max={1}
                      step={0.02}
                      value={selectedNumberValue("opacity")}
                      onChange={(event) => applySelected({ opacity: Number(event.target.value) })}
                      className="mt-1 w-full accent-[#8b3dff]"
                    />
                  </label>
                  <div className={`${isTextSelected ? "grid" : "hidden"} grid-cols-3 gap-2`}>
                    <button type="button" onClick={() => applySelected({ fontWeight: "900" })} className="h-10 rounded-xl border text-xs font-black">B</button>
                    <button type="button" onClick={() => applySelected({ fontStyle: "italic" })} className="h-10 rounded-xl border text-xs font-black"><Italic className="mx-auto" size={15} /></button>
                    <button type="button" onClick={() => applySelected({ underline: true })} className="h-10 rounded-xl border text-xs font-black"><Underline className="mx-auto" size={15} /></button>
                    <button type="button" onClick={() => applySelected({ linethrough: true })} className="h-10 rounded-xl border text-xs font-black">S</button>
                    <button type="button" onClick={() => transformSelectedText("upper")} className="h-10 rounded-xl border text-xs font-black">AA</button>
                    <button type="button" onClick={() => transformSelectedText("lower")} className="h-10 rounded-xl border text-xs font-black">aa</button>
                    <button type="button" onClick={() => applySelected({ textAlign: "left" })} className="h-10 rounded-xl border text-xs font-black"><AlignLeft className="mx-auto" size={15} /></button>
                    <button type="button" onClick={() => applySelected({ textAlign: "center" })} className="h-10 rounded-xl border text-xs font-black"><AlignCenter className="mx-auto" size={15} /></button>
                    <button type="button" onClick={() => applySelected({ textAlign: "right" })} className="h-10 rounded-xl border text-xs font-black"><AlignRight className="mx-auto" size={15} /></button>
                  </div>
                  <div className={`${isTextSelected ? "grid" : "hidden"} grid-cols-2 gap-2`}>
                    <button type="button" onClick={() => applySelected({ shadow: "0px 8px 14px rgba(0,0,0,0.25)" })} className="h-10 rounded-xl border text-xs font-black">Sombra suave</button>
                    <button type="button" onClick={() => applySelected({ shadow: "0px 16px 26px rgba(0,0,0,0.42)" })} className="h-10 rounded-xl border text-xs font-black">Sombra forte</button>
                    <button type="button" onClick={() => applySelected({ shadow: "0px 0px 18px #d8b36b" })} className="h-10 rounded-xl border text-xs font-black">Brilho dourado</button>
                    <button type="button" onClick={() => applySelected({ shadow: "0px 0px 18px #ed4f8c" })} className="h-10 rounded-xl border text-xs font-black">Neon</button>
                    <button type="button" onClick={() => applySelected({ backgroundColor: "#fff0b8" })} className="h-10 rounded-xl border text-xs font-black">Etiqueta</button>
                    <button type="button" onClick={() => applySelected({ stroke: "#ffffff", strokeWidth: 2 })} className="h-10 rounded-xl border text-xs font-black">Contorno</button>
                    <button type="button" onClick={() => applySelected({ shadow: null, strokeWidth: 0, backgroundColor: "" })} className="h-10 rounded-xl border text-xs font-black">Limpar estilo</button>
                  </div>
                  {selected.type === "image" ? (
                    <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                      <div className="text-xs font-black uppercase tracking-[0.12em] text-zinc-500">Imagem</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => applyImageFilter("auto")} className="h-9 rounded-xl border bg-white text-xs font-black">Auto</button>
                        <button type="button" onClick={() => applyImageFilter("warm")} className="h-9 rounded-xl border bg-white text-xs font-black">Quente</button>
                        <button type="button" onClick={() => applyImageFilter("contrast")} className="h-9 rounded-xl border bg-white text-xs font-black">Contraste</button>
                        <button type="button" onClick={() => applyImageFilter("saturate")} className="h-9 rounded-xl border bg-white text-xs font-black">Saturar</button>
                        <button type="button" onClick={() => applyImageFilter("grayscale")} className="h-9 rounded-xl border bg-white text-xs font-black">P&B</button>
                        <button type="button" onClick={() => applyImageFilter("blur")} className="h-9 rounded-xl border bg-white text-xs font-black">Blur</button>
                        <button type="button" onClick={() => applySelected({ flipX: !Boolean(selected.get("flipX")) })} className="h-9 rounded-xl border bg-white text-xs font-black">Espelhar H</button>
                        <button type="button" onClick={() => applySelected({ flipY: !Boolean(selected.get("flipY")) })} className="h-9 rounded-xl border bg-white text-xs font-black">Espelhar V</button>
                      </div>
                      <div className="space-y-2 pt-1">
                        <label className="block text-[11px] font-black text-zinc-500">Brilho
                          <input type="range" min={-0.5} max={0.5} step={0.02} defaultValue={0} onChange={(event) => applyImageAdjust("brightness", Number(event.target.value))} className="w-full accent-[#8b3dff]" />
                        </label>
                        <label className="block text-[11px] font-black text-zinc-500">Contraste
                          <input type="range" min={-0.5} max={0.5} step={0.02} defaultValue={0} onChange={(event) => applyImageAdjust("contrast", Number(event.target.value))} className="w-full accent-[#8b3dff]" />
                        </label>
                        <label className="block text-[11px] font-black text-zinc-500">Saturacao
                          <input type="range" min={-1} max={1} step={0.04} defaultValue={0} onChange={(event) => applyImageAdjust("saturation", Number(event.target.value))} className="w-full accent-[#8b3dff]" />
                        </label>
                        <label className="block text-[11px] font-black text-zinc-500">Blur
                          <input type="range" min={0} max={0.6} step={0.03} defaultValue={0} onChange={(event) => applyImageAdjust("blur", Number(event.target.value))} className="w-full accent-[#8b3dff]" />
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => applySelected({ rx: 34, ry: 34 })} className="h-9 rounded-xl border bg-white text-xs font-black">Cantos</button>
                        <button type="button" onClick={() => applySelected({ stroke: "#ffffff", strokeWidth: 12 })} className="h-9 rounded-xl border bg-white text-xs font-black">Moldura</button>
                        <button type="button" onClick={() => applySelected({ shadow: "0px 18px 32px rgba(0,0,0,0.25)" })} className="h-9 rounded-xl border bg-white text-xs font-black">Sombra</button>
                        <button type="button" onClick={() => cropSelectedImage("circle")} className="h-9 rounded-xl border bg-white text-xs font-black">Circulo</button>
                        <button type="button" onClick={() => cropSelectedImage("square")} className="h-9 rounded-xl border bg-white text-xs font-black">Quadrado</button>
                        <button type="button" onClick={() => applySelected({ clipPath: undefined })} className="h-9 rounded-xl border bg-white text-xs font-black">Livre</button>
                      </div>
                      <button type="button" onClick={removeSelectedImageBackground} className="h-10 w-full rounded-xl border border-zinc-200 bg-white text-xs font-black text-zinc-800 transition hover:border-[#d8b36b]">
                        Remover fundo claro
                      </button>
                      <button type="button" onClick={() => applyImageFilter("reset")} className="h-10 w-full rounded-xl border border-zinc-200 bg-white text-xs font-black text-zinc-800">
                        Limpar filtros
                      </button>
                    </div>
                  ) : null}
                  <button type="button" onClick={() => {
                    const canvas = canvasRef.current;
                    canvas?.getActiveObjects().forEach((object) => canvas.remove(object));
                    canvas?.discardActiveObject();
                    canvas?.requestRenderAll();
                    setSelected(null);
                    setRightPanelMode("none");
                    pushHistory();
                  }} className="h-10 w-full rounded-xl border border-rose-200 text-xs font-black text-rose-600">
                    <Trash2 className="mr-2 inline" size={14} /> Apagar
                  </button>
                </div>
              ) : (
                <p className="text-sm font-semibold text-zinc-500">Selecione um item para editar cor, fonte, tamanho, sombra, contorno e camadas.</p>
              )}
            </Panel>
            ) : null}
            {rightPanelMode === "layers" ? (
            <div>
              <Panel title="Camadas" icon={<Layers size={15} />}>
                <div className="space-y-2">
                  {canvasLayers.length ? canvasLayers.map((object, index) => (
                    <div key={`${objectLabel(object)}-${index}`} className={`rounded-xl border p-2 ${selected === object ? "border-[#d8b36b] bg-[#fff8e7]" : "border-zinc-200 bg-white"}`}>
                      <button type="button" onClick={() => selectLayer(object)} className="mb-2 block w-full truncate text-left text-xs font-black">
                        {objectLabel(object)}
                      </button>
                      <div className="grid grid-cols-5 gap-1">
                        <button type="button" onClick={() => toggleLayerVisibility(object)} className="h-8 rounded-lg border text-zinc-700">{object.visible === false ? <EyeOff className="mx-auto" size={13} /> : <Eye className="mx-auto" size={13} />}</button>
                        <button type="button" onClick={() => { selectLayer(object); lockSelected(!objectIsLocked(object)); }} className="h-8 rounded-lg border text-zinc-700"><Lock className="mx-auto" size={13} /></button>
                        <button type="button" onClick={() => { selectLayer(object); moveLayer("front"); }} className="h-8 rounded-lg border text-zinc-700"><BringToFront className="mx-auto" size={13} /></button>
                        <button type="button" onClick={() => { selectLayer(object); moveLayer("back"); }} className="h-8 rounded-lg border text-zinc-700"><Layers className="mx-auto" size={13} /></button>
                        <button type="button" onClick={() => renameLayer(object)} className="h-8 rounded-lg border text-zinc-700"><PenLine className="mx-auto" size={13} /></button>
                      </div>
                    </div>
                  )) : (
                    <p className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs font-semibold text-zinc-500">As camadas aparecem aqui conforme voce adiciona textos, imagens e formas.</p>
                  )}
                </div>
              </Panel>
            </div>
            ) : null}
          </aside>
          ) : null}
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
