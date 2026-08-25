"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  ExternalLink,
  Gift,
  Megaphone,
  Sparkles,
  Tag,
  X,
} from "lucide-react";

type Campanha = {
  id: string;
  origem?: "parceiro" | "salao_premium";
  categoria?: "novidade" | "beneficio" | "comunicado" | "critico" | null;
  label?: string;
  parceiro: string;
  titulo: string;
  subtitulo?: string | null;
  imagemUrl?: string | null;
  altText?: string | null;
  formato?: string | null;
  ctaTexto: string;
  destinoUrl?: string | null;
  cupomCodigo?: string | null;
  limiteFrequenciaDia?: number;
};

type Props = {
  idSalao?: string | null;
  publico?: "salao" | "cliente" | "profissional";
  local?: string;
  className?: string;
  allowedPaths?: string[];
};

const STORAGE_KEY = "salaopremium:campaigns:frequency:v2";
const VIEWER_KEY = "salaopremium:campaigns:viewer";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getViewerSeed() {
  if (typeof window === "undefined") return "server";
  let seed = window.localStorage.getItem(VIEWER_KEY);
  if (!seed) {
    seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VIEWER_KEY, seed);
  }
  return seed;
}

function readFrequency() {
  if (typeof window === "undefined") {
    return { counts: {}, caps: {} } as {
      counts: Record<string, number>;
      caps: Record<string, number>;
    };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as {
      date?: string;
      counts?: Record<string, number>;
      caps?: Record<string, number>;
    };
    if (parsed.date !== todayKey()) return { counts: {}, caps: {} };
    return { counts: parsed.counts || {}, caps: parsed.caps || {} };
  } catch {
    return { counts: {}, caps: {} };
  }
}

function writeFrequency(
  counts: Record<string, number>,
  caps: Record<string, number>
) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date: todayKey(), counts, caps })
    );
  } catch {}
}

function visual(campanha: Campanha) {
  if (campanha.origem !== "salao_premium") {
    return {
      accent: "text-amber-700",
      badge: "bg-amber-100 text-amber-900",
      glow: "bg-amber-400/20",
      Icon: Megaphone,
    };
  }
  if (campanha.categoria === "critico") {
    return {
      accent: "text-red-700",
      badge: "bg-red-100 text-red-900",
      glow: "bg-red-400/20",
      Icon: AlertTriangle,
    };
  }
  if (campanha.categoria === "beneficio") {
    return {
      accent: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-900",
      glow: "bg-emerald-400/20",
      Icon: Gift,
    };
  }
  return {
    accent: "text-amber-700",
    badge: "bg-amber-100 text-amber-900",
    glow: "bg-amber-400/20",
    Icon: Sparkles,
  };
}

