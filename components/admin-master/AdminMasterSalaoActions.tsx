"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type PlanoOption = {
  codigo: string;
  nome: string;
};

type FeedbackState = {
  tone: "idle" | "success" | "error";
  message: string;
};

function formatDateInput(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

async function parseApiResponse(response: Response) {
  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    resultado?: {
      ticketId?: string;
      ticketNumero?: number;
    };
  };

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Nao foi possivel concluir a acao.");
  }

  return data;
}

export default function AdminMasterSalaoActions({
  idSalao,
  statusSalao,
  planoAtual,
  vencimentoAtual,
  planos,
}: {
  idSalao: string;
  statusSalao: string;
  planoAtual: string;
  vencimentoAtual?: string | null;
  planos: PlanoOption[];
}) {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>({
    tone: "idle",
    message: "",
  });
  const [planoSelecionado, setPlanoSelecionado] = useState(planoAtual || "basico");
  const [vencimento, setVencimento] = useState(formatDateInput(vencimentoAtual));
  const [notaTitulo, setNotaTitulo] = useState("");
  const [notaTexto, setNotaTexto] = useState("");
  const [ticketAssunto, setTicketAssunto] = useState("Acompanhar salao pelo AdminMaster");
  const [ticketMensagem, setTicketMensagem] = useState(
    "Abrindo ticket interno para acompanhamento operacional deste salao."
  );

  const salaoBloqueado = String(statusSalao || "").toLowerCase() === "bloqueado";

  const feedbackClass = useMemo(() => {
    if (feedback.tone === "success") {
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    }

    if (feedback.tone === "error") {
      return "border-red-200 bg-red-50 text-red-800";
    }

    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }, [feedback.tone]);

  async function runAction(
    actionKey: string,
    endpoint: string,
    body: Record<string, unknown>,
    successMessage: string,
    onSuccess?: (data: { resultado?: { ticketId?: string; ticketNumero?: number } }) => void
  ) {
    setLoadingKey(actionKey);
    setFeedback({ tone: "idle", message: "" });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await parseApiResponse(response);

      setFeedback({
        tone: "success",
        message: successMessage,
      });

      onSuccess?.(data);
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Falha ao executar a acao.",
      });
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-5">
        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
                Acoes operacionais
              </div>
              <h3 className="mt-2 font-display text-2xl font-black text-zinc-950">
                Ajustes rapidos do salao
              </h3>
            </div>

            <Link
              href="/admin-master/tickets"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-black text-zinc-900 transition hover:border-zinc-950"
            >
              Ver fila de tickets
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                void runAction(
                  salaoBloqueado ? "desbloquear" : "bloquear",
                  `/api/admin-master/saloes/${idSalao}/${salaoBloqueado ? "desbloquear" : "bloquear"}`,
                  {
                    motivo: salaoBloqueado
                      ? "Desbloqueio rapido pelo detalhe do salao."
                      : "Bloqueio rapido pelo detalhe do salao.",
                  },
                  salaoBloqueado ? "Salao desbloqueado." : "Salao bloqueado."
                )
              }
              disabled={loadingKey !== null}
              className={`rounded-[24px] border px-5 py-4 text-left transition ${
                salaoBloqueado
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300"
                  : "border-red-200 bg-red-50 text-red-900 hover:border-red-300"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <div className="text-sm font-black uppercase tracking-[0.2em] opacity-70">
                Status
              </div>
              <div className="mt-2 text-xl font-black">
                {salaoBloqueado ? "Desbloquear salao" : "Bloquear salao"}
              </div>
              <div className="mt-2 text-sm opacity-80">
                {salaoBloqueado
                  ? "Restaura acesso operacional do cliente."
                  : "Impede novas operacoes ate revisao."}
              </div>
            </button>

            <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-5">
              <div className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">
                Estado atual
              </div>
              <div className="mt-2 text-xl font-black text-zinc-950">
                {statusSalao || "-"}
              </div>
              <div className="mt-2 text-sm text-zinc-500">
                Plano atual: <span className="font-bold text-zinc-800">{planoAtual || "-"}</span>
              </div>
              <div className="mt-1 text-sm text-zinc-500">
                Vencimento: <span className="font-bold text-zinc-800">{vencimento || "-"}</span>
              </div>
            </div>
          </div>

          <div className={`mt-5 rounded-[22px] border px-4 py-3 text-sm ${feedbackClass}`}>
            {feedback.message || "Tudo que voce fizer aqui passa pelo servidor e atualiza a tela em seguida."}
          </div>
        </div>

        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
            Plano e vencimento
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
              <label className="text-sm font-bold text-zinc-700">Plano do salao</label>
              <select
                value={planoSelecionado}
                onChange={(event) => setPlanoSelecionado(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 outline-none focus:border-zinc-950"
              >
                {planos.map((plano) => (
                  <option key={plano.codigo} value={plano.codigo}>
                    {plano.nome} ({plano.codigo})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  void runAction(
                    "trocar-plano",
                    `/api/admin-master/saloes/${idSalao}/trocar-plano`,
                    {
                      plano: planoSelecionado,
                      motivo: `Troca manual para o plano ${planoSelecionado}.`,
                    },
                    "Plano atualizado com sucesso."
                  )
                }
                disabled={loadingKey !== null}
                className="mt-4 w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                Aplicar plano
              </button>
            </div>

            <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
              <label className="text-sm font-bold text-zinc-700">Vencimento da assinatura</label>
              <input
                type="date"
                value={vencimento}
                onChange={(event) => setVencimento(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 outline-none focus:border-zinc-950"
              />
              <button
                type="button"
                onClick={() =>
                  void runAction(
                    "ajustar-vencimento",
                    `/api/admin-master/saloes/${idSalao}/ajustar-vencimento`,
                    {
                      vencimentoEm: vencimento,
                      motivo: `Vencimento ajustado para ${vencimento}.`,
                    },
                    "Vencimento atualizado com sucesso."
                  )
                }
                disabled={loadingKey !== null || !vencimento}
                className="mt-4 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-900 transition hover:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Salvar vencimento
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
            Nota interna
          </div>
          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={notaTitulo}
              onChange={(event) => setNotaTitulo(event.target.value)}
              placeholder="Titulo rapido da observacao"
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-950 outline-none focus:border-zinc-950"
            />
            <textarea
              value={notaTexto}
              onChange={(event) => setNotaTexto(event.target.value)}
              placeholder="Escreva o contexto interno do salao aqui."
              rows={4}
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-950"
            />
            <button
              type="button"
              onClick={() =>
                void runAction(
                  "nota-interna",
                  `/api/admin-master/saloes/${idSalao}/nota-interna`,
                  {
                    titulo: notaTitulo,
                    nota: notaTexto,
                  },
                  "Nota interna criada com sucesso.",
                  () => {
                    setNotaTitulo("");
                    setNotaTexto("");
                  }
                )
              }
              disabled={loadingKey !== null || !notaTitulo.trim() || !notaTexto.trim()}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-900 transition hover:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Salvar nota interna
            </button>
          </div>
        </div>

        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
            Ticket interno
          </div>
          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={ticketAssunto}
              onChange={(event) => setTicketAssunto(event.target.value)}
              placeholder="Assunto do ticket"
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-950 outline-none focus:border-zinc-950"
            />
            <textarea
              value={ticketMensagem}
              onChange={(event) => setTicketMensagem(event.target.value)}
              placeholder="Descreva o que precisa ser acompanhado."
              rows={5}
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-950"
            />
            <button
              type="button"
              onClick={() =>
                void runAction(
                  "ticket-interno",
                  `/api/admin-master/saloes/${idSalao}/criar-ticket`,
                  {
                    assunto: ticketAssunto,
                    mensagem: ticketMensagem,
                    categoria: "suporte",
                    prioridade: "media",
                  },
                  "Ticket interno criado com sucesso.",
                  (data) => {
                    if (data.resultado?.ticketId) {
                      router.push(`/admin-master/tickets/${data.resultado.ticketId}`);
                    }
                  }
                )
              }
              disabled={loadingKey !== null || !ticketAssunto.trim() || !ticketMensagem.trim()}
              className="w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              Criar ticket do salao
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
