"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleAlert,
  Clock3,
  FileImage,
  LifeBuoy,
  MessageSquareText,
  Paperclip,
  Plus,
  RefreshCcw,
  Send,
} from "lucide-react";
import type {
  SalaoTicketDetail,
  TicketCategoria,
  TicketMetrics,
  TicketPrioridade,
  TicketSummary,
} from "@/lib/support/tickets";

type Props = {
  initialItems: TicketSummary[];
  initialMetrics: TicketMetrics;
  initialDetail: SalaoTicketDetail | null;
};

type NewTicketForm = {
  assunto: string;
  categoria: TicketCategoria;
  prioridade: TicketPrioridade;
  mensagem: string;
};

const emptyForm: NewTicketForm = {
  assunto: "",
  categoria: "suporte",
  prioridade: "media",
  mensagem: "",
};

const categorias: Array<{ value: TicketCategoria; label: string }> = [
  { value: "suporte", label: "Suporte" },
  { value: "bug", label: "Bug" },
  { value: "agenda", label: "Agenda" },
  { value: "comanda", label: "Comanda" },
  { value: "caixa", label: "Caixa" },
  { value: "cobranca", label: "Cobranca" },
  { value: "assinatura", label: "Assinatura" },
  { value: "estoque", label: "Estoque" },
  { value: "comissao", label: "Comissao" },
  { value: "acesso", label: "Acesso" },
  { value: "melhoria", label: "Melhoria" },
];

const prioridades: Array<{ value: TicketPrioridade; label: string }> = [
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
  if (value === "em_atendimento") {
    return "border-violet-200 bg-violet-50 text-violet-700";
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

function getPasswordRecoveryAction(detail: SalaoTicketDetail | null) {
  if (!detail || detail.ticket.origem !== "app_profissional_login") {
    return null;
  }

  const rawProfissionalId = detail.ticket.origemContexto?.id_profissional;
  const profissionalId =
    typeof rawProfissionalId === "string" ? rawProfissionalId.trim() : "";

  if (!profissionalId) {
    return null;
  }

  const cpfFinal =
    typeof detail.ticket.origemContexto?.cpf_final === "string"
      ? detail.ticket.origemContexto.cpf_final
      : "";
  const contato =
    typeof detail.ticket.origemContexto?.contato_informado === "string"
      ? detail.ticket.origemContexto.contato_informado
      : "";

  return {
    href: `/profissionais/${profissionalId}?ticket_recuperacao=${detail.ticket.id}`,
    subtitle: cpfFinal
      ? `CPF final ${cpfFinal}${contato ? ` - contato ${contato}` : ""}`
      : contato || "Abra o cadastro do profissional para redefinir a senha.",
  };
}

function getMfaRecoveryContext(detail: SalaoTicketDetail | null) {
  if (detail?.ticket.origemContexto?.tipo_fluxo !== "recuperacao_2fa") {
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

function formatRecoveryStatus(value?: string | null) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "cooldown") return "Em carencia de seguranca";
  if (normalized === "rejected") return "Aguardando novos dados";
  if (normalized === "completed") return "Concluida";
  return "Em analise";
}

function formatRecoveryReviewStatus(value?: string | null) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "valid") return "Evidencia completa";
  if (normalized === "illegible") return "Reenviar imagem legivel";
  if (normalized === "divergent") return "Reenviar dados consistentes";
  return "Aguardando revisao";
}

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Erro ao processar a requisicao.");
  }
  return data;
}

function MetricCard(props: {
  label: string;
  value: number;
  helper: string;
  tone?: "default" | "amber" | "blue" | "red";
}) {
  const className =
    props.tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : props.tone === "blue"
        ? "border-blue-200 bg-blue-50 text-blue-950"
        : props.tone === "red"
          ? "border-rose-200 bg-rose-50 text-rose-950"
          : "border-zinc-200 bg-white text-zinc-950";

  return (
    <div className={`rounded-[22px] border p-3.5 shadow-sm ${className}`}>
      <div className="text-xs font-bold uppercase tracking-[0.24em] opacity-60">
        {props.label}
      </div>
      <div className="mt-1.5 text-[1.5rem] font-black">{props.value}</div>
      <div className="mt-1 text-sm opacity-70">{props.helper}</div>
    </div>
  );
}

