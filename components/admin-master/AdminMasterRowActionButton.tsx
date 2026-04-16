"use client";

import Link from "next/link";
import { useState } from "react";

type RowActionState =
  | { status: "idle"; label: string; href?: undefined }
  | { status: "loading"; label: string; href?: undefined }
  | { status: "success"; label: string; href: string }
  | { status: "error"; label: string; href?: undefined };

type CreateTicketResponse = {
  ok?: boolean;
  error?: string;
  resultado?: {
    ticketId?: string;
    ticketNumero?: number;
    status?: string;
    existed?: boolean;
  };
};

export default function AdminMasterRowActionButton({
  actionType,
  actionId,
  label,
}: {
  actionType?: string | null;
  actionId?: string | null;
  label?: string | null;
}) {
  const normalizedLabel = label || "-";
  const [state, setState] = useState<RowActionState>({
    status: "idle",
    label: normalizedLabel,
  });

  if (actionType !== "checkout_ticket" || !actionId || normalizedLabel === "-") {
    return <span>{normalizedLabel}</span>;
  }

  async function handleCreateTicket() {
    setState({ status: "loading", label: "Criando..." });

    try {
      const response = await fetch(
        `/api/admin-master/checkouts/${encodeURIComponent(actionId || "")}/criar-ticket`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assumir: true }),
        }
      );
      const data = (await response.json().catch(() => ({}))) as CreateTicketResponse;

      if (!response.ok || !data.ok || !data.resultado?.ticketId) {
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
    } catch (error) {
      setState({
        status: "error",
        label: error instanceof Error ? error.message : "Erro ao criar ticket",
      });
    }
  }

  if (state.status === "success") {
    return (
      <Link
        href={state.href}
        className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200"
      >
        {state.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCreateTicket}
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
