"use client";

import type { ReactNode } from "react";
import type { SalaoForm } from "@/components/configuracoes/types";

export type PasswordForm = {
  novaSenha: string;
  confirmarSenha: string;
  codigoTotp: string;
  backupCode: string;
};

export type ModalKey =
  | "comercial"
  | "endereco"
  | "senha"
  | "autenticador"
  | "app_cliente"
  | "excluir_salao"
  | null;

export type TotpFactor = {
  id: string;
  factor_type?: string;
  friendly_name?: string | null;
  status?: string;
};

export type MfaSnapshot = {
  factorActive: boolean;
  currentLevel: "aal1" | "aal2" | null;
  backupCodesRemaining: number;
  backupCodesLockedUntil: string | null;
  backupCodesGeneratedAt: string | null;
  backupCodesLastUsedAt: string | null;
  sensitiveActionLockedUntil: string | null;
};

export type TotpSetupState = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export type PortfolioFoto = {
  id: string;
  imagemUrl: string;
  legenda: string;
  ordem: number;
};

export type GoogleCalendarConnectionState = {
  loading: boolean;
  connected: boolean;
  configured: boolean;
  allowed: boolean;
  blockReason: string | null;
  googleEmail: string | null;
};

export type GoogleLoginConnectionState = {
  loading: boolean;
  connected: boolean;
  googleEmail: string | null;
};

export type SalaoProfileRow = {
  id?: string | null;
  nome?: string | null;
  responsavel?: string | null;
  email?: string | null;
  telefone?: string | null;
  cpf_cnpj?: string | null;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  logo_url?: string | null;
  plano?: string | null;
  status?: string | null;
  descricao_publica?: string | null;
  foto_capa_url?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  estacionamento?: boolean | null;
  formas_pagamento_publico?: string[] | string | null;
  app_cliente_publicado?: boolean | null;
  app_cliente_pausado?: boolean | null;
  app_cliente_pausa_mensagem?: string | null;
  app_cliente_slug?: string | null;
};

export const EMPTY_PASSWORD: PasswordForm = {
  novaSenha: "",
  confirmarSenha: "",
  codigoTotp: "",
  backupCode: "",
};

export const EMPTY_MFA_SNAPSHOT: MfaSnapshot = {
  factorActive: false,
  currentLevel: null,
  backupCodesRemaining: 0,
  backupCodesLockedUntil: null,
  backupCodesGeneratedAt: null,
  backupCodesLastUsedAt: null,
  sensitiveActionLockedUntil: null,
};

export function formatAddress(form: SalaoForm) {
  const linha1 = [form.endereco, form.numero].filter(Boolean).join(", ");
  const linha2 = [form.bairro, form.cidade, form.estado, form.cep]
    .filter(Boolean)
    .join(" | ");

  return [linha1, linha2].filter(Boolean);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "Não registrado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não registrado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatPaymentMethods(value: string | null | undefined) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function serializePaymentMethods(value: string | null | undefined) {
  return formatPaymentMethods(value).join(", ");
}

export function parseCoordinate(value: string | null | undefined) {
  const normalized = String(value || "").trim().replace(",", ".");
  if (!normalized) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function buscarCoordenadasEndereco(form: SalaoForm) {
  const response = await fetch("/api/painel/salao-geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endereco: form.endereco || "",
      numero: form.numero || "",
      bairro: form.bairro || "",
      cidade: form.cidade || "",
      estado: form.estado || "",
      cep: form.cep || "",
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    coordinates?: {
      latitude?: number;
      longitude?: number;
      precision?: "endereco" | "cidade";
    } | null;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message || "Não foi possível localizar o endereço.");
  }

  return payload.coordinates || null;
}

export function DisplayItem({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div
        className={`text-sm text-zinc-900 ${multiline ? "leading-6" : "break-words"}`}
      >
        {value}
      </div>
    </div>
  );
}

export function SidebarAction({
  icon,
  title,
  description,
  onClick,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  tone?: "default" | "security" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[22px] border p-4 text-left transition hover:-translate-y-0.5 ${
        tone === "danger"
          ? "border-red-200 bg-red-50 text-red-950 hover:bg-red-100"
          : tone === "security"
          ? "border-[rgba(199,162,92,0.35)] bg-[rgba(199,162,92,0.10)]"
          : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`rounded-2xl border p-2.5 ${
            tone === "danger"
              ? "border-red-200 bg-white text-red-700"
              : tone === "security"
              ? "border-[rgba(199,162,92,0.35)] bg-white text-zinc-900"
              : "border-zinc-200 bg-white text-zinc-700"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-zinc-950">{title}</div>
          <div className="mt-1 text-sm leading-5 text-zinc-600">
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}
