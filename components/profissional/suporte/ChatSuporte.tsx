"use client";

import { Suspense, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

function ChatSuporteInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Olá 👋 Sou o suporte inteligente do app profissional do SalaoPremium. Posso te ajudar com login, senha, agenda, clientes, comandas, faturamento e regras do sistema.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversaId, setConversaId] = useState<string | null>(null);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/app-profissional/suporte", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          origemPagina: pathname,
          idComanda: searchParams.get("comanda_id"),
          idAgendamento: searchParams.get("agendamento_id"),
          idCliente: searchParams.get("cliente_id"),
        }),
      });

      const data = await res.json();

      if (data?.conversaId) {
        setConversaId(data.conversaId);
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          data?.answer ||
          data?.error ||
          "Não consegui responder agora. Tente novamente.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Erro ao enviar mensagem. Tente novamente.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalizarChat() {
    if (!conversaId) {
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Chat finalizado. Quando quiser, pode iniciar uma nova conversa.",
        },
      ]);
      return;
    }

    try {
      await fetch("/api/app-profissional/suporte/finalizar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ conversaId }),
      });

      setConversaId(null);
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Chat finalizado. Quando quiser, pode iniciar uma nova conversa.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Não consegui finalizar o chat agora.",
        },
      ]);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-220px)] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.map((message) =>
          message.role === "assistant" ? (
            <div
              key={message.id}
              className="max-w-[88%] rounded-[1.25rem] border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="whitespace-pre-line text-sm text-zinc-900">
                {message.content}
              </div>
            </div>
          ) : (
            <div
              key={message.id}
            className="ml-auto max-w-[88%] rounded-[1.25rem] bg-zinc-950 p-4 text-sm text-white shadow-sm"
            >
              {message.content}
            </div>
          )
        )}

        {loading ? (
          <div className="max-w-[88%] rounded-[1.25rem] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-zinc-500">Respondendo...</div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-zinc-200 bg-white p-2 shadow-sm">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={handleFinalizarChat}
            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600"
          >
            Finalizar chat
          </button>
        </div>

        <div className="mb-2 flex flex-wrap gap-2">
          {[
            "Como trocar minha senha?",
            "Como funciona o login?",
            "Qual meu faturamento do mês?",
            "Quais são os status dos meus agendamentos hoje?",
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setInput(suggestion)}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Digite sua mensagem..."
            className="h-11 flex-1 rounded-2xl px-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatSuporte() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[1.25rem] border border-zinc-200 bg-white p-4 text-sm text-zinc-500 shadow-sm">
          Carregando suporte...
        </div>
      }
    >
      <ChatSuporteInner />
    </Suspense>
  );
}
