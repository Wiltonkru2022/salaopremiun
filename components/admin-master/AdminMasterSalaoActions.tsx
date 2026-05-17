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

type TrialInfo = {
  status: string;
  plano: string;
  trialFimEm?: string | null;
  emailTrial3dSentAt?: string | null;
  emailTrial1dSentAt?: string | null;
  emailTrialTodaySentAt?: string | null;
  emailTrialExpiredSentAt?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  responsavel?: string | null;
  nomeSalao?: string | null;
};

function formatDateInput(value?: string | null) {
  if (!value) return "";

  const normalized = String(value).trim();
  const isoMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})/);

  if (isoMatch) {
    return isoMatch[1];
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return normalized.slice(0, 10);
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    throw new Error(data.error || "Não foi possível concluir a ação.");
  }

  return data;
}

function normalizeWhatsapp(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function buildWhatsappUrl(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

function daysLeft(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function AdminMasterSalaoActions({
  idSalao,
  statusSalao,
  planoAtual,
  vencimentoAtual,
  planos,
  trialInfo,
}: {
  idSalao: string;
  statusSalao: string;
  planoAtual: string;
  vencimentoAtual?: string | null;
  planos: PlanoOption[];
  trialInfo?: TrialInfo | null;
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
  const [ticketAssunto, setTicketAssunto] = useState("Acompanhar salão pelo AdminMaster");
  const [ticketMensagem, setTicketMensagem] = useState(
    "Abrindo ticket interno para acompanhamento operacional deste salão."
  );

  const [trialDias, setTrialDias] = useState(3);
  const salaoBloqueado = String(statusSalao || "").toLowerCase() === "bloqueado";
  const trialDaysLeft = daysLeft(trialInfo?.trialFimEm);
  const trialStatus =
    trialDaysLeft === null
      ? "Sem data de trial"
      : trialDaysLeft < 0
        ? `Vencido ha ${Math.abs(trialDaysLeft)} dia(s)`
        : trialDaysLeft === 0
          ? "Vence hoje"
          : `Vence em ${trialDaysLeft} dia(s)`;
  const lastTrialEmail = [
    trialInfo?.emailTrial3dSentAt,
    trialInfo?.emailTrial1dSentAt,
    trialInfo?.emailTrialTodaySentAt,
    trialInfo?.emailTrialExpiredSentAt,
  ]
    .filter(Boolean)
    .sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0];
  const whatsappPhone = normalizeWhatsapp(trialInfo?.whatsapp);
  const salaoNome = trialInfo?.nomeSalao || "seu salão";
  const whatsappTrialMessage =
    "Oi, tudo bem?\n\nSeu período de teste do SalãoPremium está chegando ao fim.\n\nSe quiser continuar usando a plataforma, posso te ajudar com a ativação do plano ou tirar qualquer dúvida.\n\nTambém podemos liberar mais alguns dias para você testar com calma.";
  const whatsappUpgradeMessage = `Oi, tudo bem?\n\nVi que o ${salaoNome} já está usando o SalãoPremium. Posso te ajudar a ativar o plano ideal para continuar com agenda, clientes, caixa e notificações funcionando.`;
  const whatsappExtraDaysMessage = `Oi, tudo bem?\n\nPodemos liberar mais alguns dias de teste no SalãoPremium para você avaliar com calma. Quer que eu prorrogue o acesso do ${salaoNome}?`;

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
          error instanceof Error ? error.message : "Falha ao executar a ação.",
      });
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-5">
        <div className="rounded-[30px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">
                Relacionamento / Trial
              </div>
              <h3 className="mt-2 font-display text-2xl font-black text-zinc-950">
                Acompanhe o teste gratis deste salao
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Os e-mails automaticos rodam pela VPS uma vez por dia. Aqui voce pode agir
                manualmente sem duplicar disparos do cron.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-right">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">
                Status
              </div>
              <div className="mt-1 text-lg font-black text-zinc-950">{trialStatus}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["Plano", trialInfo?.plano || planoAtual || "-"],
              ["E-mail", trialInfo?.email || "-"],
              ["WhatsApp", trialInfo?.whatsapp || "-"],
              ["Fim do teste", formatDate(trialInfo?.trialFimEm)],
              ["Ultimo aviso", formatDateTime(lastTrialEmail)],
              ["3 dias", formatDateTime(trialInfo?.emailTrial3dSentAt)],
              ["1 dia", formatDateTime(trialInfo?.emailTrial1dSentAt)],
              ["Vencido", formatDateTime(trialInfo?.emailTrialExpiredSentAt)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  {label}
                </div>
                <div className="mt-1 break-words text-sm font-black text-zinc-950">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <a
              href={whatsappPhone ? buildWhatsappUrl(whatsappPhone, whatsappTrialMessage) : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!whatsappPhone}
              className={`rounded-2xl border px-4 py-3 text-center text-sm font-black transition ${
                whatsappPhone
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400"
                  : "pointer-events-none border-zinc-200 bg-zinc-100 text-zinc-400"
              }`}
            >
              Enviar WhatsApp
            </a>
            <a
              href={whatsappPhone ? buildWhatsappUrl(whatsappPhone, whatsappUpgradeMessage) : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!whatsappPhone}
              className={`rounded-2xl border px-4 py-3 text-center text-sm font-black transition ${
                whatsappPhone
                  ? "border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-400"
                  : "pointer-events-none border-zinc-200 bg-zinc-100 text-zinc-400"
              }`}
            >
              Enviar cobranca/upgrade
            </a>
            <a
              href={whatsappPhone ? buildWhatsappUrl(whatsappPhone, whatsappExtraDaysMessage) : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!whatsappPhone}
              className={`rounded-2xl border px-4 py-3 text-center text-sm font-black transition ${
                whatsappPhone
                  ? "border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-400"
                  : "pointer-events-none border-zinc-200 bg-zinc-100 text-zinc-400"
              }`}
            >
              Oferecer mais dias
            </a>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <button
              type="button"
              onClick={() =>
                void runAction(
                  "trial-email",
                  `/api/admin-master/saloes/${idSalao}/trial-email`,
                  { tipo: "manual" },
                  "E-mail de trial enviado pela VPS."
                )
              }
              disabled={loadingKey !== null}
              className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              Enviar e-mail agora
            </button>
            <div className="flex gap-2 rounded-2xl border border-zinc-200 bg-white p-2">
              <input
                type="number"
                min={1}
                max={30}
                value={trialDias}
                onChange={(event) => setTrialDias(Number(event.target.value || 3))}
                className="min-w-0 flex-1 rounded-xl border border-zinc-100 px-3 text-sm font-black outline-none focus:border-zinc-950"
                aria-label="Dias para prorrogar"
              />
              <button
                type="button"
                onClick={() =>
                  void runAction(
                    "trial-extend",
                    `/api/admin-master/saloes/${idSalao}/trial-extend`,
                    {
                      dias: trialDias,
                      currentTrialEndsAt: trialInfo?.trialFimEm || null,
                      motivo: `Prorrogacao manual de ${trialDias} dia(s) pelo Admin Master.`,
                    },
                    "Teste gratis prorrogado pela VPS."
                  )
                }
                disabled={loadingKey !== null}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Prorrogar
              </button>
            </div>
            <button
              type="button"
              onClick={() =>
                void runAction(
                  "trial-converter",
                  `/api/admin-master/saloes/${idSalao}/trocar-plano`,
                  {
                    plano: planoSelecionado === "teste_gratis" ? "pro" : planoSelecionado,
                    motivo:
                      "Conversao manual do teste gratis para plano pago pelo Admin Master.",
                  },
                  "Salao convertido para plano pago."
                )
              }
              disabled={loadingKey !== null}
              className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800 transition hover:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Converter para plano pago
            </button>
            <button
              type="button"
              onClick={() =>
                void runAction(
                  "trial-bloquear",
                  `/api/admin-master/saloes/${idSalao}/bloquear`,
                  {
                    motivo:
                      "Bloqueio apos vencimento do teste gratis pelo bloco Relacionamento / Trial.",
                  },
                  "Salao bloqueado apos vencimento do trial."
                )
              }
              disabled={loadingKey !== null}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-800 transition hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Bloquear apos vencimento
            </button>
          </div>
        </div>

        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
                Ações operacionais
              </div>
              <h3 className="mt-2 font-display text-2xl font-black text-zinc-950">
                Ajustes rapidos do salão
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
                      ? "Desbloqueio rápido pelo detalhe do salão."
                      : "Bloqueio rápido pelo detalhe do salão.",
                  },
                  salaoBloqueado ? "Salão desbloqueado." : "Salão bloqueado."
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
                {salaoBloqueado ? "Desbloquear salão" : "Bloquear salão"}
              </div>
              <div className="mt-2 text-sm opacity-80">
                {salaoBloqueado
                  ? "Restaura acesso operacional do cliente."
                  : "Impede novas operacoes até revisao."}
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
            {feedback.message || "Tudo que você fizer aqui passa pelo servidor e atualiza a tela em seguida."}
          </div>
        </div>

        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
            Plano e vencimento
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
              <label className="text-sm font-bold text-zinc-700">Plano do salão</label>
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
              placeholder="Titulo rápido da observacao"
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-950 outline-none focus:border-zinc-950"
            />
            <textarea
              value={notaTexto}
              onChange={(event) => setNotaTexto(event.target.value)}
              placeholder="Escreva o contexto interno do salão aqui."
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
              Criar ticket do salão
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
