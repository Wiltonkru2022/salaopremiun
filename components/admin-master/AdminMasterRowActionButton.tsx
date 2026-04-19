"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RowActionState =
  | { status: "idle"; label: string; href?: undefined }
  | { status: "loading"; label: string; href?: undefined }
  | { status: "success"; label: string; href?: string }
  | { status: "error"; label: string; href?: undefined };

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
  if (actionType === "salao_detail") {
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
        assunto: "Cobranca em atraso no AdminMaster",
        mensagem:
          "Cobranca pendente ou vencida identificada no painel financeiro. Validar contato, pagamento e regularizacao.",
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
        className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-950 hover:text-white hover:ring-zinc-950"
      >
        {normalizedLabel}
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
        throw new Error(data.error || "Nao foi possivel executar a acao.");
      }

      if (apiRequest.successLabel) {
        setState({ status: "success", label: apiRequest.successLabel });
        router.refresh();
        return;
      }

      if (!data.resultado?.ticketId) {
        throw new Error(data.error || "Nao foi possivel criar o ticket.");
      }

      const ticketLabel = data.resultado.ticketNumero
        ? `Ticket #${data.resultado.ticketNumero}`
        : "Ticket criado";
      const suffix = data.resultado.existed ? " ja existe" : " criado";

      setState({
        status: "success",
        label: `${ticketLabel}${suffix}`,
        href: `/admin-master/tickets/${data.resultado.ticketId}`,
      });
      router.refresh();
    } catch (error) {
      setState({
        status: "error",
        label: error instanceof Error ? error.message : "Erro ao criar ticket",
      });
    }
  }

  if (state.status === "success") {
    return state.href ? (
      <Link
        href={state.href}
        className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200"
      >
        {state.label}
      </Link>
    ) : (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
        {state.label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAction}
      disabled={state.status === "loading"}
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 transition ${
        state.status === "error"
          ? "bg-red-50 text-red-700 ring-red-200"
          : "bg-zinc-950 text-white ring-zinc-950 hover:bg-zinc-800 disabled:cursor-wait disabled:bg-zinc-400"
      }`}
      title={state.status === "error" ? state.label : undefined}
    >
      {state.label}
    </button>
  );
}
