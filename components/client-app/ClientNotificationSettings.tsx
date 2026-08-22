"use client";

import { useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { toggleClienteNotificationPreferenceAction } from "@/app/app-cliente/perfil/configuracoes/actions";
import PushPermissionRuntime from "@/components/push/PushPermissionRuntime";

export default function ClientNotificationSettings({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const previous = enabled;
    const next = !previous;
    setEnabled(next);
    setMessage("");

    startTransition(async () => {
      const result = await toggleClienteNotificationPreferenceAction(next);
      if (!result.ok) {
        setEnabled(previous);
        setMessage(result.error || "Não foi possível salvar agora.");
        return;
      }
      setMessage(next ? "Avisos do app ativados." : "Avisos do app desativados.");
    });
  }

  return (
    <div>
      <div className="mb-3 bg-zinc-50 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
        Notificações
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-amber-700 shadow-sm">
            <BellRing size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-black text-zinc-950">Notificações no celular</p>
            <p className="mt-1 text-sm leading-5 text-zinc-600">
              Receba avisos de reserva, confirmação, reagendamento e avaliação mesmo fora do app.
            </p>
          </div>
          <PushPermissionRuntime audience="cliente_app" />
        </div>
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={handleToggle}
        className="mt-3 flex min-h-20 w-full items-center justify-between gap-4 border-b border-zinc-100 px-1 text-left disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span>
          <span className="block text-lg text-zinc-950">Receber avisos do app</span>
          <span className="mt-1 block text-sm leading-5 text-zinc-500">
            Liga ou desliga os avisos enviados pelo Salão Premium para esta conta.
          </span>
        </span>
        <span className={`relative h-9 w-16 shrink-0 rounded-full transition ${enabled ? "bg-zinc-950" : "bg-zinc-200"}`}>
          <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-sm transition ${enabled ? "left-8" : "left-1"}`} />
        </span>
      </button>

      <p className="mt-3 text-xs leading-5 text-zinc-500">
        O botão acima controla os avisos da sua conta. A permissão do celular também precisa estar liberada para receber notificações fora do app.
      </p>

      {message ? (
        <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700">
          {message}
        </div>
      ) : null}
    </div>
  );
}
