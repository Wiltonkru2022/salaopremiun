"use client";

import { useState } from "react";

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
    <section className="mb-4 rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-zinc-950">Atendimento humano</div>
      <p className="mt-1 text-xs leading-5 text-zinc-500">
        Se a IA nao resolver, abra um ticket e o AdminMaster recebe o chamado.
      </p>

      {feedback ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-3 space-y-3">
        <input
          value={assunto}
          onChange={(event) => setAssunto(event.target.value)}
          placeholder="Assunto rapido"
          className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none"
        />
        <textarea
          value={mensagem}
          onChange={(event) => setMensagem(event.target.value)}
          rows={4}
          placeholder="Explique o problema para o suporte."
          className="w-full rounded-[1.25rem] border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={saving}
          className="w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Abrindo ticket..." : "Abrir ticket humano"}
        </button>
      </div>
    </section>
  );
}
