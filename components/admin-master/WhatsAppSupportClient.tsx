"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Clock3, RefreshCw, Send } from "lucide-react";

type Conversation = {
  id: string;
  wa_id: string;
  telefone: string;
  nome_contato: string | null;
  status: "aberta" | "pendente" | "encerrada";
  nao_lidas: number;
  ultima_mensagem_em: string;
  ultima_mensagem_preview: string | null;
};

type Message = {
  id: number;
  conversa_id: string;
  direcao: "entrada" | "saida";
  tipo: string;
  conteudo: string | null;
  status: string;
  criado_em: string;
};

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const number = digits.slice(4);
    return `+55 (${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
  }
  return `+${digits}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function WhatsAppSupportClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => conversations.find((item) => item.id === selectedId) || null,
    [conversations, selectedId]
  );

  const loadConversations = useCallback(async () => {
    const response = await fetch("/api/admin-master/whatsapp-support", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "Erro ao carregar conversas.");
    setConversations(payload.conversations || []);
    setSelectedId((current) => current || payload.conversations?.[0]?.id || null);
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const response = await fetch(
      `/api/admin-master/whatsapp-support?conversationId=${encodeURIComponent(conversationId)}`,
      { cache: "no-store" }
    );
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "Erro ao carregar mensagens.");
    setMessages(payload.messages || []);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await loadConversations();
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Erro inesperado.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    loadMessages(selectedId).catch((cause) => setError(cause instanceof Error ? cause.message : "Erro inesperado."));
    fetch("/api/admin-master/whatsapp-support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", conversationId: selectedId }),
    }).then(() => loadConversations()).catch(() => undefined);
  }, [selectedId, loadConversations, loadMessages]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadConversations().catch(() => undefined);
      if (selectedId) loadMessages(selectedId).catch(() => undefined);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [loadConversations, loadMessages, selectedId]);

  async function sendMessage() {
    if (!selectedId || !text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin-master/whatsapp-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, text }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao enviar mensagem.");
      setText("");
      await Promise.all([loadMessages(selectedId), loadConversations()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro inesperado.");
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status: Conversation["status"]) {
    if (!selectedId) return;
    await fetch("/api/admin-master/whatsapp-support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", conversationId: selectedId, status }),
    });
    await loadConversations();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-600">WhatsApp Cloud API</p>
            <h1 className="mt-2 text-2xl font-black text-zinc-950">Suporte pelo WhatsApp</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">Caixa de entrada do número oficial. Carrega só 30 conversas e 80 mensagens por conversa, sem Realtime e sem armazenar mídia binária.</p>
          </div>
          <button onClick={() => loadConversations()} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-bold hover:bg-zinc-50">
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

      <div className="grid min-h-[620px] overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm lg:grid-cols-[340px_1fr]">
        <aside className="border-b border-zinc-200 lg:border-b-0 lg:border-r">
          <div className="border-b border-zinc-200 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Conversas</div>
          <div className="max-h-[620px] overflow-y-auto">
            {loading ? <div className="p-5 text-sm text-zinc-500">Carregando...</div> : null}
            {!loading && conversations.length === 0 ? <div className="p-5 text-sm text-zinc-500">Nenhuma mensagem recebida ainda.</div> : null}
            {conversations.map((item) => (
              <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full border-b border-zinc-100 p-4 text-left transition ${selectedId === item.id ? "bg-emerald-50" : "hover:bg-zinc-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-black text-zinc-950">{item.nome_contato || formatPhone(item.telefone)}</div>
                    <div className="mt-1 text-xs font-semibold text-zinc-500">{formatPhone(item.telefone)}</div>
                  </div>
                  {item.nao_lidas > 0 ? <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-black text-white">{item.nao_lidas}</span> : null}
                </div>
                <div className="mt-3 line-clamp-2 text-sm text-zinc-600">{item.ultima_mensagem_preview || "Sem prévia"}</div>
                <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">{formatDate(item.ultima_mensagem_em)}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[620px] flex-col">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">Selecione uma conversa.</div>
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 p-4">
                <div>
                  <div className="font-black text-zinc-950">{selected.nome_contato || "Contato WhatsApp"}</div>
                  <div className="text-sm text-zinc-500">{formatPhone(selected.telefone)}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => changeStatus("aberta")} className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-black"><Circle size={14} className="mr-1 inline" />Aberta</button>
                  <button onClick={() => changeStatus("pendente")} className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-black"><Clock3 size={14} className="mr-1 inline" />Pendente</button>
                  <button onClick={() => changeStatus("encerrada")} className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-black"><CheckCircle2 size={14} className="mr-1 inline" />Encerrar</button>
                </div>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[#f7f5ef] p-5">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.direcao === "saida" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${message.direcao === "saida" ? "bg-emerald-700 text-white" : "bg-white text-zinc-900"}`}>
                      <div className="whitespace-pre-wrap break-words">{message.conteudo || `[${message.tipo}]`}</div>
                      <div className={`mt-2 text-[10px] font-bold ${message.direcao === "saida" ? "text-emerald-100" : "text-zinc-400"}`}>{formatDate(message.criado_em)} · {message.status}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-200 p-4">
                <div className="flex gap-3">
                  <textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} maxLength={4096} rows={2} placeholder="Digite a resposta..." className="min-h-[52px] flex-1 resize-none rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-emerald-500" />
                  <button onClick={() => void sendMessage()} disabled={sending || !text.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white disabled:opacity-40"><Send size={17} />{sending ? "Enviando" : "Enviar"}</button>
                </div>
                <p className="mt-2 text-xs text-zinc-400">Atualização leve a cada 15 s somente com a aba visível. Enter envia; Shift+Enter quebra linha.</p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
