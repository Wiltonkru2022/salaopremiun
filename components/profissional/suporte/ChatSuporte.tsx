"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowUpRight, Bot, LifeBuoy, Sparkles } from "lucide-react";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const QUICK_PROMPTS = [
  "Como funciona meu login?",
  "Quais agendamentos tenho hoje?",
  "Como abrir uma comanda?",
  "Como ver meu faturamento?",
];

function ChatSuporteInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const endRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Oi! Sou o suporte inteligente do app profissional. Posso ajudar com login, agenda, comandas, clientes, faturamento e regras do sistema.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversaId, setConversaId] = useState<string | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

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
          "Nao consegui responder agora. Tente novamente.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Erro ao enviar a mensagem. Tente novamente em alguns instantes.",
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
          content: "Nao consegui finalizar o chat agora.",
        },
      ]);
    }
  }

  return (
    <section className="mx-auto max-w-3xl overflow-hidden rounded-[1.35rem] border border-zinc-200 bg-white shadow-[0_16px_34px_rgba(15,23,42,0.07)]">
      <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-zinc-300" />

      <div className="border-b border-zinc-200 px-4 pb-3.5 pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-900">
              <Sparkles size={12} />
              Suporte inteligente
            </div>
            <h2 className="mt-2.5 text-[1.05rem] font-black text-zinc-950">
              Ajuda rapida do profissional
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-zinc-600">
              Pergunte em linguagem simples e eu respondo usando o contexto da
              tela em que voce esta.
            </p>
          </div>

          <button
            type="button"
            onClick={handleFinalizarChat}
            className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-red-700"
          >
            Encerrar
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            {
              icon: <Bot size={15} />,
              title: "Contexto da tela",
              body: "Levo em conta pagina, comanda, cliente e agendamento quando existirem.",
            },
            {
              icon: <LifeBuoy size={15} />,
              title: "Chamado humano",
              body: "Se a IA nao resolver, voce pode abrir um ticket logo abaixo.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[1.1rem] border border-zinc-200 bg-white/90 p-3"
            >
              <div className="flex items-center gap-2 text-sm font-black text-zinc-900">
                <span className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-[16px] bg-zinc-950 text-white">
                  {item.icon}
                </span>
                {item.title}
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setInput(suggestion)}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-premium max-h-[44vh] min-h-[250px] space-y-3.5 overflow-y-auto px-4 py-3.5">
        {messages.map((message) =>
          message.role === "assistant" ? (
            <div key={message.id} className="max-w-[90%]">
              <div className="mb-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                  <Bot size={13} />
                </span>
                IA do suporte
              </div>
              <div className="rounded-[1.2rem] border border-zinc-200 bg-white p-3.5 text-sm leading-7 text-zinc-900 shadow-sm">
                <div className="whitespace-pre-line">{message.content}</div>
              </div>
            </div>
          ) : (
            <div key={message.id} className="ml-auto max-w-[90%]">
              <div className="mb-1 text-right text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                Voce
              </div>
              <div className="rounded-[1.2rem] bg-zinc-950 p-3.5 text-sm leading-7 text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)]">
                {message.content}
              </div>
            </div>
          )
        )}

        {loading ? (
          <div className="max-w-[90%]">
            <div className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
              IA do suporte
            </div>
            <div className="rounded-[1.2rem] border border-zinc-200 bg-white p-3.5 text-sm text-zinc-500 shadow-sm">
              Respondendo com base no seu contexto...
            </div>
          </div>
        ) : null}

        <div ref={endRef} />
      </div>

      <div className="border-t border-zinc-200 bg-white/95 px-4 pb-3.5 pt-3 backdrop-blur">
        <div className="mb-2.5 flex flex-wrap gap-2">
          {[
            "Explica este fluxo",
            "Mostra o passo a passo",
            "Onde vejo isso no app?",
          ].map((shortcut) => (
            <button
              key={shortcut}
              type="button"
              onClick={() => setInput(shortcut)}
              className="rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-zinc-600"
            >
              {shortcut}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-[1.15rem] border border-zinc-200 bg-white p-2 shadow-sm">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Pergunte algo sobre agenda, comandas, login ou faturamento..."
            className="h-10 flex-1 rounded-[16px] px-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={loading || !input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-zinc-950 text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            aria-label="Enviar mensagem"
          >
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

export default function ChatSuporte() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[1.2rem] border border-zinc-200 bg-white p-3.5 text-sm text-zinc-500 shadow-sm">
          Carregando suporte...
        </div>
      }
    >
      <ChatSuporteInner />
    </Suspense>
  );
}
