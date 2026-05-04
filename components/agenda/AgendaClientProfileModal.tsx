"use client";

import {
  CalendarDays,
  Clock3,
  MessageSquareText,
  Phone,
  UserRound,
  X,
} from "lucide-react";

type ClienteHistoricoItem = {
  id: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: string;
  servicoNome: string;
  observacoes: string | null;
};

type Props = {
  open: boolean;
  loading: boolean;
  clienteNome: string;
  clienteWhatsapp?: string | null;
  creditoDisponivel?: number;
  historico: ClienteHistoricoItem[];
  onClose: () => void;
  variant?: "modal" | "sidebar";
};

function getStatusLabel(status: string) {
  switch (status) {
    case "confirmado":
      return "Confirmado";
    case "pendente":
      return "Pendente";
    case "atendido":
      return "Atendido";
    case "cancelado":
      return "Cancelado";
    case "aguardando_pagamento":
      return "Em caixa";
    default:
      return status;
  }
}

function ProfileStat({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "default" | "success";
}) {
  return (
    <div className="rounded-[18px] border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
        {label}
      </div>
      <div
        className={`mt-1.5 break-words text-sm font-semibold ${
          tone === "success" ? "text-emerald-700" : "text-zinc-900"
        }`}
      >
        {value}
      </div>
      {helper ? (
        <div className="mt-1 break-words text-xs leading-5 text-zinc-500">
          {helper}
        </div>
      ) : null}
    </div>
  );
}

function ProfileBody({
  clienteNome,
  clienteWhatsapp,
  creditoDisponivel = 0,
  historico,
  loading,
}: {
  clienteNome: string;
  clienteWhatsapp?: string | null;
  creditoDisponivel?: number;
  historico: ClienteHistoricoItem[];
  loading: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="border-b border-zinc-200 bg-zinc-50/70 px-5 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Perfil da cliente
        </div>
        <h3 className="mt-1 break-words text-lg font-bold text-zinc-900">
          {clienteNome}
        </h3>
        {clienteWhatsapp ? (
          <div className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
            <Phone size={12} />
            <span className="break-all">{clienteWhatsapp}</span>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {loading ? (
          <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
            Carregando historico da cliente...
          </div>
        ) : historico.length === 0 ? (
          <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
            Ainda nao encontramos agendamentos anteriores dessa cliente.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <ProfileStat
                label="Historico"
                value={`${historico.length} agendamento${historico.length === 1 ? "" : "s"}`}
                helper="Ultimos agendamentos da cliente"
              />
              <ProfileStat
                label="Ultimo servico"
                value={historico[0]?.servicoNome || "-"}
              />
              <ProfileStat
                label="Credito disponivel"
                value={creditoDisponivel.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
                tone="success"
              />
              <ProfileStat
                label="Ultima observacao"
                value={
                  historico.find((item) => item.observacoes)?.observacoes ||
                  "Sem observacoes salvas."
                }
              />
            </div>

            <div className="space-y-3">
              {historico.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[20px] border border-zinc-200 bg-white px-4 py-3"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
                          <CalendarDays size={12} />
                          {item.data}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
                          <Clock3 size={12} />
                          {item.horaInicio} - {item.horaFim}
                        </span>
                        <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700">
                          {getStatusLabel(item.status)}
                        </span>
                      </div>

                      <div className="mt-2 flex items-start gap-2 text-sm font-semibold text-zinc-900">
                        <UserRound size={14} className="text-zinc-400" />
                        <span className="break-words">{item.servicoNome}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-[16px] bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                      <MessageSquareText size={12} />
                      Observacoes
                    </div>
                    <div className="break-words">
                      {item.observacoes || "Sem observacoes registradas."}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgendaClientProfileModal({
  open,
  loading,
  clienteNome,
  clienteWhatsapp,
  creditoDisponivel,
  historico,
  onClose,
  variant = "modal",
}: Props) {
  if (!open) return null;

  const body = (
    <ProfileBody
      clienteNome={clienteNome}
      clienteWhatsapp={clienteWhatsapp}
      creditoDisponivel={creditoDisponivel}
      historico={historico}
      loading={loading}
    />
  );

  if (variant === "sidebar") {
    return body;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[88vh] w-full max-w-[860px] flex-col overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800"
        >
          <X size={16} />
        </button>
        {body}
      </div>
    </div>
  );
}
