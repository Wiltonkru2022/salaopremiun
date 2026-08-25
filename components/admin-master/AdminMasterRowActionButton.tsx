"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";

type RowActionState =
  | { status: "idle"; label: string; href?: undefined }
  | { status: "loading"; label: string; href?: undefined }
  | { status: "success"; label: string; href?: string }
  | { status: "error"; label: string; detail: string; href?: undefined };

type CreateTicketResponse = {
  ok?: boolean;
  error?: string;
  resultado?: {
    ticketId?: string;
    ticketNumero?: number;
    status?: string;
    existed?: boolean;
    resolvido?: boolean;
  };
};

type RowActionRequest =
  | {
      kind: "api";
      endpoint: string;
      body: Record<string, unknown>;
      successLabel: string | null;
      loadingLabel: string;
    }
  | {
      kind: "link";
      href: string;
    };

function buildActionRequest(actionType: string, actionId: string) {
  if (actionType === "salao_detail" || actionType === "abrir_salao") {
    return {
      kind: "link",
      href: `/admin-master/saloes/${encodeURIComponent(actionId)}`,
    } satisfies RowActionRequest;
  }

  if (actionType === "ticket_detail") {
    return {
      kind: "link",
      href: `/admin-master/tickets/${encodeURIComponent(actionId)}`,
    } satisfies RowActionRequest;
  }

  if (actionType === "campanha_detail") {
    return {
      kind: "link",
      href: `/admin-master/campanhas/${encodeURIComponent(actionId)}`,
    } satisfies RowActionRequest;
  }

  if (actionType === "parceria_campaign_edit") {
    return {
      kind: "link",
      href: `/admin-master/parcerias?campanha=${encodeURIComponent(actionId)}#campanhas`,
    } satisfies RowActionRequest;
  }

  if (actionType === "notificacao_detail") {
    return {
      kind: "link",
      href: `/admin-master/notificacoes/${encodeURIComponent(actionId)}`,
    } satisfies RowActionRequest;
  }

  if (actionType === "whatsapp_detail") {
    return {
      kind: "link",
      href: `/admin-master/whatsapp/${encodeURIComponent(actionId)}`,
    } satisfies RowActionRequest;
  }

  if (actionType === "audit") {
    return {
      kind: "link",
      href: `/admin-master/logs?busca=${encodeURIComponent(actionId)}`,
    } satisfies RowActionRequest;
  }

  if (actionType === "salao_ticket_assinatura") {
    return {
      kind: "api",
      endpoint: `/api/admin-master/saloes/${encodeURIComponent(actionId)}/criar-ticket`,
      body: {
        assunto: "Assinatura em risco no AdminMaster",
        mensagem:
          "Assinatura com status ou vencimento exigindo acompanhamento manual no AdminMaster.",
        prioridade: "alta",
        categoria: "financeiro",
      },
      successLabel: null,
      loadingLabel: "Criando...",
    } satisfies RowActionRequest;
  }

  if (actionType === "salao_ticket_financeiro") {
    return {
      kind: "api",
      endpoint: `/api/admin-master/saloes/${encodeURIComponent(actionId)}/criar-ticket`,
      body: {
        assunto: "Cobrança em atraso no AdminMaster",
        mensagem:
          "Cobrança pendente ou vencida identificada no painel financeiro. Validar contato, pagamento e regularizacao.",
        prioridade: "alta",
        categoria: "financeiro",
      },
      successLabel: null,
      loadingLabel: "Criando...",
    } satisfies RowActionRequest;
  }

  if (actionType === "checkout_ticket") {
    return {
      kind: "api",
      endpoint: `/api/admin-master/checkouts/${encodeURIComponent(actionId)}/criar-ticket`,
      body: { assumir: true },
      successLabel: null,
      loadingLabel: "Criando...",
    } satisfies RowActionRequest;
  }

  if (actionType === "alert_ticket") {
    return {
      kind: "api",
      endpoint: `/api/admin-master/alertas/${encodeURIComponent(actionId)}/criar-ticket`,
      body: { assumir: true },
      successLabel: null,
      loadingLabel: "Criando...",
    } satisfies RowActionRequest;
  }

  if (actionType === "alert_resolve") {
    return {
      kind: "api",
      endpoint: `/api/admin-master/alertas/${encodeURIComponent(actionId)}/resolver`,
      body: { motivo: "Resolvido manualmente pelo AdminMaster." },
      successLabel: "Resolvido",
      loadingLabel: "Resolvendo...",
    } satisfies RowActionRequest;
  }

  if (actionType === "webhook_payload") {
    return {
      kind: "link",
      href: `/admin-master/webhooks/${encodeURIComponent(actionId)}`,
    } satisfies RowActionRequest;
  }

  if (actionType === "webhook_reprocess") {
    return {
      kind: "api",
      endpoint: `/api/admin-master/webhooks/${encodeURIComponent(actionId)}/reprocessar`,
      body: {},
      successLabel: "Reprocessado",
      loadingLabel: "Reprocessando...",
    } satisfies RowActionRequest;
  }

  return null;
}