export default function PartnerAdSlot({
  idSalao,
  publico = "salao",
  local = "dashboard",
  className = "",
  allowedPaths = ["/dashboard"],
}: Props) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [campanha, setCampanha] = useState<Campanha | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const impressionSent = useRef<string | null>(null);
  const shouldShow = allowedPaths.some((path) => pathname === path);

  useEffect(() => {
    setMounted(true);
  }, []);

  const requestUrl = useMemo(() => {
    if (typeof window === "undefined" || !shouldShow) return null;
    const { counts, caps } = readFrequency();
    const blocked = Object.entries(counts)
      .filter(([id, count]) => count >= Math.max(1, Number(caps[id] || 2)))
      .map(([id]) => id);
    const params = new URLSearchParams({ publico, local, seed: getViewerSeed() });
    if (idSalao) params.set("idSalao", idSalao);
    if (blocked.length) params.set("exclude", blocked.join(","));
    return `/api/parcerias/ativos?${params.toString()}`;
  }, [idSalao, publico, local, shouldShow]);

  useEffect(() => {
    if (!requestUrl) {
      setCampanha(null);
      return;
    }

    let active = true;
    fetch(requestUrl, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!active) return;
        setDismissed(false);
        setImageBroken(false);
        setCampanha(payload?.campanha || null);
      })
      .catch(() => {
        if (active) setCampanha(null);
      });

    return () => {
      active = false;
    };
  }, [requestUrl]);

  useEffect(() => {
    if (!campanha?.id || impressionSent.current === campanha.id) return;
    const { counts, caps } = readFrequency();
    const cap = Math.max(1, Number(campanha.limiteFrequenciaDia || 2));
    caps[campanha.id] = cap;

    if ((counts[campanha.id] || 0) >= cap) {
      setCampanha(null);
      writeFrequency(counts, caps);
      return;
    }

    counts[campanha.id] = (counts[campanha.id] || 0) + 1;
    writeFrequency(counts, caps);
    impressionSent.current = campanha.id;

    void fetch("/api/parcerias/ativos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idCampanha: campanha.id,
        local,
        tipo: "impressao",
      }),
      keepalive: true,
    });
  }, [campanha, local]);

  useEffect(() => {
    if (!campanha || dismissed) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDismissed(true);
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [campanha, dismissed]);

  if (!mounted || !shouldShow || !campanha || dismissed) return null;

  const style = visual(campanha);
  const Icon = style.Icon;
  const poster = campanha.formato === "poster" && Boolean(campanha.imagemUrl);

  function handleClose() {
    setDismissed(true);
  }

  function handleClick() {
    if (!campanha) return;

    void fetch("/api/parcerias/ativos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idCampanha: campanha.id, local, tipo: "clique" }),
      keepalive: true,
    });

    if (campanha.destinoUrl) {
      window.open(campanha.destinoUrl, "_blank", "noopener,noreferrer");
      setDismissed(true);
    }
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px] ${className}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
      aria-hidden={false}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={campanha.label || "Anúncio Salão Premium"}
        className="relative max-h-[92vh] w-full max-w-[940px] overflow-auto rounded-[30px] border border-white/70 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.35)]"
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar anúncio"
          title="Fechar anúncio"
          className="absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-zinc-950 text-white shadow-lg transition hover:scale-105 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
        >
          <X size={21} strokeWidth={2.5} />
        </button>

        <div className="grid md:grid-cols-[minmax(300px,390px)_1fr]">
          <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden bg-[#f7f5ef] p-4 sm:p-5">
            <div className={`absolute -left-16 -top-16 h-48 w-48 rounded-full blur-3xl ${style.glow}`} />
            <div className={`absolute -bottom-20 -right-20 h-56 w-56 rounded-full blur-3xl ${style.glow}`} />

            {campanha.imagemUrl && !imageBroken ? (
              <button
                type="button"
                onClick={campanha.destinoUrl ? handleClick : undefined}
                className="relative z-10 block cursor-pointer rounded-[24px] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
                aria-label={campanha.destinoUrl ? `${campanha.titulo}. Abrir anúncio` : campanha.titulo}
              >
                <img
                  src={campanha.imagemUrl}
                  alt={campanha.altText || campanha.titulo}
                  className={
                    poster
                      ? "max-h-[72vh] w-auto max-w-full rounded-[22px] border border-zinc-200 bg-white object-contain shadow-xl"
                      : "max-h-[420px] w-full rounded-[22px] border border-zinc-200 bg-white object-cover shadow-xl"
                  }
                  loading="eager"
                  decoding="async"
                  onError={() => setImageBroken(true)}
                />
              </button>
            ) : (
              <div className="relative z-10 flex aspect-[4/5] w-full max-w-[320px] flex-col items-center justify-center rounded-[24px] bg-zinc-950 p-8 text-center text-white shadow-xl">
                <Icon size={48} className="text-amber-400" />
                <div className="mt-5 text-sm font-black uppercase tracking-[0.2em] text-amber-300">
                  Salão Premium
                </div>
                <div className="mt-3 text-2xl font-black leading-tight">{campanha.titulo}</div>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center p-6 sm:p-8 md:p-10 md:pr-12">
            <div className="flex flex-wrap items-center gap-2 pr-10">
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                Anúncio
              </span>
              <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${style.accent}`}>
                {campanha.label || "Publicidade • Salão Premium"}
              </span>
            </div>

            <div className="mt-5 text-sm font-bold text-zinc-500">{campanha.parceiro}</div>
            <h2 className="mt-2 text-2xl font-black leading-[1.08] text-zinc-950 sm:text-3xl">
              {campanha.titulo}
            </h2>

            {campanha.subtitulo ? (
              <p className="mt-4 text-sm leading-6 text-zinc-600 sm:text-[15px]">
                {campanha.subtitulo}
              </p>
            ) : null}

            {campanha.cupomCodigo ? (
              <div className={`mt-5 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${style.badge}`}>
                <Tag size={13} /> Cupom {campanha.cupomCodigo}
              </div>
            ) : null}

            <div className="mt-7 grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              {campanha.destinoUrl ? (
                <button
                  type="button"
                  onClick={handleClick}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
                >
                  {campanha.ctaTexto}
                  <ExternalLink size={16} />
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleClose}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2"
              >
                Fechar
              </button>
            </div>

            <p className="mt-5 text-xs leading-5 text-zinc-400">
              Você pode fechar este anúncio a qualquer momento. A frequência de exibição é limitada automaticamente.
            </p>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
