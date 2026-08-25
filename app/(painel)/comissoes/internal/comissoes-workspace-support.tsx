"use client";

import { parseComboDisplayMeta } from "@/lib/combo/display";

export function formatCurrency(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatPercent(value: number | null | undefined) {
  return `${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
}

export function formatDateTimeCompact(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })} ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function escapeHtml(value: string | null | undefined) {
  return String(value || "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function extractMoneyFromObservacao(
  observacoes: string | null | undefined,
  label: string
) {
  const match = String(observacoes || "").match(
    new RegExp(`${label}:\\s*([0-9]+(?:[,.][0-9]{1,2})?)`, "i")
  );
  if (!match) return 0;
  return Number(match[1].replace(",", ".")) || 0;
}

export function getPrintDetail(item: {
  observacoes?: string | null;
  comanda?: { desconto?: number | null; acrescimo?: number | null } | null;
  comanda_item?: { custo_total?: number | null; tipo_item?: string | null } | null;
}) {
  const descontoRateado = extractMoneyFromObservacao(
    item.observacoes,
    "desconto rateado"
  );
  const acrescimoRateado = extractMoneyFromObservacao(
    item.observacoes,
    "acrescimo rateado"
  );
  const taxa = extractMoneyFromObservacao(item.observacoes, "taxa descontada");
  const assistente = extractMoneyFromObservacao(
    item.observacoes,
    "assistente descontado"
  );

  return {
    custoProduto:
      String(item.comanda_item?.tipo_item || "").toLowerCase() === "produto"
        ? Number(item.comanda_item?.custo_total || 0)
        : 0,
    descontoRateado,
    acrescimoRateado,
    taxa,
    assistente,
  };
}

export function formatDocument(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }
  return value || "-";
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function origemMeta(origem: string | null | undefined) {
  if (origem === "profissional_servico") {
    return {
      badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
      description: "Exceção do profissional no serviço.",
      label: "Exceção do profissional",
    };
  }
  if (origem === "servico_padrao") {
    return {
      badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
      description: "Percentual herdado do serviço.",
      label: "Padrão do serviço",
    };
  }
  if (origem === "profissional_padrao") {
    return {
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      description: "Percentual herdado do cadastro antigo.",
      label: "Padrão antigo do profissional",
    };
  }
  if (origem === "assistente") {
    return {
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      description: "Lançamento destinado ao assistente.",
      label: "Assistente",
    };
  }
  if (origem === "manual") {
    return {
      badgeClass: "border-zinc-200 bg-zinc-100 text-zinc-700",
      description: "Lançamento criado manualmente.",
      label: "Lançamento manual",
    };
  }
  return {
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
    description: "Não encontrou uma regra clara.",
    label: "Sem regra definida",
  };
}

export function ComboDescriptionBlock({
  descricao,
  observacoes,
}: {
  descricao: string | null | undefined;
  observacoes: string | null | undefined;
}) {
  const comboMeta = parseComboDisplayMeta(descricao);

  return (
    <>
      <div className="max-w-[230px] truncate text-[13px] font-semibold text-zinc-900">
        {comboMeta.displayTitle}
      </div>
      {comboMeta.isComboItem && comboMeta.comboName ? (
        <div className="mt-1 flex max-w-[230px] items-center gap-2 overflow-hidden text-xs text-zinc-500">
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
            Combo
          </span>
          <span className="truncate">{comboMeta.comboName}</span>
        </div>
      ) : null}
      <div className="mt-1 max-h-10 max-w-[230px] overflow-hidden text-[11px] leading-5 text-zinc-500">
        {observacoes || "Sem observações adicionais."}
      </div>
    </>
  );
}
