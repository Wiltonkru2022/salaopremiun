"use client";

import { useMemo, useState } from "react";
import { Loader2, MessageCircle, Send, ShieldCheck } from "lucide-react";

type HistoricoEnvio = {
  id: string;
  destino: string;
  mensagem: string;
  status: string;
  tipo: string;
  criadoEm: string;
  enviadoEm: string | null;
  erroTexto: string | null;
};

type EventoWebhook = {
  id: string;
  status: string;
  kind: string;
  providerStatus: string | null;
  waId: string | null;
  criadoEm: string;
};

type Props = {
  creditosDisponiveis: number;
  recursoAtivo: boolean;
  historicoInicial: HistoricoEnvio[];
  eventosIniciais: EventoWebhook[];
};

function formatDate(value?: string | null) {
  if (!value) return "Agora ha pouco";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Agora ha pouco";

  return date.toLocaleString("pt-BR");
}

function statusLabel(status: string) {
  switch (String(status || "").toLowerCase()) {
    case "enviado":
      return "Enviado";
    case "entregue":
      return "Entregue";
    case "lido":
      return "Lido";
    case "falhou":
    case "erro":
      return "Falhou";
    case "processando":
      return "Processando";
    default:
      return status || "Recebido";
  }
}

function statusClasses(status: string) {
  switch (String(status || "").toLowerCase()) {
    case "enviado":
      return "bg-sky-100 text-sky-700";
    case "entregue":
      return "bg-emerald-100 text-emerald-700";
    case "lido":
      return "bg-violet-100 text-violet-700";
    case "falhou":
    case "erro":
      return "bg-rose-100 text-rose-700";
    case "processando":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

export default function WhatsAppSendCard({
  creditosDisponiveis,
  recursoAtivo,
  historicoInicial,
  eventosIniciais,
}: Props) {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [historico, setHistorico] = useState(historicoInicial);

  const canSend = recursoAtivo && creditosDisponiveis > 0;
  const charsLeft = useMemo(() => Math.max(4000 - message.length, 0), [message]);

  async function handleSend() {
    if (!canSend || sending) return;

    setSending(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/marketing/whatsapp/enviar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          message,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        result?: {
          envioId?: string;
        };
      };

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel enviar a mensagem.");
      }

      setHistorico((current) => [
        {
          id: data.result?.envioId || crypto.randomUUID(),
          destino: to,
          mensagem: message,
          status: "enviado",
          tipo: "manual_marketing",
          criadoEm: new Date().toISOString(),
          enviadoEm: new Date().toISOString(),
          erroTexto: null,
        },
        ...current,
      ]);
      setTo("");
      setMessage("");
      setFeedback("Mensagem enviada e registrada no historico.");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Nao foi possivel enviar a mensagem."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
        <MessageCircle size={14} />
        Disparo real + historico
      </div>

      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-[-0.04em] text-zinc-950">
            WhatsApp real ligado ao saldo do pacote
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Cada envio manual consome 1 credito, registra a saida e depois recebe
            os retornos de status da Meta no historico.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
            Creditos disponiveis
          </div>
          <div className="mt-1 text-2xl font-bold text-zinc-950">
            {creditosDisponiveis}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4 rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
          <label className="block">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Numero do cliente
            </div>
            <input
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="55 67 99999-9999"
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
            />
          </label>

          <label className="block">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Mensagem
            </div>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 4000))}
              placeholder="Oi, seu horario ficou livre hoje. Se quiser, eu consigo te atender ainda nesta tarde."
              rows={6}
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
            />
            <div className="mt-2 text-right text-xs text-zinc-400">
              {charsLeft} caractere(s) disponivel(is)
            </div>
          </label>

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend || sending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? "Enviando..." : "Enviar agora"}
          </button>

          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs leading-5 text-zinc-500">
            {!recursoAtivo
              ? "O recurso WhatsApp ainda nao esta liberado no plano ou no extra contratado."
              : creditosDisponiveis <= 0
                ? "Seu saldo chegou a zero. Compre um novo pacote para continuar enviando."
                : "Os retornos da Meta entram no historico conforme a operadora entrega, le ou falha a mensagem."}
          </div>

          {feedback ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-950 px-4 py-3 text-sm text-white">
              {feedback}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
              <ShieldCheck size={14} />
              Historico de envios
            </div>

            <div className="mt-4 space-y-3">
              {historico.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-500">
                  Nenhum envio registrado ainda.
                </div>
              ) : (
                historico.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-200 bg-white px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zinc-950">
                          {item.destino}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {statusLabel(item.status)} • {formatDate(item.enviadoEm || item.criadoEm)}
                        </div>
                      </div>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${statusClasses(item.status)}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-600">
                      {item.mensagem}
                    </p>
                    {item.erroTexto ? (
                      <div className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        {item.erroTexto}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Retornos do webhook Meta
            </div>
            <div className="mt-4 space-y-3">
              {eventosIniciais.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-500">
                  Nenhum retorno recebido ainda.
                </div>
              ) : (
                eventosIniciais.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-zinc-950">
                        {item.kind === "status"
                          ? statusLabel(item.providerStatus || item.status)
                          : "Mensagem recebida"}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {item.waId || "sem wa_id"} • {formatDate(item.criadoEm)}
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${statusClasses(item.providerStatus || item.status)}`}
                    >
                      {statusLabel(item.providerStatus || item.status)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
