"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Gift, Megaphone, Search, Sparkles, Tag } from "lucide-react";

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
  ctaTexto: string;
  destinoUrl?: string | null;
  cupomCodigo?: string | null;
};

function visual(row: Campanha) {
  if (row.origem !== "salao_premium") return { label: row.label || "Parceiro Salão Premium", Icon: Megaphone };
  if (row.categoria === "critico") return { label: row.label || "Comunicado importante", Icon: AlertTriangle };
  if (row.categoria === "beneficio") return { label: row.label || "Benefício Salão Premium", Icon: Gift };
  return { label: row.label || "Novidade Salão Premium", Icon: Sparkles };
}

export default function PartnerOffersGrid({ publico, idSalao }: { publico: "salao" | "cliente" | "profissional"; idSalao?: string | null }) {
  const [rows, setRows] = useState<Campanha[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ publico, local: "parceiros", modo: "lista" });
    if (idSalao) params.set("idSalao", idSalao);
    let active = true;
    fetch(`/api/parcerias/ativos?${params.toString()}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => { if (active) setRows(payload?.campanhas || []); })
      .catch(() => { if (active) setRows([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [idSalao, publico]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => `${row.parceiro} ${row.titulo} ${row.subtitulo || ""} ${row.cupomCodigo || ""} ${row.label || ""}`.toLowerCase().includes(term));
  }, [query, rows]);

  function trackAndOpen(row: Campanha) {
    void fetch("/api/parcerias/ativos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idCampanha: row.id, local: "parceiros", tipo: "clique" }), keepalive: true });
    if (row.destinoUrl) window.open(row.destinoUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar parceiro, benefício, novidade ou cupom" className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-zinc-400" />
      </div>

      {loading ? <div className="rounded-[24px] border border-zinc-200 bg-white p-6 text-sm text-zinc-500">Carregando benefícios...</div> : null}
      {!loading && !filtered.length ? <div className="rounded-[24px] border border-dashed border-zinc-300 bg-white p-8 text-center"><h2 className="text-lg font-black text-zinc-950">Nenhum benefício disponível agora</h2><p className="mt-2 text-sm text-zinc-500">Novidades do Salão Premium e parceiros compatíveis aparecerão aqui.</p></div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((row) => {
          const meta = visual(row);
          const Icon = meta.Icon;
          return <article key={row.id} className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-sm">
            {row.imagemUrl ? <img src={row.imagemUrl} alt={row.altText || row.titulo} className="h-44 w-full object-cover" loading="lazy" /> : <div className="flex h-36 items-center justify-center bg-zinc-950 px-6 text-center text-amber-200"><Icon size={34} /></div>}
            <div className="p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">{meta.label}</div>
              <p className="mt-2 text-xs font-bold text-zinc-500">{row.parceiro}</p>
              <h2 className="mt-1 text-lg font-black text-zinc-950">{row.titulo}</h2>
              {row.subtitulo ? <p className="mt-2 text-sm leading-6 text-zinc-600">{row.subtitulo}</p> : null}
              {row.cupomCodigo ? <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900"><Tag size={13} /> Cupom {row.cupomCodigo}</div> : null}
              {row.destinoUrl ? <button type="button" onClick={() => trackAndOpen(row)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white">{row.ctaTexto}<ExternalLink size={16} /></button> : null}
            </div>
          </article>;
        })}
      </div>
    </div>
  );
}
