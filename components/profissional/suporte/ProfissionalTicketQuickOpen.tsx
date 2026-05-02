"use client";

import { useState } from "react";
import { Headset, LifeBuoy } from "lucide-react";
import ProfissionalSectionHeader from "@/components/profissional/ui/ProfissionalSectionHeader";

export default function ProfissionalTicketQuickOpen() {
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!assunto.trim() || !mensagem.trim()) {
      setError("Preencha assunto e mensagem para abrir atendimento humano.");
      return;
    }

    setSaving(true);
    try {
      setError("");
      setFeedback("");
      const res = await fetch("/api/app-profissional/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assunto,
          mensagem,
          categoria: "suporte",
          prioridade: "media",
          contexto: { origem_tela: "/app-profissional/suporte" },
        }),
      });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Erro ao abrir ticket.");
      }

      setAssunto("");
      setMensagem("");
      setFeedback(`Ticket #${data.ticket?.numero || "-"} aberto com sucesso.`);
    } catch (currentError) {
      setError(
        currentError instanceof Error ? currentError.message : "Erro ao abrir ticket."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[1.35rem] border border-zinc-200 bg-white p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <ProfissionalSectionHeader
        title="Atendimento humano"
        description="Se a IA nao resolver, abra um chamado e a equipe recebe o contexto."
        action={
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-[16px] bg-amber-50 text-amber-700">
            <Headset size={18} />
          </div>
        }
      />

      {feedback ? (
        <div className="mt-2.5 rounded-[16px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="mt-2.5 rounded-[16px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-2.5 space-y-2.5">
        <input
          value={assunto}
          onChange={(event) => setAssunto(event.target.value)}
          placeholder="Assunto rapido"
          className="h-10 w-full rounded-[16px] border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none"
        />
        <textarea
          value={mensagem}
          onChange={(event) => setMensagem(event.target.value)}
          rows={4}
          placeholder="Explique o problema para o suporte."
          className="w-full rounded-[1rem] border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={saving}
          className="w-full rounded-[16px] bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Abrindo ticket..." : "Abrir ticket humano"}
        </button>

        <div className="flex items-start gap-2 rounded-[16px] border border-zinc-200 bg-zinc-50 px-3 py-3 text-xs leading-5 text-zinc-500">
          <LifeBuoy size={14} className="mt-0.5 shrink-0" />
          Envie um resumo curto e objetivo. Isso ajuda a equipe a responder mais rapido.
        </div>
      </div>
    </section>
  );
}
