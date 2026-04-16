"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleAlert,
  Clock3,
  LifeBuoy,
  MessageSquareText,
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
    <div className={`rounded-[28px] border p-5 shadow-sm ${className}`}>
      <div className="text-xs font-bold uppercase tracking-[0.24em] opacity-60">
        {props.label}
      </div>
      <div className="mt-3 font-display text-3xl font-black">{props.value}</div>
      <div className="mt-2 text-sm opacity-70">{props.helper}</div>
    </div>
  );
}

export default function SupportDeskClient({
  initialItems,
  initialMetrics,
  initialDetail,
}: Props) {
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

  async function loadTickets(preferredId?: string | null) {
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
  }

  async function loadDetail(id: string) {
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
  }

  useEffect(() => {
    if (!selectedId || detail?.ticket.id === selectedId) return;
    void loadDetail(selectedId);
  }, [detail?.ticket.id, selectedId]);

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
    <div className="space-y-6">
      <section className="rounded-[34px] border border-zinc-200 bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">
              <LifeBuoy size={14} />
              Central de suporte
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-[-0.05em] text-zinc-950 sm:text-4xl">
              Tickets e atendimento do salao em um fluxo unico
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-zinc-500 sm:text-base">
              Abra chamados, acompanhe respostas e mantenha o historico visivel
              para o salao e para o AdminMaster no mesmo processo.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowForm((value) => !value)}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Plus size={16} />
              {showForm ? "Fechar abertura" : "Novo ticket"}
            </button>
            <button
              type="button"
              onClick={() => void loadTickets(selectedId)}
              disabled={loadingList}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
            >
              <RefreshCcw size={16} className={loadingList ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tickets" value={metrics.total} helper="Historico do salao" />
        <MetricCard label="Em andamento" value={metrics.abertos} helper="Ativos agora" tone="amber" />
        <MetricCard label="Aguardando voce" value={metrics.aguardandoCliente} helper="Responder suporte" tone="blue" />
        <MetricCard label="Criticos" value={metrics.criticos} helper="Prioridade alta" tone="red" />
      </section>

      {success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{success}</div> : null}
      {error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}

      {showForm ? (
        <section className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-zinc-950">Abrir novo ticket</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <input
              value={newTicket.assunto}
              onChange={(event) => setNewTicket((current) => ({ ...current, assunto: event.target.value }))}
              placeholder="Assunto do atendimento"
              className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none transition focus:border-zinc-950 focus:bg-white"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={newTicket.categoria}
                onChange={(event) => setNewTicket((current) => ({ ...current, categoria: event.target.value as TicketCategoria }))}
                className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none transition focus:border-zinc-950 focus:bg-white"
              >
                {categorias.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={newTicket.prioridade}
                onChange={(event) => setNewTicket((current) => ({ ...current, prioridade: event.target.value as TicketPrioridade }))}
                className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none transition focus:border-zinc-950 focus:bg-white"
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
            className="mt-4 w-full rounded-[24px] border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm outline-none transition focus:border-zinc-950 focus:bg-white"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={saving === "create"}
              className="rounded-2xl border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {saving === "create" ? "Abrindo..." : "Abrir ticket"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setNewTicket(emptyForm);
              }}
              className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-4 rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar ticket..."
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none transition focus:border-zinc-950 focus:bg-white"
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
                  className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
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
                      <div className="mt-2 text-sm font-semibold">{item.assunto}</div>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.id === selectedId ? "border-white/20 bg-white/10 text-white" : badgeClass(item.status)}`}>
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs opacity-70">
                    <Clock3 size={12} />
                    {item.ultimaInteracaoLabel}
                  </div>
                  <div className="mt-3 text-xs opacity-70">
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
              <div className="rounded-[30px] border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">
                Carregando ticket...
              </div>
            ) : detail ? (
              <>
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
                      <h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-zinc-950">
                        {detail.ticket.assunto}
                      </h2>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-500">
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
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                      >
                        Reabrir ticket
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleStatus("fechado")}
                        disabled={saving === "status"}
                        className="rounded-2xl border border-zinc-950 bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        Encerrar ticket
                      </button>
                    )}
                  </div>
                </section>

                <section className="grid gap-5 2xl:grid-cols-[1fr_320px]">
                  <div className="space-y-4 rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-lg font-bold text-zinc-950">
                      <MessageSquareText size={18} />
                      Conversa
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
                          <div className="mt-3 text-[11px] opacity-60">
                            {formatDate(mensagem.criadaEm)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-3">
                      <textarea
                        value={replyMessage}
                        onChange={(event) => setReplyMessage(event.target.value)}
                        rows={4}
                        placeholder="Responder suporte..."
                        className="w-full resize-none rounded-[18px] bg-white px-4 py-4 text-sm outline-none"
                      />
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleReply()}
                          disabled={saving === "reply" || !replyMessage.trim()}
                          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-950 bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                        >
                          <Send size={15} />
                          {saving === "reply" ? "Enviando..." : "Enviar resposta"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <aside className="space-y-4 rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-lg font-bold text-zinc-950">
                      <CircleAlert size={18} />
                      Historico
                    </div>
                    <div className="space-y-3">
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
                  </aside>
                </section>
              </>
            ) : null
          ) : (
            <div className="rounded-[30px] border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">
              Nenhum ticket aberto ainda.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
