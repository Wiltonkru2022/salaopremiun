import { ExternalLink, Megaphone, Tag, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Campaign = {
  id: string;
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
  enabled?: boolean;
};

const STORAGE_KEY = "salaopremium:professional:campaigns:frequency:v1";
const VIEWER_KEY = "salaopremium:professional:campaigns:viewer:v1";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function viewerSeed() {
  let seed = window.localStorage.getItem(VIEWER_KEY);
  if (!seed) {
    seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VIEWER_KEY, seed);
  }
  return seed;
}

function readFrequency() {
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

function writeFrequency(counts: Record<string, number>, caps: Record<string, number>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayKey(), counts, caps }));
  } catch {
    // Storage can be unavailable in hardened WebViews. The popup still works without persistence.
  }
}

function normalizeDestination(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.startsWith("/")) return raw;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(raw)) return raw;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null;
  if (/^(wa\.me|api\.whatsapp\.com|www\.)/i.test(raw)) return `https://${raw}`;
  if (/^[^\s/]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(raw)) return `https://${raw}`;
  return null;
}

export function ProfessionalPartnerAdPopup({ idSalao, enabled = true }: Props) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const impressionSent = useRef<string | null>(null);

  const requestUrl = useMemo(() => {
    if (!enabled || typeof window === "undefined") return null;
    const { counts, caps } = readFrequency();
    const blocked = Object.entries(counts)
      .filter(([id, count]) => count >= Math.max(1, Number(caps[id] || 2)))
      .map(([id]) => id);
    const params = new URLSearchParams({
      publico: "profissional",
      local: "app_profissional",
      seed: viewerSeed(),
    });
    if (idSalao) params.set("idSalao", idSalao);
    if (blocked.length) params.set("exclude", blocked.join(","));
    return `/api/parcerias/ativos?${params.toString()}`;
  }, [enabled, idSalao]);

  useEffect(() => {
    if (!requestUrl) {
      setCampaign(null);
      return;
    }
    let active = true;
    fetch(requestUrl, { credentials: "same-origin", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!active) return;
        setDismissed(false);
        setImageBroken(false);
        setCampaign(payload?.campanha || null);
      })
      .catch(() => {
        if (active) setCampaign(null);
      });
    return () => {
      active = false;
    };
  }, [requestUrl]);

  useEffect(() => {
    if (!campaign?.id || impressionSent.current === campaign.id) return;
    const { counts, caps } = readFrequency();
    const cap = Math.max(1, Number(campaign.limiteFrequenciaDia || 2));
    caps[campaign.id] = cap;
    if ((counts[campaign.id] || 0) >= cap) {
      setCampaign(null);
      writeFrequency(counts, caps);
      return;
    }
    counts[campaign.id] = (counts[campaign.id] || 0) + 1;
    writeFrequency(counts, caps);
    impressionSent.current = campaign.id;
    void fetch("/api/parcerias/ativos", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idCampanha: campaign.id, local: "app_profissional", tipo: "impressao" }),
      keepalive: true,
    });
  }, [campaign]);

  useEffect(() => {
    if (!campaign || dismissed) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDismissed(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [campaign, dismissed]);

  if (!enabled || !campaign || dismissed) return null;

  const destination = normalizeDestination(campaign.destinoUrl);
  const poster = campaign.formato === "poster" && Boolean(campaign.imagemUrl);

  function openCampaign() {
    if (!campaign) return;
    void fetch("/api/parcerias/ativos", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idCampanha: campaign.id, local: "app_profissional", tipo: "clique" }),
      keepalive: true,
    });
    if (destination) window.open(destination, "_blank", "noopener,noreferrer");
    setDismissed(true);
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setDismissed(true);
      }}
    >
      <section role="dialog" aria-modal="true" aria-label={campaign.label || "Anúncio Salão Premium"} className="relative max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl">
        <button type="button" onClick={() => setDismissed(true)} aria-label="Fechar anúncio" className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-zinc-950 text-white shadow-lg">
          <X size={20} />
        </button>

        <div className="bg-zinc-100 p-4 pt-16">
          {campaign.imagemUrl && !imageBroken ? (
            <button type="button" disabled={!destination} onClick={destination ? openCampaign : undefined} className="mx-auto block w-full max-w-sm disabled:cursor-default">
              <img src={campaign.imagemUrl} alt={campaign.altText || campaign.titulo} onError={() => setImageBroken(true)} className={poster ? "mx-auto max-h-[58vh] w-auto max-w-full rounded-2xl bg-white object-contain shadow-lg" : "mx-auto max-h-[360px] w-full rounded-2xl bg-white object-cover shadow-lg"} />
            </button>
          ) : (
            <div className="mx-auto grid aspect-[4/3] w-full max-w-sm place-items-center rounded-2xl bg-zinc-950 text-white shadow-lg"><Megaphone size={42} className="text-amber-300" /></div>
          )}
        </div>

        <div className="p-5 sm:p-7">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">{campaign.label || "Publicidade • Salão Premium"}</div>
          <div className="mt-2 text-xs font-bold text-zinc-500">{campaign.parceiro}</div>
          <h2 className="mt-1 pr-8 text-2xl font-black leading-tight text-zinc-950">{campaign.titulo}</h2>
          {campaign.subtitulo ? <p className="mt-3 text-sm leading-6 text-zinc-600">{campaign.subtitulo}</p> : null}
          {campaign.cupomCodigo ? <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900"><Tag size={13} /> Cupom {campaign.cupomCodigo}</div> : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {destination ? <button type="button" onClick={openCampaign} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white">{campaign.ctaTexto || "Saiba mais"}<ExternalLink size={16} /></button> : null}
            <button type="button" onClick={() => setDismissed(true)} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-700">Fechar</button>
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-400">Publicidade com frequência limitada. Você pode fechar este anúncio a qualquer momento.</p>
        </div>
      </section>
    </div>
  );
}
