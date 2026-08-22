"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { atualizarStatusCampanhaInlineAction } from "@/app/(painel)/campanhas/actions";

type CampanhaStatus = "ativa" | "pausada";
type CampanhaStatusChange = {
  id: string;
  status: CampanhaStatus;
};

const CAMPANHA_STATUS_CHANGE_EVENT = "campanha-status-change";

const STATUS_META: Record<CampanhaStatus, { label: string; className: string }> = {
  ativa: {
    label: "Ativa",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  pausada: {
    label: "Pausada",
    className: "border-zinc-200 bg-zinc-100 text-zinc-700",
  },
};

function normalizeStatus(status: string): CampanhaStatus {
  return status === "pausada" ? "pausada" : "ativa";
}

function notifyCampaignStatusChange(id: string, status: CampanhaStatus) {
  window.dispatchEvent(
    new CustomEvent<CampanhaStatusChange>(CAMPANHA_STATUS_CHANGE_EVENT, {
      detail: { id, status },
    })
  );
}

export function CampanhaStatusBadge({
  id,
  initialStatus,
  initialLabel,
  initialClassName,
}: {
  id: string;
  initialStatus: string;
  initialLabel: string;
  initialClassName: string;
}) {
  const [status, setStatus] = useState<CampanhaStatus>(
    normalizeStatus(initialStatus)
  );
  const [hasClientUpdate, setHasClientUpdate] = useState(false);

  useEffect(() => {
    function handleStatusChange(event: Event) {
      const detail = (event as CustomEvent<CampanhaStatusChange>).detail;
      if (!detail || detail.id !== id) return;

      setStatus(detail.status);
      setHasClientUpdate(true);
    }

    window.addEventListener(CAMPANHA_STATUS_CHANGE_EVENT, handleStatusChange);
    return () => {
      window.removeEventListener(CAMPANHA_STATUS_CHANGE_EVENT, handleStatusChange);
    };
  }, [id]);

  const meta = hasClientUpdate
    ? STATUS_META[status]
    : { label: initialLabel, className: initialClassName };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export default function CampanhaStatusToggle({
  id,
  initialStatus,
}: {
  id: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState<CampanhaStatus>(
    normalizeStatus(initialStatus)
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const nextStatus: CampanhaStatus = status === "ativa" ? "pausada" : "ativa";
  const Icon = status === "ativa" ? Pause : Play;

  function handleToggle() {
    setError("");
    startTransition(async () => {
      const result = await atualizarStatusCampanhaInlineAction({
        id,
        status: nextStatus,
      });

      if (!result.ok) {
        setError(result.error || "Nao foi possivel atualizar.");
        return;
      }

      setStatus(normalizeStatus(result.status || nextStatus));
      notifyCampaignStatusChange(id, normalizeStatus(result.status || nextStatus));
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-70"
      >
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
        {isPending ? "Atualizando" : status === "ativa" ? "Pausar" : "Ativar"}
      </button>
      {error ? (
        <span className="text-[11px] font-semibold text-rose-700" role="status">
          {error}
        </span>
      ) : null}
    </div>
  );
}