export default function SupportDeskClient({
  initialItems,
  initialMetrics,
  initialDetail,
}: Props) {
  const searchParams = useSearchParams();
  const [items, setItems] = useState(initialItems);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [detail, setDetail] = useState<SalaoTicketDetail | null>(initialDetail);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDetail?.ticket.id || initialItems[0]?.id || null
  );
  const [replyMessage, setReplyMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(initialItems.length === 0);
  const [newTicket, setNewTicket] = useState<NewTicketForm>(emptyForm);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState<"create" | "reply" | "status" | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentMessage, setAttachmentMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [item.numero, item.assunto, item.status, item.categoria, item.ultimaMensagem]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [items, search]);
  const passwordRecoveryAction = useMemo(
    () => getPasswordRecoveryAction(detail),
    [detail]
  );
  const mfaRecoveryContext = useMemo(
    () => getMfaRecoveryContext(detail),
    [detail]
  );
  const preferredTicketId = searchParams.get("ticket");

  const loadTickets = useCallback(async (preferredId?: string | null) => {
    setLoadingList(true);
    try {
      setError("");
      const data = await readJson(await fetch("/api/suporte/tickets", { cache: "no-store" }));
      const nextItems = (data.items || []) as TicketSummary[];
      const nextSelected =
        (preferredId && nextItems.some((item) => item.id === preferredId)
          ? preferredId
          : nextItems[0]?.id) || null;

      setItems(nextItems);
      setMetrics((data.metrics || initialMetrics) as TicketMetrics);
      setSelectedId(nextSelected);
      setDetail((current) =>
        nextSelected && current?.ticket.id === nextSelected ? current : null
      );
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao listar tickets.");
    } finally {
      setLoadingList(false);
    }
  }, [initialMetrics]);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      setError("");
      const data = await readJson(await fetch(`/api/suporte/tickets/${id}`, { cache: "no-store" }));
      setDetail((data.detail || null) as SalaoTicketDetail | null);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao carregar ticket.");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId || detail?.ticket.id === selectedId) return;
    void loadDetail(selectedId);
  }, [detail?.ticket.id, loadDetail, selectedId]);

  useEffect(() => {
    if (!preferredTicketId || preferredTicketId === selectedId) return;
    setSelectedId(preferredTicketId);
    void loadTickets(preferredTicketId);
  }, [loadTickets, preferredTicketId, selectedId]);

  async function handleCreate() {
    if (!newTicket.assunto.trim() || !newTicket.mensagem.trim()) {
      setError("Preencha assunto e mensagem para abrir o ticket.");
      return;
    }

    setSaving("create");
    try {
      setError("");
      setSuccess("");
      const data = await readJson(
        await fetch("/api/suporte/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newTicket,
            contexto: { origem_tela: "/suporte" },
          }),
        })
      );
      const createdId = String(data.ticket?.id || "");
      setNewTicket(emptyForm);
      setShowForm(false);
      setSuccess(`Ticket #${data.ticket?.numero || "-"} aberto com sucesso.`);
      await loadTickets(createdId);
      if (createdId) await loadDetail(createdId);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao abrir ticket.");
    } finally {
      setSaving(null);
    }
  }

  async function handleReply() {
    if (!selectedId || !replyMessage.trim()) {
      setError("Digite a resposta antes de enviar.");
      return;
    }

    setSaving("reply");
    try {
      setError("");
      setSuccess("");
      await readJson(
        await fetch(`/api/suporte/tickets/${selectedId}/mensagens`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensagem: replyMessage }),
        })
      );
      setReplyMessage("");
      setSuccess("Resposta enviada para o suporte.");
      await Promise.all([loadTickets(selectedId), loadDetail(selectedId)]);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao responder ticket.");
    } finally {
      setSaving(null);
    }
  }

  async function handleAttachmentUpload() {
    if (!selectedId || !attachmentFile) {
      setError("Selecione um arquivo para enviar.");
      return;
    }

    setSaving("reply");
    try {
      setError("");
      setSuccess("");
      const formData = new FormData();
      formData.set("arquivo", attachmentFile);
      formData.set("mensagem", attachmentMessage.trim());
      await readJson(
        await fetch(`/api/suporte/tickets/${selectedId}/anexos`, {
          method: "POST",
          body: formData,
        })
      );
      setAttachmentFile(null);
      setAttachmentMessage("");
      setSuccess("Evidencia enviada no ticket.");
      await Promise.all([loadTickets(selectedId), loadDetail(selectedId)]);
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Erro ao enviar evidencia."
      );
    } finally {
      setSaving(null);
    }
  }

  async function handleStatus(status: "aberto" | "fechado") {
    if (!selectedId) return;
    setSaving("status");
    try {
      setError("");
      setSuccess("");
      await readJson(
        await fetch(`/api/suporte/tickets/${selectedId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
      );
      setSuccess(status === "fechado" ? "Ticket encerrado." : "Ticket reaberto.");
      await Promise.all([loadTickets(selectedId), loadDetail(selectedId)]);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao atualizar ticket.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-zinc-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
              <LifeBuoy size={14} />
              Central de suporte
            </div>
            <h1 className="mt-2.5 font-display text-3xl font-bold tracking-[-0.05em] text-zinc-950 sm:text-[2rem]">
              Tickets e atendimento do salao em um fluxo unico
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-[15px]">
              Abra chamados, acompanhe respostas e mantenha o historico visivel
              para a equipe do salao em um fluxo unico.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowForm((value) => !value)}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-950 bg-zinc-950 px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Plus size={16} />
              {showForm ? "Fechar abertura" : "Novo ticket"}
            </button>
            <button
              type="button"
              onClick={() => void loadTickets(selectedId)}
              disabled={loadingList}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
            >
              <RefreshCcw size={16} className={loadingList ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tickets" value={metrics.total} helper="Historico do salao" />
        <MetricCard label="Em andamento" value={metrics.abertos} helper="Ativos agora" tone="amber" />
        <MetricCard label="Aguardando voce" value={metrics.aguardandoCliente} helper="Responder suporte" tone="blue" />
        <MetricCard label="Criticos" value={metrics.criticos} helper="Prioridade alta" tone="red" />
      </section>

      {success ? <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}
      {error ? <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {showForm ? (
        <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-bold text-zinc-950">Abrir novo ticket</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              value={newTicket.assunto}
              onChange={(event) => setNewTicket((current) => ({ ...current, assunto: event.target.value }))}
              placeholder="Assunto do atendimento"
              className="h-11 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none transition focus:border-zinc-950 focus:bg-white"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={newTicket.categoria}
                onChange={(event) => setNewTicket((current) => ({ ...current, categoria: event.target.value as TicketCategoria }))}
                className="h-11 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none transition focus:border-zinc-950 focus:bg-white"
              >
                {categorias.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={newTicket.prioridade}
                onChange={(event) => setNewTicket((current) => ({ ...current, prioridade: event.target.value as TicketPrioridade }))}
                className="h-11 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none transition focus:border-zinc-950 focus:bg-white"
              >
                {prioridades.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          <textarea
            value={newTicket.mensagem}
            onChange={(event) => setNewTicket((current) => ({ ...current, mensagem: event.target.value }))}
            rows={5}
            placeholder="Descreva o problema com o maximo de contexto util."
            className="mt-4 w-full rounded-[22px] border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-950 focus:bg-white"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={saving === "create"}
              className="rounded-2xl border border-zinc-950 bg-zinc-950 px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {saving === "create" ? "Abrindo..." : "Abrir ticket"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setNewTicket(emptyForm);
              }}
              className="rounded-2xl border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <aside className="space-y-2.5 rounded-[24px] border border-zinc-200 bg-white p-3.5 shadow-sm">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar ticket..."
            className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none transition focus:border-zinc-950 focus:bg-white"
          />

          <div className="space-y-3">
            {filteredItems.length ? (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setDetail((current) => (current?.ticket.id === item.id ? current : null));
                  }}
                  className={`w-full rounded-[22px] border px-4 py-3 text-left transition ${
                    item.id === selectedId
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">
                        Ticket #{item.numero}
                      </div>
                      <div className="mt-1.5 text-sm font-semibold">{item.assunto}</div>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.id === selectedId ? "border-white/20 bg-white/10 text-white" : badgeClass(item.status)}`}>
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2 text-xs opacity-70">
                    <Clock3 size={12} />
                    {item.ultimaInteracaoLabel}
                  </div>
                  <div className="mt-2.5 text-xs opacity-70">
                    {item.ultimaMensagem || "Sem novas mensagens ainda."}
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                Nenhum ticket encontrado.
              </div>
            )}
          </div>
        </aside>

        <div className="space-y-4">
          {selectedId ? (
            loadingDetail && !detail ? (
              <div className="rounded-[24px] border border-zinc-200 bg-white p-5 text-sm text-zinc-500 shadow-sm">
                Carregando ticket...
              </div>
            ) : detail ? (
              <>
                <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
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
                      <h2 className="mt-2.5 text-[1.55rem] font-bold tracking-[-0.04em] text-zinc-950">
                        {detail.ticket.assunto}
                      </h2>
                      <div className="mt-2.5 flex flex-wrap gap-3 text-sm text-zinc-500">
                        <span>Categoria {detail.ticket.categoria}</span>
                        <span>Prioridade {detail.ticket.prioridade}</span>
                        <span>Atualizado {detail.ticket.ultimaInteracaoLabel}</span>
                      </div>
                    </div>

                    {detail.ticket.status === "fechado" || detail.ticket.status === "resolvido" ? (
                      <button
                        type="button"
                        onClick={() => void handleStatus("aberto")}
                        disabled={saving === "status"}
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                      >
                        Reabrir ticket
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleStatus("fechado")}
                        disabled={saving === "status"}
                        className="rounded-2xl border border-zinc-950 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        Encerrar ticket
                      </button>
                    )}
                  </div>
                </section>

                {passwordRecoveryAction ? (
                  <section className="rounded-[24px] border border-violet-200 bg-violet-50/70 p-3.5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
                          Recuperacao de senha do app profissional
                        </div>
                        <h3 className="mt-1.5 text-base font-bold text-zinc-950">
                          Redefina a senha de {detail.ticket.solicitanteNome}
                        </h3>
                        <p className="mt-2 text-sm text-zinc-600">
                          {passwordRecoveryAction.subtitle}
                        </p>
                      </div>

                      <Link
                        href={passwordRecoveryAction.href}
                        className="inline-flex items-center justify-center rounded-2xl border border-violet-500 bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
                      >
                        Abrir cadastro e trocar senha
                      </Link>
                    </div>
                  </section>
                ) : null}

                {mfaRecoveryContext ? (
                  <section className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-3.5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
                          Recuperacao do autenticador
                        </div>
                        <h3 className="mt-1.5 text-base font-bold text-zinc-950">
                          Solicitacao em analise de seguranca
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-zinc-700">
                          Codigo da solicitacao:{" "}
                          <span className="font-mono font-bold">
                            {mfaRecoveryContext.recoveryCode || "-"}
                          </span>
                          . Responda este ticket com uma selfie segurando o
                          documento e um papel com esse codigo escrito a mao.
                        </p>
                        <p className="mt-2 text-sm leading-6 text-zinc-700">
                          Estado atual:{" "}
                          <strong>
                            {formatRecoveryStatus(mfaRecoveryContext.recoveryStatus)}
                          </strong>
                          {mfaRecoveryContext.unlockAt
                            ? ` ate ${formatDate(mfaRecoveryContext.unlockAt)}`
                            : ""}
                          .
                        </p>
                        <p className="mt-2 text-sm leading-6 text-zinc-700">
                          Revisao da evidencia:{" "}
                          <strong>
                            {formatRecoveryReviewStatus(
                              mfaRecoveryContext.reviewStatus
                            )}
                          </strong>
                          .
                        </p>
                        <p className="mt-2 text-sm leading-6 text-zinc-700">
                          Depois da aprovacao, a liberacao entra em carencia de
                          ate {mfaRecoveryContext.delayHours} horas por seguranca.
                        </p>
                      </div>
                    </div>
                  </section>
                ) : null}

                <section className="grid gap-4 2xl:grid-cols-[1fr_300px]">
                  <div className="space-y-3 rounded-[24px] border border-zinc-200 bg-white p-3.5 shadow-sm">
                    <div className="flex items-center gap-2 text-lg font-bold text-zinc-950">
                      <MessageSquareText size={18} />
                      Conversa
                    </div>

                    <div className="space-y-3">
                      {detail.mensagens.map((mensagem) => (
                        <div
                          key={mensagem.id}
                          className={`max-w-[88%] rounded-[22px] border px-4 py-3 text-sm shadow-sm ${
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

                    <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-3">
                      <textarea
                        value={replyMessage}
                        onChange={(event) => setReplyMessage(event.target.value)}
                        rows={4}
                        placeholder="Responder suporte..."
                        className="w-full resize-none rounded-[18px] bg-white px-4 py-3 text-sm outline-none"
                      />
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleReply()}
                          disabled={saving === "reply" || !replyMessage.trim()}
                          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-950 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                        >
                          <Send size={15} />
                          {saving === "reply" ? "Enviando..." : "Enviar resposta"}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-dashed border-zinc-200 bg-zinc-50 p-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                        <FileImage size={16} />
                        Enviar evidencia
                      </div>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Aceita imagem JPG, PNG, WEBP ou PDF com ate 10 MB.
                      </p>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(event) =>
                          setAttachmentFile(event.target.files?.[0] || null)
                        }
                        className="mt-3 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                      />
                      <textarea
                        value={attachmentMessage}
                        onChange={(event) => setAttachmentMessage(event.target.value)}
                        rows={2}
                        placeholder="Observacao opcional sobre o arquivo..."
                        className="mt-3 w-full resize-none rounded-[18px] border border-zinc-200 bg-white px-4 py-3 text-sm outline-none"
                      />
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-xs text-zinc-500">
                          {attachmentFile ? attachmentFile.name : "Nenhum arquivo selecionado."}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleAttachmentUpload()}
                          disabled={saving === "reply" || !attachmentFile}
                          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-950 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                        >
                          <Paperclip size={15} />
                          {saving === "reply" ? "Enviando..." : "Enviar evidencia"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <aside className="space-y-2.5 rounded-[24px] border border-zinc-200 bg-white p-3.5 shadow-sm">
                    <div className="flex items-center gap-2 text-lg font-bold text-zinc-950">
                      <CircleAlert size={18} />
                      Historico
                    </div>
                    <div className="space-y-3">
                      {detail.eventos.map((evento) => (
                        <div key={evento.id} className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                            {evento.evento.replace(/_/g, " ")}
                          </div>
                          <div className="mt-2 text-sm text-zinc-900">{evento.descricao}</div>
                          <div className="mt-3 text-[11px] text-zinc-500">{formatDate(evento.criadoEm)}</div>
                        </div>
                      ))}
                    </div>
                  </aside>
                </section>
              </>
            ) : null
          ) : (
            <div className="rounded-[24px] border border-zinc-200 bg-white p-5 text-sm text-zinc-500 shadow-sm">
              Nenhum ticket aberto ainda.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