export default function AdminMasterRowActionButton({
  actionType,
  actionId,
  label,
}: {
  actionType?: string | null;
  actionId?: string | null;
  label?: string | null;
}) {
  const router = useRouter();
  const normalizedLabel = label || "-";
  const request = buildActionRequest(actionType || "", actionId || "");
  const [state, setState] = useState<RowActionState>({
    status: "idle",
    label: normalizedLabel,
  });

  if (!actionType || !actionId || normalizedLabel === "-" || !request) {
    return <span>{normalizedLabel}</span>;
  }

  if (request.kind === "link") {
    return (
      <Link
        href={request.href}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 hover:text-violet-900"
      >
        {normalizedLabel}
        <ArrowRight size={12} />
      </Link>
    );
  }

  const apiRequest = request;

  async function handleAction() {
    setState({ status: "loading", label: apiRequest.loadingLabel });

    try {
      const response = await fetch(apiRequest.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiRequest.body),
      });
      const data = (await response.json().catch(() => ({}))) as CreateTicketResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Não foi possível executar a ação.");
      }

      if (apiRequest.successLabel) {
        setState({ status: "success", label: apiRequest.successLabel });
        router.refresh();
        window.setTimeout(() => {
          setState({ status: "idle", label: normalizedLabel });
        }, 2200);
        return;
      }

      if (!data.resultado?.ticketId) {
        throw new Error(data.error || "Não foi possível criar o ticket.");
      }

      const ticketLabel = data.resultado.ticketNumero
        ? `Ticket #${data.resultado.ticketNumero}`
        : "Ticket criado";
      const suffix = data.resultado.existed ? " já existe" : " criado";

      setState({
        status: "success",
        label: `${ticketLabel}${suffix}`,
        href: `/admin-master/tickets/${data.resultado.ticketId}`,
      });
      router.refresh();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro ao executar acao.";
      const time = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setState({
        status: "error",
        label: `Erro ${time}`,
        detail,
      });
      window.setTimeout(() => {
        setState({ status: "idle", label: normalizedLabel });
      }, 12000);
    }
  }

  if (state.status === "success") {
    return state.href ? (
      <Link
        href={state.href}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700"
      >
        <CheckCircle2 size={12} />
        {state.label}
      </Link>
    ) : (
      <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
        <CheckCircle2 size={12} />
        {state.label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAction}
      disabled={state.status === "loading"}
      className={`inline-flex min-h-8 rounded-lg border px-3 py-1.5 text-xs font-black transition ${
        state.status === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-violet-700 bg-violet-700 text-white hover:bg-violet-800 disabled:cursor-wait disabled:border-zinc-300 disabled:bg-zinc-300"
      }`}
      title={state.status === "error" ? state.detail : undefined}
    >
      <span className="inline-flex items-center gap-1.5">
        {state.status === "loading" ? (
          <LoaderCircle size={12} className="animate-spin" />
        ) : state.status === "error" ? (
          <AlertTriangle size={12} />
        ) : null}
        {state.label}
      </span>
      {state.status === "error" ? <span className="sr-only">{state.detail}</span> : null}
    </button>
  );
}
