"use client";

import type React from "react";
import { parseComboDisplayMeta } from "@/lib/combo/display";

export type ClienteJoin = {
  nome?: string | null;
};

export type ComandaRow = {
  id: string;
  numero: number;
  status: string;
  subtotal?: number | null;
  desconto?: number | null;
  acrescimo?: number | null;
  total?: number | null;
  aberta_em?: string | null;
  fechada_em?: string | null;
  cancelada_em?: string | null;
  id_cliente?: string | null;
  clientes?: ClienteJoin | ClienteJoin[] | null;
};

export type PagamentoRow = {
  id: string;
  id_comanda: string;
  forma_pagamento: string;
  valor: number | null;
  valor_credito_cliente?: number | null;
  valor_troco?: number | null;
  destino_excedente?: string | null;
  parcelas?: number | null;
  taxa_maquininha_percentual?: number | null;
  taxa_maquininha_valor?: number | null;
  observacoes?: string | null;
  pago_em?: string | null;
};

export type ComissaoRow = {
  id: string;
  id_comanda?: string | null;
  id_profissional?: string | null;
  descricao?: string | null;
  valor_base?: number | null;
  percentual_aplicado?: number | null;
  valor_comissao?: number | null;
  valor_comissao_assistente?: number | null;
  status?: string | null;
  competencia_data?: string | null;
  pago_em?: string | null;
};

export type ProfissionalRow = {
  id: string;
  nome: string;
  tipo_profissional?: string | null;
  status?: string | null;
};

export type ComandaItemRow = {
  id: string;
  id_comanda: string;
  tipo_item?: string | null;
  descricao?: string | null;
  quantidade?: number | null;
  valor_unitario?: number | null;
  valor_total?: number | null;
  custo_total?: number | null;
  id_profissional?: string | null;
  id_assistente?: string | null;
};

export type CaixaSessaoResumoRow = {
  id: string;
  status: string;
  aberto_em?: string | null;
  fechado_em?: string | null;
  valor_abertura?: number | null;
  valor_previsto_fechamento?: number | null;
  valor_fechamento_informado?: number | null;
  valor_diferenca_fechamento?: number | null;
  tipo_fechamento?: string | null;
  observacoes?: string | null;
};

export type ResumoFinanceiro = {
  faturamentoBruto: number;
  descontos: number;
  acrescimos: number;
  faturamentoLiquido: number;
  recebido: number;
  recebidoBruto: number;
  creditoGerado: number;
  troco: number;
  divergenciaRecebimento: number;
  taxaMaquininha: number;
  comissaoPendente: number;
  comissaoPaga: number;
  canceladas: number;
  quantidadeVendas: number;
  ticketMedio: number;
  custoItens: number;
  lucroLiquidoSalao: number;
};

export type ResumoCaixa = {
  sessoesFechadas: number;
  previstoFechamento: number;
  contadoFechamento: number;
  quebraTotal: number;
  sobraTotal: number;
};

export type StatusFiltro = "fechada" | "cancelada" | "todos";
export type PainelLateralTab = "pagamentos" | "comissoes";
export type DatePresetKey = "hoje" | "ontem" | "7dias" | "mes";
export type PrintSectionKey = "vendas" | "pagamentos" | "comissoes" | "caixa" | "itens";
export type PrintSelection = Record<PrintSectionKey, boolean>;

export function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function getJoinedName(
  value: ClienteJoin | ClienteJoin[] | null | undefined,
  fallback = "-"
) {
  const first = toArray(value)[0];
  return first?.nome || fallback;
}

export function formatCurrency(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

export function formatDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function getDatePresetRange(key: DatePresetKey) {
  const today = new Date();

  if (key === "ontem") {
    const yesterday = addDays(today, -1);
    return {
      start: formatDateInput(yesterday),
      end: formatDateInput(yesterday),
    };
  }

  if (key === "7dias") {
    return {
      start: formatDateInput(addDays(today, -6)),
      end: formatDateInput(today),
    };
  }

  if (key === "mes") {
    return {
      start: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
      end: formatDateInput(today),
    };
  }

  return {
    start: formatDateInput(today),
    end: formatDateInput(today),
  };
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatFormaPagamentoLabel(value: string) {
  const key = (value || "").trim().toLowerCase();

  if (key === "pix") return "Pix";
  if (key === "dinheiro") return "Dinheiro";
  if (key === "debito") return "Débito";
  if (key === "credito") return "Crédito";
  if (key === "credito_cliente") return "Crédito da cliente";
  if (key === "transferencia") return "Transferência";
  if (!key) return "-";

  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function formatTipoItemLabel(value?: string | null) {
  const key = (value || "").trim().toLowerCase();
  if (key === "servico") return "Serviço";
  if (key === "produto") return "Produto";
  if (key === "extra") return "Extra";
  if (key === "ajuste") return "Ajuste";
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : "-";
}

export function csvCell(value: string | number | null | undefined) {
  const normalized = String(value ?? "").replaceAll('"', '""');
  return `"${normalized}"`;
}

export function getStatusBadgeClass(status: string) {
  if (status === "fechada") {
    return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  }

  if (status === "cancelada") {
    return "bg-rose-100 text-rose-700 border border-rose-200";
  }

  if (status === "aguardando_pagamento") {
    return "bg-amber-100 text-amber-700 border border-amber-200";
  }

  return "bg-zinc-100 text-zinc-700 border border-zinc-200";
}

export function KpiCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-700">
          {icon}
        </div>

        <div className="min-w-0">
          <div className="text-sm text-zinc-500">{label}</div>
          <div className="mt-1 text-2xl font-bold text-zinc-900">{value}</div>
          {helper ? <div className="mt-1 text-xs text-zinc-500">{helper}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function ComboDescriptionCell({
  descricao,
}: {
  descricao: string | null | undefined;
}) {
  const comboMeta = parseComboDisplayMeta(descricao);

  return (
    <div>
      <div className="text-sm text-zinc-700">{comboMeta.displayTitle}</div>
      {comboMeta.isComboItem && comboMeta.comboName ? (
        <div className="mt-1 inline-flex items-center gap-2">
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
            Combo
          </span>
          <span className="text-xs text-zinc-500">{comboMeta.comboName}</span>
        </div>
      ) : null}
    </div>
  );
}
