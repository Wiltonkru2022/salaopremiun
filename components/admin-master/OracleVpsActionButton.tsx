"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, LoaderCircle, ServerCog, TriangleAlert } from "lucide-react";

type OracleVpsAction = "ping" | "backup" | "notifications" | "report";

const ACTION_COPY: Record<
  OracleVpsAction,
  { label: string; loading: string; success: string; endpoint: string }
> = {
  ping: {
    label: "Enviar ping",
    loading: "Enviando...",
    success: "Ping enviado",
    endpoint: "/api/admin-master/oracle-vps/ping",
  },
  backup: {
    label: "Agendar backup leve",
    loading: "Agendando...",
    success: "Backup registrado",
    endpoint: "/api/admin-master/oracle-vps/backup",
  },
  notifications: {
    label: "Processar notificações",
    loading: "Registrando...",
    success: "Job registrado",
    endpoint: "/api/admin-master/oracle-vps/notifications",
  },
  report: {
    label: "Gerar relatório leve",
    loading: "Registrando...",
    success: "Relatório registrado",
    endpoint: "/api/admin-master/oracle-vps/report",
  },
};

export default function OracleVpsActionButton({
  action,
}: {
  action: OracleVpsAction;
}) {
  const router = useRouter();
  const copy = ACTION_COPY[action];
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState(copy.label);

  async function handleClick() {
    setState("loading");
    setMessage(copy.loading);

    try {
      const response = await fetch(copy.endpoint, { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Não foi possível executar a ação.");
      }

      setState("success");
      setMessage(copy.success);
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Falha na ação.");
    }
  }

  const Icon =
    state === "loading"
      ? LoaderCircle
      : state === "success"
        ? CheckCircle2
        : state === "error"
          ? TriangleAlert
          : ServerCog;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "loading"}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition ${
        state === "success"
          ? "border-emerald-200 bg-emerald-100 text-emerald-950"
          : state === "error"
            ? "border-red-200 bg-red-100 text-red-950"
            : "border-zinc-900 bg-zinc-950 text-white hover:bg-zinc-800"
      }`}
    >
      <Icon size={16} className={state === "loading" ? "animate-spin" : ""} />
      <span className="max-w-[220px] truncate">{message}</span>
    </button>
  );
}
