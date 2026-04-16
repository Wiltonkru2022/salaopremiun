"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleAlert, MessageSquareText, Send } from "lucide-react";
import type { AdminTicketDetail, TicketPrioridade, TicketStatus } from "@/lib/support/tickets";

type Props = {
  detail: AdminTicketDetail;
  canEdit: boolean;
};

const statusOptions: Array<{ value: TicketStatus; label: string }> = [
  { value: "aberto", label: "Aberto" },
  { value: "em_atendimento", label: "Em atendimento" },
  { value: "aguardando_cliente", label: "Aguardando cliente" },
  { value: "aguardando_tecnico", label: "Aguardando tecnico" },
  { value: "resolvido", label: "Resolvido" },
  { value: "fechado", label: "Fechado" },
];

const prioridadeOptions: Array<{ value: TicketPrioridade; label: string }> = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Critica" },
];

function badgeClass(status: string) {
  const value = status.toLowerCase();
  if (value === "fechado" || value === "resolvido") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (value === "aguardando_cliente") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (value === "aguardando_tecnico") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Erro ao processar o ticket.");
  }
  return data;
}

export default function AdminTicketDetailClient({ detail, canEdit }: Props) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<TicketStatus>(
    detail.ticket.status === "fechado" || detail.ticket.status === "resolvido"
      ? "aguardando_cliente"
      : (detail.ticket.status as TicketStatus)
  );
  const [prioridade, setPrioridade] = useState<TicketPrioridade>(
    detail.ticket.prioridade as TicketPrioridade
  );
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<"reply" | "status" | null>(null);

  async function handleReply() {
    if (!reply.trim()) {
      setError("Digite a resposta para o salao.");
      return;
    }

    setSaving("reply");
    try {
      setError("");
      setFeedback("");
      await readJson(
        await fetch(`/api/admin-master/tickets/${detail.ticket.id}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mensagem: reply,
            status,
            assumir: true,
          }),
        })
      );
      setReply("");
      setFeedback("Resposta enviada para o salao.");
      router.refresh();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao responder ticket.");
    } finally {
      setSaving(null);
    }
  }

  async function handleStatus() {
    setSaving("status");
    try {
      setError("");
      setFeedback("");
      await readJson(
        await fetch(`/api/admin-master/tickets/${detail.ticket.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            prioridade,
            assumir: true,
          }),
        })
      );
      setFeedback("Ticket atualizado no AdminMaster.");
      router.refresh();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao atualizar ticket.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      {feedback ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}

      <section className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Ticket #{detail.ticket.numero}
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(detail.ticket.status)}`}>
                {detail.ticket.status.replace(/_/g, " ")}
              </span>
            </div>
            <h2 className="mt-4 font-display text-4xl font-black text-zinc-950">
              {detail.ticket.assunto}
            </h2>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-500">
              <span>Salao {detail.salao?.nome || "-"}</span>
              <span>Solicitante {detail.ticket.solicitanteNome}</span>
              <span>Atualizado {detail.ticket.ultimaInteracaoLabel}</span>
              <span>Origem {detail.ticket.origem}</span>
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
            <div>Responsavel atual</div>
            <div className="mt-1 font-semibold text-zinc-950">
              {detail.responsavelAdmin?.nome || "Nao assumido"}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[1fr_320px]">
        <div className="space-y-4 rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-bold text-zinc-950">
            <MessageSquareText size={18} />
            Thread do ticket
          </div>

          <div className="space-y-3">
            {detail.mensagens.map((mensagem) => (
              <div
                key={mensagem.id}
                className={`max-w-[88%] rounded-[24px] border px-4 py-4 text-sm shadow-sm ${
                  mensagem.autorTipo === "admin"
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "ml-auto border-zinc-200 bg-white text-zinc-900"
                }`}
              >
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] opacity-60">
                  {mensagem.autorNome}
                </div>
                <div className="whitespace-pre-line">{mensagem.mensagem}</div>
                <div className="mt-3 text-[11px] opacity-60">{formatDate(mensagem.criadaEm)}</div>
              </div>
            ))}
          </div>

          {canEdit ? (
            <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-3">
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={4}
                placeholder="Responder para o salao..."
                className="w-full resize-none rounded-[18px] bg-white px-4 py-4 text-sm outline-none"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleReply()}
                  disabled={saving === "reply"}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-950 bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  <Send size={15} />
                  {saving === "reply" ? "Enviando..." : "Responder ticket"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-lg font-bold text-zinc-950">Operacao do ticket</div>
            <div className="mt-4 grid gap-3">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as TicketStatus)}
                disabled={!canEdit}
                className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={prioridade}
                onChange={(event) => setPrioridade(event.target.value as TicketPrioridade)}
                disabled={!canEdit}
                className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none"
              >
                {prioridadeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleStatus()}
                disabled={!canEdit || saving === "status"}
                className="rounded-2xl border border-zinc-950 bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {saving === "status" ? "Salvando..." : "Atualizar ticket"}
              </button>
            </div>
          </div>

          <div className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-bold text-zinc-950">
              <CircleAlert size={18} />
              Timeline
            </div>
            <div className="mt-4 space-y-3">
              {detail.eventos.map((evento) => (
                <div key={evento.id} className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    {evento.evento.replace(/_/g, " ")}
                  </div>
                  <div className="mt-2 text-sm text-zinc-900">{evento.descricao}</div>
                  <div className="mt-3 text-[11px] text-zinc-500">{formatDate(evento.criadoEm)}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
