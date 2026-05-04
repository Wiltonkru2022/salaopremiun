"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleAlert, MessageSquareText, Paperclip, Send } from "lucide-react";
import type {
  AdminTicketDetail,
  TicketPrioridade,
  TicketStatus,
} from "@/lib/support/tickets";

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
    timeZone: "America/Sao_Paulo",
  });
}

function getMfaRecoveryContext(detail: AdminTicketDetail) {
  if (detail.ticket.origemContexto?.tipo_fluxo !== "recuperacao_2fa") {
    return null;
  }

  return {
    recoveryCode:
      typeof detail.ticket.origemContexto?.recovery_code === "string"
        ? detail.ticket.origemContexto.recovery_code
        : "",
    delayHours:
      typeof detail.ticket.origemContexto?.recovery_delay_hours === "number"
        ? detail.ticket.origemContexto.recovery_delay_hours
        : 24,
    recoveryStatus:
      typeof detail.ticket.origemContexto?.recovery_status === "string"
        ? detail.ticket.origemContexto.recovery_status
        : "requested",
    reviewStatus:
      typeof detail.ticket.origemContexto?.recovery_review_status === "string"
        ? detail.ticket.origemContexto.recovery_review_status
        : "pending",
    unlockAt:
      typeof detail.ticket.origemContexto?.recovery_unlock_at === "string"
        ? detail.ticket.origemContexto.recovery_unlock_at
        : null,
  };
}

function formatRecoveryReviewStatus(value: string) {
  if (value === "valid") return "Completa";
  if (value === "illegible") return "Ilegivel";
  if (value === "divergent") return "Divergente";
  return "Pendente";
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
  const mfaRecoveryContext = getMfaRecoveryContext(detail);

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
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Erro ao responder ticket."
      );
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
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Erro ao atualizar ticket."
      );
    } finally {
      setSaving(null);
    }
  }

  async function handleMfaRecoveryAction(
    action: "approve" | "reject" | "complete"
  ) {
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
            mfaRecoveryAction: action,
          }),
        })
      );
      setFeedback(
        action === "approve"
          ? "Recuperacao aprovada e colocada em carencia."
          : action === "reject"
            ? "Recuperacao recusada. O ticket segue aguardando novos dados."
            : "Recuperacao concluida e autenticador removido."
      );
      router.refresh();
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Erro ao processar a recuperacao do autenticador."
      );
    } finally {
      setSaving(null);
    }
  }

  async function handleMfaEvidenceReviewAction(
    action: "valid" | "illegible" | "divergent"
  ) {
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
            mfaEvidenceReviewAction: action,
          }),
        })
      );
      setFeedback(
        action === "valid"
          ? "Evidencia marcada como completa."
          : action === "illegible"
            ? "Evidencia marcada como ilegivel."
            : "Evidencia marcada como divergente."
      );
      router.refresh();
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Erro ao revisar a evidencia do ticket."
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      {feedback ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {feedback}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Ticket #{detail.ticket.numero}
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(
                  detail.ticket.status
                )}`}
              >
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
          {mfaRecoveryContext ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
              <div className="font-bold">Recuperacao do autenticador</div>
              <div className="mt-2 leading-6">
                Codigo da solicitacao:{" "}
                <span className="font-mono font-bold">
                  {mfaRecoveryContext.recoveryCode || "-"}
                </span>
              </div>
              <div className="mt-2 leading-6">
                Estado atual: <strong>{mfaRecoveryContext.recoveryStatus}</strong>
                {mfaRecoveryContext.unlockAt
                  ? ` - libera em ${formatDate(mfaRecoveryContext.unlockAt)}`
                  : ""}
              </div>
              <div className="mt-2 leading-6">
                Revisao da evidencia:{" "}
                <strong>
                  {formatRecoveryReviewStatus(mfaRecoveryContext.reviewStatus)}
                </strong>
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5 leading-6">
                <li>Validar selfie com documento e codigo escrito a mao.</li>
                <li>Conferir contato atual no proprio ticket.</li>
                <li>
                  Depois da aprovacao, respeitar a carencia de ate{" "}
                  {mfaRecoveryContext.delayHours} horas antes de concluir.
                </li>
              </ul>
            </div>
          ) : null}

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
                {mensagem.anexos.length ? (
                  <div className="mt-3 space-y-2">
                    {mensagem.anexos.map((anexo) => (
                      <a
                        key={`${mensagem.id}-${anexo.path}`}
                        href={anexo.signedUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className={`block rounded-2xl border px-3 py-2 text-xs ${
                          mensagem.autorTipo === "admin"
                            ? "border-white/15 bg-white/10 text-white"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Paperclip size={13} />
                          <span className="truncate font-semibold">
                            {anexo.fileName}
                          </span>
                        </div>
                        <div className="mt-1 opacity-70">
                          {(anexo.sizeBytes / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </a>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 text-[11px] opacity-60">
                  {formatDate(mensagem.criadaEm)}
                </div>
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
            <div className="text-lg font-bold text-zinc-950">
              Operacao do ticket
            </div>
            <div className="mt-4 grid gap-3">
              {mfaRecoveryContext ? (
                <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Revisao da evidencia
                  </div>
                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      onClick={() => void handleMfaEvidenceReviewAction("valid")}
                      disabled={saving === "status"}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                    >
                      Marcar completa
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleMfaEvidenceReviewAction("illegible")}
                      disabled={saving === "status"}
                      className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                    >
                      Marcar ilegivel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleMfaEvidenceReviewAction("divergent")}
                      disabled={saving === "status"}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                    >
                      Marcar divergente
                    </button>
                  </div>
                </div>
              ) : null}

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
                onChange={(event) =>
                  setPrioridade(event.target.value as TicketPrioridade)
                }
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

              {mfaRecoveryContext?.recoveryStatus === "requested" ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleMfaRecoveryAction("approve")}
                    disabled={!canEdit || saving === "status"}
                    className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    Aprovar com carencia
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleMfaRecoveryAction("reject")}
                    disabled={!canEdit || saving === "status"}
                    className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:opacity-60"
                  >
                    Recusar pedido
                  </button>
                </>
              ) : null}

              {mfaRecoveryContext?.recoveryStatus === "cooldown" ? (
                <button
                  type="button"
                  onClick={() => void handleMfaRecoveryAction("complete")}
                  disabled={!canEdit || saving === "status"}
                  className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
                >
                  Concluir apos carencia
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-bold text-zinc-950">
              <CircleAlert size={18} />
              Timeline
            </div>
            <div className="mt-4 space-y-3">
              {detail.eventos.map((evento) => (
                <div
                  key={evento.id}
                  className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    {evento.evento.replace(/_/g, " ")}
                  </div>
                  <div className="mt-2 text-sm text-zinc-900">
                    {evento.descricao}
                  </div>
                  <div className="mt-3 text-[11px] text-zinc-500">
                    {formatDate(evento.criadoEm)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
