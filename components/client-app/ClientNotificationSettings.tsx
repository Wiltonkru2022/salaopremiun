"use client";

import { useState, useTransition } from "react";
import {
  toggleClienteNotificationPreferenceAction,
  type ClienteNotificationPreferenceKey,
} from "@/app/app-cliente/perfil/configuracoes/actions";

type SettingsState = Record<ClienteNotificationPreferenceKey, boolean>;

type ToggleRowProps = {
  label: string;
  helper?: string;
  preferenceKey: ClienteNotificationPreferenceKey;
  settings: SettingsState;
  disabled?: boolean;
  onToggle: (key: ClienteNotificationPreferenceKey, enabled: boolean) => void;
};

function ToggleRow({
  label,
  helper,
  preferenceKey,
  settings,
  disabled,
  onToggle,
}: ToggleRowProps) {
  const enabled = settings[preferenceKey];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(preferenceKey, !enabled)}
      className="flex min-h-20 w-full items-center justify-between gap-4 border-b border-zinc-100 px-1 text-left disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span>
        <span className="block text-lg text-zinc-950">{label}</span>
        {helper ? (
          <span className="mt-1 block text-sm leading-5 text-zinc-500">
            {helper}
          </span>
        ) : null}
      </span>
      <span
        className={`relative h-9 w-16 shrink-0 rounded-full transition ${
          enabled ? "bg-zinc-950" : "bg-zinc-200"
        }`}
      >
        <span
          className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-sm transition ${
            enabled ? "left-8" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

export default function ClientNotificationSettings({
  initialSettings,
}: {
  initialSettings: SettingsState;
}) {
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function applyCascade(
    current: SettingsState,
    key: ClienteNotificationPreferenceKey,
    enabled: boolean
  ) {
    const next = { ...current, [key]: enabled };

    if (key === "notificacoes_ativas" && !enabled) {
      next.notificacao_app_ativa = false;
      next.notificacao_email_ativa = false;
    }

    if (
      (key === "notificacao_app_ativa" || key === "notificacao_email_ativa") &&
      enabled
    ) {
      next.notificacoes_ativas = true;
    }

    return next;
  }

  function handleToggle(
    key: ClienteNotificationPreferenceKey,
    enabled: boolean
  ) {
    const previous = settings;
    const optimistic = applyCascade(previous, key, enabled);

    setSettings(optimistic);
    setMessage("");

    startTransition(async () => {
      const result = await toggleClienteNotificationPreferenceAction(
        key,
        enabled
      );

      if (!result.ok) {
        setSettings(previous);
        setMessage(result.error || "Não foi possível salvar agora.");
        return;
      }

      setMessage("Preferência salva.");
    });
  }

  return (
    <div>
      <div className="mb-3 bg-zinc-50 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
        Notificações
      </div>
      <ToggleRow
        label="Ativar notificações"
        helper="Liga ou desliga todos os avisos da sua conta no app cliente."
        preferenceKey="notificacoes_ativas"
        settings={settings}
        disabled={isPending}
        onToggle={handleToggle}
      />
      <ToggleRow
        label="Notificação do app"
        helper="Avisos de reserva, reagendamento e avaliação."
        preferenceKey="notificacao_app_ativa"
        settings={settings}
        disabled={isPending || !settings.notificacoes_ativas}
        onToggle={handleToggle}
      />
      <ToggleRow
        label="E-mail"
        helper="Confirmações importantes no e-mail."
        preferenceKey="notificacao_email_ativa"
        settings={settings}
        disabled={isPending || !settings.notificacoes_ativas}
        onToggle={handleToggle}
      />

      {message ? (
        <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700">
          {message}
        </div>
      ) : null}
    </div>
  );
}
