"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ExternalLink, Tag } from "lucide-react";

type Campanha = {
  id: string;
  parceiro: string;
  titulo: string;
  subtitulo?: string | null;
  imagemUrl?: string | null;
  altText?: string | null;
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

const STORAGE_KEY = "salaopremium:partner-ads:frequency";
const VIEWER_KEY = "salaopremium:partner-ads:viewer";

function todayKey() { return new Date().toISOString().slice(0, 10); }

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
  if (typeof window === "undefined") return { counts: {}, caps: {} } as { counts: Record<string, number>; caps: Record<string, number> };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as { date?: string; counts?: Record<string, number>; caps?: Record<string, number> };
    if (parsed.date !== todayKey()) return { counts: {}, caps: {} };
    return { counts: parsed.counts || {}, caps: parsed.caps || {} };
  } catch { return { counts: {}, caps: {} }; }
}

function writeFrequency(counts: Record<string, number>, caps: Record<string, number>) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayKey(), counts, caps })); } catch {}
}

export default function PartnerAdSlot({
  idSalao,
  publico = "salao",
  local = "dashboard",
  className = "",
  allowedPaths = ["/dashboard"],
}: Props) {
  const pathname = usePathname();
  const [campanha, setCampanha] = useState<Campanha | null>(null);
  const impressionSent = useRef<string | null>(null);
  const shouldShow = allowedPaths.some((path) => pathname === path);

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
    if (!requestUrl) { setCampanha(null); return; }
    let active = true;
    fetch(requestUrl, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => { if (active) setCampanha(payload?.campanha || null); })
      .catch(() => { if (active) setCampanha(null); });
    return () => { active = false; };
  }, [requestUrl]);

  useEffect(() => {
    if (!campanha?.id || impressionSent.current === campanha.id) return;
    const { counts, caps } = readFrequency();
    const cap = Math.max(1, Number(campanha.limiteFrequenciaDia || 2));
    caps[campanha.id] = cap;
    if ((counts[campanha.id] || 0) >= cap) { setCampanha(null); writeFrequency(counts, caps); return; }
    counts[campanha.id] = (counts[campanha.id] || 0) + 1;
    writeFrequency(counts, caps);
    impressionSent.current = campanha.id;
    void fetch("/api/parcerias/ativos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idCampanha: campanha.id, local, tipo: "impressao" }),
      keepalive: true,
    });
  }, [campanha, local]);

  if (!shouldShow || !campanha) return null;

  function handleClick() {
    if (!campanha) return;
    void fetch("/api/parcerias/ativos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idCampanha: campanha.id, local, tipo: "clique" }),
      keepalive: true,
    });
    if (campanha.destinoUrl) window.open(campanha.destinoUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <aside className={`overflow-hidden rounded-[24px] border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-zinc-50 shadow-sm ${className}`} aria-label="Publicidade de parceiro Salão Premium">
      <div className="grid items-center gap-4 p-4 sm:grid-cols-[96px_1fr_auto] sm:p-5">
        {campanha.imagemUrl ? <img src={campanha.imagemUrl} alt={campanha.altText || campanha.titulo} className="h-20 w-full rounded-2xl object-cover sm:w-24" loading="lazy" /> : <div className="flex h-20 w-full items-center justify-center rounded-2xl bg-zinc-950 px-3 text-center text-xs font-black uppercase tracking-[0.16em] text-amber-200 sm:w-24">Parceiro</div>}
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Publicidade • Parceiro Salão Premium</div>
          <div className="mt-1 text-xs font-bold text-zinc-500">{campanha.parceiro}</div>
          <h2 className="mt-1 text-lg font-black leading-tight text-zinc-950">{campanha.titulo}</h2>
          {campanha.subtitulo ? <p className="mt-1 text-sm leading-5 text-zinc-600">{campanha.subtitulo}</p> : null}
          {campanha.cupomCodigo ? <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900"><Tag size={13} /> Cupom {campanha.cupomCodigo}</div> : null}
        </div>
        {campanha.destinoUrl ? <button type="button" onClick={handleClick} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800">{campanha.ctaTexto}<ExternalLink size={16} /></button> : null}
      </div>
    </aside>
  );
}
