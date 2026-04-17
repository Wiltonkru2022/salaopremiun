"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminMasterWebhookReprocessButton({
  webhookId,
}: {
  webhookId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"idle" | "success" | "error">("idle");

  async function handleClick() {
    setLoading(true);
    setMessage("");
    setTone("idle");

    try {
      const response = await fetch(
        `/api/admin-master/webhooks/${encodeURIComponent(webhookId)}/reprocessar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Nao foi possivel reprocessar o webhook.");
      }

      setTone("success");
      setMessage("Webhook reenfileirado e reprocessado com sucesso.");
      router.refresh();
    } catch (error) {
      setTone("error");
      setMessage(
        error instanceof Error ? error.message : "Falha ao reprocessar o webhook."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:bg-zinc-400"
      >
        {loading ? "Reprocessando..." : "Reprocessar webhook"}
      </button>

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}
