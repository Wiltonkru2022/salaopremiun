"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Eye, FileSignature, Loader2, X } from "lucide-react";
import { carregarContratoParceriaPreview } from "./actions";

type Props = {
  idContrato: string;
  numero: string;
  parceiro: string;
  campanha: string;
};

function inlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${index}-${part}`} className="font-black text-zinc-950">{part.slice(2, -2)}</strong>;
    }
    return <span key={`${index}-${part}`}>{part}</span>;
  });
}

function renderContract(content: string) {
  const nodes: ReactNode[] = [];
  content.split("\n").forEach((rawLine, index) => {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      nodes.push(<div key={index} className="h-3" />);
      return;
    }
    if (line === "---") {
      nodes.push(<hr key={index} className="my-5 border-zinc-200" />);
      return;
    }
    if (line.startsWith("# ")) {
      nodes.push(<h1 key={index} className="text-center text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">{line.slice(2)}</h1>);
      return;
    }
    if (line.startsWith("## ")) {
      nodes.push(<h2 key={index} className="mt-5 text-sm font-black uppercase tracking-[0.12em] text-zinc-900">{line.slice(3)}</h2>);
      return;
    }
    if (line.startsWith("> ")) {
      nodes.push(<div key={index} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">{inlineBold(line.slice(2))}</div>);
      return;
    }
    nodes.push(<p key={index} className="text-sm leading-7 text-zinc-700">{inlineBold(line)}</p>);
  });
  return nodes;
}

export default function ContractPreviewButton({ idContrato, numero, parceiro, campanha }: Props) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openPreview() {
    setOpen(true);
    if (content || loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await carregarContratoParceriaPreview(idContrato);
      setContent(result.conteudo || "Contrato sem conteúdo salvo.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o contrato.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => void openPreview()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-black text-zinc-800 transition hover:bg-zinc-50">
        <Eye size={14} /> Prévia do contrato
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
              <section role="dialog" aria-modal="true" aria-label={`Prévia do contrato ${numero}`} className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-zinc-100 shadow-2xl">
                <header className="flex items-start justify-between gap-4 border-b border-zinc-200 bg-white px-5 py-4 sm:px-7">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-amber-700"><FileSignature size={15} /> Prévia do contrato</div>
                    <h2 className="mt-1 truncate text-xl font-black text-zinc-950">{numero}</h2>
                    <p className="mt-1 truncate text-xs text-zinc-500">{parceiro} • {campanha}</p>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Fechar prévia" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"><X size={18} /></button>
                </header>
                <div className="overflow-y-auto p-3 sm:p-6">
                  {loading ? <div className="mx-auto flex min-h-[420px] max-w-[760px] items-center justify-center rounded-sm bg-white text-sm font-bold text-zinc-500 shadow-sm"><Loader2 className="mr-2 animate-spin" size={18} /> Carregando contrato...</div> : null}
                  {error ? <div className="mx-auto max-w-[760px] rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">{error}</div> : null}
                  {!loading && !error && content ? <article className="mx-auto min-h-[900px] max-w-[760px] rounded-sm bg-white px-6 py-8 shadow-sm sm:px-12 sm:py-12"><div className="space-y-1">{renderContract(content)}</div></article> : null}
                </div>
              </section>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
