"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import AppLoading from "@/components/ui/AppLoading";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import { useComissoesPage } from "@/components/comissoes/useComissoesPage";
import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  Layers3,
  Printer,
  Search,
  Sparkles,
  User2,
  WalletCards,
} from "lucide-react";
import { groupComboTotals, parseComboDisplayMeta } from "@/lib/combo/display";

type PlanoAccessPayload = {
  recursos?: Record<string, boolean>;
};

function formatCurrency(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
}

function escapeHtml(value: string | null | undefined) {
  return String(value || "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDocument(value: string | null | undefined) {
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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function origemMeta(origem: string | null | undefined) {
  if (origem === "profissional_servico") {
    return {
      badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
      description: "Excecao do profissional no servico.",
      label: "Excecao do profissional",
    };
  }
  if (origem === "servico_padrao") {
    return {
      badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
      description: "Percentual herdado do servico.",
      label: "Padrao do servico",
    };
  }
  if (origem === "profissional_padrao") {
    return {
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      description: "Percentual herdado do cadastro antigo.",
      label: "Padrao antigo do profissional",
    };
  }
  if (origem === "assistente") {
    return {
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      description: "Lancamento destinado ao assistente.",
      label: "Assistente",
    };
  }
  if (origem === "manual") {
    return {
      badgeClass: "border-zinc-200 bg-zinc-100 text-zinc-700",
      description: "Lancamento criado manualmente.",
      label: "Lancamento manual",
    };
  }
  return {
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
    description: "Nao encontrou uma regra clara.",
    label: "Sem regra definida",
  };
}

function ComboDescriptionBlock({
  descricao,
  observacoes,
}: {
  descricao: string | null | undefined;
  observacoes: string | null | undefined;
}) {
  const comboMeta = parseComboDisplayMeta(descricao);

  return (
    <>
      <div className="text-sm font-medium text-zinc-900">
        {comboMeta.displayTitle}
      </div>
      {comboMeta.isComboItem && comboMeta.comboName ? (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700">
            Combo
          </span>
          <span>{comboMeta.comboName}</span>
        </div>
      ) : null}
      <div className="mt-1 text-xs text-zinc-500">
        {observacoes || "Sem observacoes adicionais."}
      </div>
    </>
  );
}

export default function ComissoesPage() {
  const [comissoesAvancadas, setComissoesAvancadas] = useState(false);
  const {
    loading,
    saving,
    erro,
    msg,
    permissoes,
    acessoCarregado,
    podeGerenciar,
    busca,
    setBusca,
    status,
    setStatus,
    tipoDestinatario,
    setTipoDestinatario,
    profissionalId,
    setProfissionalId,
    dataInicial,
    setDataInicial,
    dataFinal,
    setDataFinal,
    profissionais,
    salaoInfo,
    rows,
    resumo,
    confirmacaoComissao,
    setConfirmacaoComissao,
    carregarComissoes,
    marcarComoPago,
    marcarFiltradasComoPagas,
    apurarRateio,
    confirmarAcao,
    totalPendentesCount,
    ticketMedio,
    maiorLancamento,
    resumoPorTipo,
    resumoProfissionais,
    getTipoDestinatario,
    getValorLancamento,
    getStatusComissaoMeta,
    normalizeStatusComissao,
  } = useComissoesPage();

  const comboSummary = useMemo(
    () =>
      groupComboTotals(
        rows,
        (item) => item.descricao,
        (item) => getValorLancamento(item)
      ),
    [getValorLancamento, rows]
  );

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/plano/access", {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => null)) as
          | PlanoAccessPayload
          | null;
        setComissoesAvancadas(Boolean(data?.recursos?.comissoes_avancadas));
      } catch (error) {
        console.error("Falha ao carregar acesso de plano para comissoes:", error);
      }
    })();
  }, []);

  function imprimirRateio() {
    const win = window.open("", "_blank");
    if (!win) return;
    const profissionalSelecionado =
      profissionais.find((item) => item.id === profissionalId) || null;
    const profissionalTitulo =
      profissionalSelecionado?.nome ||
      (profissionalId ? rows[0]?.profissionais?.nome || "Profissional" : "");
    const profissionalCpf =
      profissionalSelecionado?.cpf ||
      (profissionalId ? rows[0]?.profissionais?.cpf || null : null);
    const profissionalTipo =
      profissionalSelecionado?.tipo_profissional ||
      (profissionalId
        ? rows[0]?.profissionais?.tipo_profissional ||
          (getTipoDestinatario(rows[0]) === "assistente"
            ? "assistente"
            : "profissional")
        : null);
    const documentTitle = profissionalTitulo
      ? `Rateio - ${profissionalTitulo}`
      : "Rateio de comissoes";
    const totalGeral = rows.reduce(
      (acc, item) => acc + getValorLancamento(item),
      0
    );
    const mostrarColunaPessoa = !profissionalId;
    const comboSummaryPrint = groupComboTotals(
      rows,
      (item) => item.descricao,
      (item) => getValorLancamento(item)
    );
    const linhas = rows
      .map((item) => {
        const origem = origemMeta(item.origem_percentual);
        const statusInfo = getStatusComissaoMeta(item.status);
        const comboMeta = parseComboDisplayMeta(item.descricao);
        const descricaoHtml = comboMeta.isComboItem
          ? `
              <div style="font-weight:700;">${escapeHtml(comboMeta.displayTitle)}</div>
              <div style="margin-top:4px;font-size:9px;color:#52525b;">
                <span style="display:inline-block;border:1px solid #ddd6fe;background:#f5f3ff;color:#6d28d9;border-radius:999px;padding:2px 6px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Combo</span>
                <span style="margin-left:6px;">${escapeHtml(comboMeta.comboName)}</span>
              </div>
            `
          : escapeHtml(item.descricao || "-");
        return `
          <tr>
            ${
              mostrarColunaPessoa
                ? `<td>${escapeHtml(item.profissionais?.nome || "Profissional")}</td>`
                : ""
            }
            <td>${descricaoHtml}</td>
            <td>${escapeHtml(formatDate(item.competencia_data))}</td>
            <td class="money">${escapeHtml(formatCurrency(item.valor_base))}</td>
            <td>${escapeHtml(formatPercent(item.percentual_aplicado))}</td>
            <td>${escapeHtml(origem.label)}</td>
            <td class="money">${escapeHtml(formatCurrency(getValorLancamento(item)))}</td>
            <td>${escapeHtml(statusInfo.label)}</td>
            <td>${escapeHtml(formatDateTime(item.pago_em))}</td>
          </tr>
        `;
      })
      .join("");
    const comboSummaryHtml =
      comboSummaryPrint.length > 0
        ? `
            <div class="combo-report">
              <div class="combo-title">Totais por combo</div>
              <div class="combo-grid">
                ${comboSummaryPrint
                  .map(
                    (combo) => `
                      <div class="combo-card">
                        <div class="combo-card-top">
                          <span class="combo-badge">Combo</span>
                          <span class="combo-total">${escapeHtml(
                            formatCurrency(combo.total)
                          )}</span>
                        </div>
                        <div class="combo-name">${escapeHtml(combo.comboName)}</div>
                        <div class="combo-meta">${escapeHtml(
                          `${combo.itemCount} item(ns) rateados`
                        )}</div>
                        <div class="combo-children">${escapeHtml(
                          combo.childLabels.join(", ")
                        )}</div>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            </div>
          `
        : "";

    const html = `
      <html>
        <head>
          <title>${escapeHtml(documentTitle)}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #18181b; background: #fff; }
            .page { padding: 10px 12px 18px; }
            .header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; border-bottom: 1px solid #111827; padding-bottom: 10px; }
            .eyebrow { font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: #71717a; font-weight: 700; }
            .title { font-size: 20px; font-weight: 700; margin: 4px 0; }
            .muted { color: #52525b; font-size: 10px; line-height: 1.45; }
            .period { text-align: right; }
            .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
            .kpi { border: 1px solid #e4e4e7; border-radius: 10px; padding: 8px 10px; background: #fafafa; }
            .kpi-label { font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color: #71717a; }
            .kpi-value { margin-top: 4px; font-size: 15px; font-weight: 700; }
            .report { margin-top: 14px; }
            .group-header { display: grid; grid-template-columns: 1fr 180px; gap: 10px; align-items: start; }
            .group-card { border: 1px solid #e4e4e7; border-radius: 10px; padding: 10px 12px; background: #fff; }
            .group-title { font-size: 16px; font-weight: 700; margin: 4px 0 6px; }
            .meta-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 6px 10px; }
            .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color: #71717a; }
            .meta-value { margin-top: 2px; font-size: 11px; font-weight: 600; color: #18181b; }
            .total-box { border: 1px solid #d4d4d8; border-radius: 10px; padding: 10px 12px; background: linear-gradient(180deg,#faf5ff 0%,#ffffff 100%); }
            .total-box .total { margin-top: 4px; font-size: 18px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: fixed; }
            th { text-align: left; font-size: 8.5px; text-transform: uppercase; letter-spacing: .08em; color: #71717a; background: #f4f4f5; padding: 7px 6px; border: 1px solid #e4e4e7; }
            td { padding: 6px 6px; border: 1px solid #e4e4e7; font-size: 10px; vertical-align: top; }
            .money { font-weight: 700; white-space: nowrap; }
            .combo-report { margin: 12px 0 2px; }
            .combo-title { font-size: 11px; font-weight: 700; margin-bottom: 8px; color: #18181b; }
            .combo-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
            .combo-card { border: 1px solid #e9d5ff; border-radius: 10px; background: linear-gradient(180deg,#faf5ff 0%,#ffffff 100%); padding: 8px 10px; }
            .combo-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
            .combo-badge { display: inline-flex; align-items: center; border: 1px solid #ddd6fe; background: #f5f3ff; color: #6d28d9; border-radius: 999px; padding: 2px 6px; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
            .combo-total { font-size: 11px; font-weight: 700; color: #18181b; }
            .combo-name { margin-top: 6px; font-size: 11px; font-weight: 700; color: #18181b; }
            .combo-meta { margin-top: 3px; font-size: 9px; color: #52525b; }
            .combo-children { margin-top: 4px; font-size: 9px; color: #71717a; line-height: 1.4; }
            .signature-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 20px; margin-top: 28px; padding-top: 10px; }
            .signature { padding-top: 18px; border-top: 1px solid #18181b; min-height: 58px; }
            .signature-name { font-size: 11px; font-weight: 700; }
            .signature-role { margin-top: 3px; font-size: 9px; color: #52525b; }
            .signature-doc { margin-top: 4px; font-size: 9px; color: #52525b; }
            .footer-note { margin-top: 10px; font-size: 9px; color: #71717a; }
            .col-pessoa { width: 15%; }
            .col-desc { width: 28%; }
            .col-competencia { width: 10%; }
            .col-base { width: 11%; }
            .col-percent { width: 9%; }
            .col-origem { width: 15%; }
            .col-comissao { width: 11%; }
            .col-status { width: 8%; }
            .col-pago { width: 12%; }
            @media print {
              .page { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div>
                <div class="eyebrow">Rateio financeiro</div>
                <div class="title">${
                  profissionalTitulo
                    ? `Rateio de ${escapeHtml(profissionalTitulo)}`
                    : "Relatorio de comissoes"
                }</div>
                <div class="muted">
                  Salao: <strong>${escapeHtml(salaoInfo?.nome || "Salao")}</strong><br />
                  Documento: <strong>${escapeHtml(formatDocument(salaoInfo?.cpf_cnpj))}</strong><br />
                  Responsavel: <strong>${escapeHtml(salaoInfo?.responsavel || "Nao informado")}</strong>
                  ${
                    profissionalTitulo
                      ? `<br />Profissional: <strong>${escapeHtml(
                          profissionalTitulo
                        )}</strong>`
                      : ""
                  }
                </div>
              </div>
              <div class="period">
                <div class="eyebrow">Periodo</div>
                <div class="title" style="font-size:16px;">${escapeHtml(
                  `${formatDate(dataInicial)} ate ${formatDate(dataFinal)}`
                )}</div>
                <div class="muted">Gerado em ${escapeHtml(formatDateTime(new Date().toISOString()))}</div>
              </div>
            </div>

            <div class="kpis">
              <div class="kpi">
                <div class="kpi-label">Total do rateio</div>
                <div class="kpi-value">${escapeHtml(formatCurrency(totalGeral))}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Lancamentos filtrados</div>
                <div class="kpi-value">${escapeHtml(String(rows.length))}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">${
                  profissionalTitulo ? "Tipo" : "Pessoas no rateio"
                }</div>
                <div class="kpi-value">${escapeHtml(
                  profissionalTitulo
                    ? profissionalTipo === "assistente"
                      ? "Assistente"
                      : "Profissional"
                    : String(
                        new Set(
                          rows.map(
                            (item) => item.id_profissional || item.profissionais?.nome || item.id
                          )
                        ).size
                      )
                )}</div>
              </div>
            </div>

            <section class="report">
              <div class="group-header">
                <div class="group-card">
                  <div class="eyebrow">${
                    profissionalTitulo ? "Dados do profissional" : "Resumo do filtro"
                  }</div>
                  <div class="group-title">${
                    profissionalTitulo
                      ? escapeHtml(profissionalTitulo)
                      : "Rateio consolidado"
                  }</div>
                  <div class="meta-grid">
                    <div>
                      <div class="meta-label">${
                        profissionalTitulo ? "Tipo" : "Status"
                      }</div>
                      <div class="meta-value">${escapeHtml(
                        profissionalTitulo
                          ? profissionalTipo === "assistente"
                            ? "Assistente"
                            : "Profissional"
                          : status === "todos"
                            ? "Todos"
                            : status
                      )}</div>
                    </div>
                    <div>
                      <div class="meta-label">${
                        profissionalTitulo ? "CPF" : "Tipo de destinatario"
                      }</div>
                      <div class="meta-value">${escapeHtml(
                        profissionalTitulo
                          ? formatDocument(profissionalCpf)
                          : tipoDestinatario === "todos"
                            ? "Todos"
                            : tipoDestinatario
                      )}</div>
                    </div>
                    <div>
                      <div class="meta-label">Lancamentos</div>
                      <div class="meta-value">${escapeHtml(String(rows.length))}</div>
                    </div>
                    <div>
                      <div class="meta-label">Periodo</div>
                      <div class="meta-value">${escapeHtml(
                        `${formatDate(dataInicial)} ate ${formatDate(dataFinal)}`
                      )}</div>
                    </div>
                  </div>
                </div>
                <div class="total-box">
                  <div class="eyebrow">${
                    profissionalTitulo ? "Total do profissional" : "Total filtrado"
                  }</div>
                  <div class="total">${escapeHtml(formatCurrency(totalGeral))}</div>
                  <div class="muted">Documento pronto para conferencia e assinatura.</div>
                </div>
              </div>

              ${comboSummaryHtml}

              <table>
                <thead>
                  <tr>
                    ${
                      mostrarColunaPessoa
                        ? '<th class="col-pessoa">Pessoa</th>'
                        : ""
                    }
                    <th class="col-desc">Descricao</th>
                    <th class="col-competencia">Competencia</th>
                    <th class="col-base">Base</th>
                    <th class="col-percent">% Aplicada</th>
                    <th class="col-origem">Origem</th>
                    <th class="col-comissao">Comissao</th>
                    <th class="col-status">Status</th>
                    <th class="col-pago">Pago em</th>
                  </tr>
                </thead>
                <tbody>${linhas}</tbody>
              </table>

              ${
                profissionalTitulo
                  ? `
                    <div class="signature-grid">
                      <div class="signature">
                        <div class="signature-name">${escapeHtml(salaoInfo?.nome || "Salao")}</div>
                        <div class="signature-role">Assinatura do salao</div>
                        <div class="signature-doc">Documento: ${escapeHtml(
                          formatDocument(salaoInfo?.cpf_cnpj)
                        )}</div>
                      </div>
                      <div class="signature">
                        <div class="signature-name">${escapeHtml(profissionalTitulo)}</div>
                        <div class="signature-role">Assinatura do ${
                          profissionalTipo === "assistente"
                            ? "assistente"
                            : "profissional"
                        }</div>
                        <div class="signature-doc">CPF: ${escapeHtml(
                          formatDocument(profissionalCpf)
                        )}</div>
                      </div>
                    </div>
                  `
                  : ""
              }
            </section>

            <div class="footer-note">
              Documento gerado para conferencia e assinatura do rateio de comissoes do periodo.
            </div>
          </div>
        </body>
      </html>
    `;

    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  if (loading || !acessoCarregado) {
    return (
      <AppLoading
        title="Carregando comissoes"
        message="Aguarde enquanto consolidamos lancamentos, filtros e rateios da equipe."
        fullHeight={false}
      />
    );
  }

  if (permissoes && !permissoes.comissoes_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Voce nao tem permissao para acessar Comissoes.
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmActionModal
        open={Boolean(confirmacaoComissao)}
        title={
          confirmacaoComissao?.acao === "cancelar"
            ? "Cancelar lancamento"
            : "Marcar comissoes como pagas"
        }
        description={
          confirmacaoComissao?.acao === "cancelar"
            ? "Este lancamento deixara de entrar no rateio ativo."
            : `${confirmacaoComissao?.ids.length || 0} lancamento(s) filtrado(s) serao marcados como pagos.`
        }
        confirmLabel={
          confirmacaoComissao?.acao === "cancelar"
            ? "Cancelar lancamento"
            : "Marcar como pago"
        }
        tone={confirmacaoComissao?.acao === "cancelar" ? "danger" : "default"}
        loading={saving}
        onClose={() => setConfirmacaoComissao(null)}
        onConfirm={() => {
          void confirmarAcao();
        }}
      />

      <div className="bg-white">
        <div className="mx-auto max-w-[1800px] space-y-5">
          <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 bg-white px-5 py-5 text-zinc-950">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Rateio e conferencia
                  </div>
                  <h1 className="mt-1 text-[2rem] font-bold tracking-[-0.04em]">
                    Comissoes
                  </h1>
                  <p className="mt-2 text-sm text-zinc-500">
                    Total do periodo, pendencias e regra de origem em uma leitura
                    menos cansativa.
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Lancamentos filtrados
                  </div>
                  <div className="mt-1 text-2xl font-bold">{rows.length}</div>
                </div>
              </div>
            </div>
            <div className="grid gap-3 px-4 py-4 md:grid-cols-2 xl:grid-cols-7">
              <ResumoCard
                title="Total"
                value={formatCurrency(resumo.total)}
                icon={<BadgeDollarSign size={16} />}
                tone="zinc"
              />
              <ResumoCard
                title="Profissionais"
                value={formatCurrency(resumoPorTipo.profissional)}
                icon={<User2 size={16} />}
                tone="sky"
              />
              <ResumoCard
                title="Assistentes"
                value={formatCurrency(resumoPorTipo.assistente)}
                icon={<Layers3 size={16} />}
                tone="emerald"
              />
              <ResumoCard
                title="Pendente"
                value={formatCurrency(resumo.pendente)}
                icon={<CalendarDays size={16} />}
                tone="amber"
              />
              <ResumoCard
                title="Pago"
                value={formatCurrency(resumo.pago)}
                icon={<CheckCircle2 size={16} />}
                tone="emerald"
              />
              {comissoesAvancadas ? (
                <>
                  <ResumoCard
                    title="Ticket medio"
                    value={formatCurrency(ticketMedio)}
                    icon={<WalletCards size={16} />}
                    tone="sky"
                  />
                  <ResumoCard
                    title="Maior lancamento"
                    value={formatCurrency(
                      maiorLancamento ? getValorLancamento(maiorLancamento) : 0
                    )}
                    icon={<Sparkles size={16} />}
                    tone="violet"
                  />
                </>
              ) : (
                <div className="xl:col-span-2 rounded-[22px] border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                  Ticket medio, maior lancamento, leitura por combo e auditoria de
                  origem entram nas comissoes avancadas.
                </div>
              )}
            </div>
          </div>

          {comissoesAvancadas && comboSummary.length > 0 ? (
            <div className="rounded-[28px] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
                    Leitura por combo
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-zinc-950">
                    Total agrupado dos combos no rateio
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500">
                    Cada card soma os lancamentos que vieram dos servicos filhos do combo.
                  </p>
                </div>
                <div className="rounded-2xl border border-violet-200 bg-white px-4 py-3 text-right shadow-sm">
                  <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                    Combos encontrados
                  </div>
                  <div className="mt-1 text-2xl font-bold text-zinc-950">
                    {comboSummary.length}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {comboSummary.map((combo) => (
                  <div
                    key={combo.comboName}
                    className="rounded-[24px] border border-violet-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700">
                        Combo
                      </span>
                      <span className="text-sm font-semibold text-zinc-900">
                        {formatCurrency(combo.total)}
                      </span>
                    </div>
                    <div className="mt-3 text-base font-bold text-zinc-950">
                      {combo.comboName}
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      {combo.itemCount} lancamento(s) do rateio
                    </div>
                    <div className="mt-3 text-xs leading-5 text-zinc-500">
                      {combo.childLabels.join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {erro ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {erro}
            </div>
          ) : null}
          {msg ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {msg}
            </div>
          ) : null}

          <div className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.25fr_170px_170px_220px_170px_170px_150px]">
              <Field label="Buscar">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Profissional, descricao ou origem"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-11 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
                  />
                </div>
              </Field>
              <Field label="Status">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
                >
                  <option value="todos">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </Field>
              <Field label="Tipo">
                <select
                  value={tipoDestinatario}
                  onChange={(e) => setTipoDestinatario(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
                >
                  <option value="todos">Todos</option>
                  <option value="profissional">Profissional</option>
                  <option value="assistente">Assistente</option>
                </select>
              </Field>
              <Field label="Profissional">
                <select
                  value={profissionalId}
                  onChange={(e) => setProfissionalId(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
                >
                  <option value="">Todos</option>
                  {profissionais.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Data inicial">
                <input
                  type="date"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
                />
              </Field>
              <Field label="Data final">
                <input
                  type="date"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
                />
              </Field>
              <Field label="Aplicar">
                <button
                  onClick={() => void carregarComissoes()}
                  className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Atualizar
                </button>
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {comissoesAvancadas ? (
                <>
                  <button
                    onClick={apurarRateio}
                    className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                  >
                    Apurar rateio
                  </button>
                  <button
                    onClick={imprimirRateio}
                    className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                  >
                    <Printer size={16} />
                    Imprimir rateio
                  </button>
                </>
              ) : null}
              {podeGerenciar ? (
                <button
                  onClick={marcarFiltradasComoPagas}
                  disabled={saving || totalPendentesCount === 0}
                  className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
                >
                  Marcar filtradas como pagas
                </button>
              ) : null}
            </div>
          </div>

          {comissoesAvancadas ? (
          <div className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Visao por pessoa
                </div>
                <div className="mt-1 text-xl font-bold text-zinc-950">
                  Profissionais e assistentes no rateio
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                <Layers3 size={16} />
                {resumoProfissionais.length} pessoa(s)
              </div>
            </div>
            {resumoProfissionais.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
                Nenhum profissional entrou no periodo filtrado.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {resumoProfissionais.slice(0, 4).map((item) => {
                  const statusPredominante = getStatusComissaoMeta(
                    item.statusPredominante
                  );
                  return (
                    <div
                      key={item.id}
                      className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-bold text-zinc-700 ring-1 ring-zinc-200">
                            {getInitials(item.nome)}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900">
                              {item.nome}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {item.quantidade} lancamento(s)
                            </div>
                          </div>
                        </div>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusPredominante.badgeClass}`}
                        >
                          {statusPredominante.label}
                        </span>
                      </div>
                      <div className="mt-4 text-2xl font-bold text-zinc-950">
                        {formatCurrency(item.total)}
                      </div>
                      <div className="mt-3 text-sm text-zinc-500">
                        Pendente: {formatCurrency(item.pendente)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          ) : null}

          <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Leitura analitica
              </div>
              <div className="mt-1 text-xl font-bold text-zinc-950">
                Lancamentos detalhados
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1450px] w-full">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-[0.14em] text-zinc-500">
                    <th className="px-5 py-4">Pessoa</th>
                    <th className="px-5 py-4">Descricao</th>
                    <th className="px-5 py-4">Competencia</th>
                    <th className="px-5 py-4">Base</th>
                    <th className="px-5 py-4">% Aplicada</th>
                    {comissoesAvancadas ? (
                      <th className="px-5 py-4">Origem</th>
                    ) : null}
                    <th className="px-5 py-4">Comissao</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Pago em</th>
                    <th className="px-5 py-4 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                      colSpan={comissoesAvancadas ? 10 : 9}
                        className="px-5 py-10 text-center text-sm text-zinc-500"
                      >
                        Nenhuma comissao encontrada com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    rows.map((item) => {
                      const nome = item.profissionais?.nome || "Profissional";
                      const origem = origemMeta(item.origem_percentual);
                      const statusInfo = getStatusComissaoMeta(item.status);
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-zinc-100 align-top"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-700">
                                {getInitials(nome) || <User2 size={16} />}
                              </div>
                              <div>
                                <div className="font-semibold text-zinc-900">
                                  {nome}
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {getTipoDestinatario(item) === "assistente"
                                    ? "Assistente"
                                    : "Profissional"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <ComboDescriptionBlock
                              descricao={item.descricao}
                              observacoes={item.observacoes}
                            />
                          </td>
                          <td className="px-5 py-4 text-sm text-zinc-700">
                            {formatDate(item.competencia_data)}
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-zinc-800">
                            {formatCurrency(item.valor_base)}
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-zinc-800">
                            {formatPercent(item.percentual_aplicado)}
                          </td>
                          {comissoesAvancadas ? (
                            <td className="px-5 py-4">
                              <div
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${origem.badgeClass}`}
                              >
                                {origem.label}
                              </div>
                              <div className="mt-2 text-xs text-zinc-500">
                                {origem.description}
                              </div>
                            </td>
                          ) : null}
                          <td className="px-5 py-4">
                            <div className="text-sm font-bold text-zinc-900">
                              {formatCurrency(getValorLancamento(item))}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              Base {formatCurrency(item.valor_base)}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusInfo.badgeClass}`}
                            >
                              {statusInfo.label}
                            </span>
                            <div className="mt-2 text-xs text-zinc-500">
                              {statusInfo.description}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-zinc-700">
                            {formatDateTime(item.pago_em)}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              {podeGerenciar ? (
                                <>
                                  {normalizeStatusComissao(item.status) ===
                                  "pendente" ? (
                                    <button
                                      onClick={() => void marcarComoPago(item.id)}
                                      disabled={saving}
                                      className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
                                    >
                                      Marcar pago
                                    </button>
                                  ) : null}
                                  {normalizeStatusComissao(item.status) !==
                                  "cancelado" ? (
                                    <button
                                      onClick={() =>
                                        setConfirmacaoComissao({
                                          acao: "cancelar",
                                          ids: [item.id],
                                        })
                                      }
                                      disabled={saving}
                                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                    >
                                      Cancelar
                                    </button>
                                  ) : null}
                                </>
                              ) : (
                                <span className="text-xs font-medium text-zinc-400">
                                  Somente leitura
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ResumoCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone: "amber" | "emerald" | "sky" | "violet" | "zinc";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "sky"
          ? "border-sky-200 bg-sky-50 text-sky-900"
          : tone === "violet"
            ? "border-violet-200 bg-violet-50 text-violet-900"
            : "border-zinc-200 bg-zinc-50 text-zinc-900";

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{title}</div>
        <div>{icon}</div>
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-zinc-700">
        {label}
      </label>
      {children}
    </div>
  );
}
