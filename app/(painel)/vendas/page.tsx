"use client";

import { useEffect, useMemo, useState } from "react";
import AppLoading from "@/components/ui/AppLoading";
import { usePainelSession } from "@/components/layout/PainelSessionProvider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Eye,
  FileText,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  X,
  BadgeDollarSign,
  Users,
  CreditCard,
} from "lucide-react";
import type {
  ComandaVenda,
  ItemVenda,
  Pagamento,
  SalaoInfo,
  VendaBuscaRow,
  VendaDetalhe,
} from "@/components/vendas/types";
import {
  formatCurrency,
  formatDateInput,
  formatDateTime,
  getJoinedName,
  getStatusBadgeClass,
} from "@/components/vendas/utils";
import { KpiCard, ResumoRow } from "@/components/vendas/ui";
import { groupComboTotals, parseComboDisplayMeta } from "@/lib/combo/display";
import { getLocalDayRangeIso } from "@/lib/date/local-day-range";
import { monitorClientOperation } from "@/lib/monitoring/client";
import type {
  VendaProcessarBody,
  VendaProcessarErrorResponse,
  VendaProcessarResponse,
} from "@/types/vendas";

const VENDAS_PAGE_SIZE = 80;

function escapeHtml(value: string | null | undefined) {
  return String(value || "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export default function VendasPage() {
  const supabase = createClient();
  const router = useRouter();
  const { snapshot: painelSession } = usePainelSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erroTela, setErroTela] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");

  const [permissoes, setPermissoes] = useState<Record<string, boolean> | null>(null);
  const [acessoCarregado, setAcessoCarregado] = useState(false);

  const [salaoInfo, setSalaoInfo] = useState<SalaoInfo | null>(null);
  const [vendas, setVendas] = useState<ComandaVenda[]>([]);
  const [vendasBusca, setVendasBusca] = useState<VendaBuscaRow[]>([]);
  const [clientesFiltro, setClientesFiltro] = useState<{ id: string; nome: string }[]>([]);
  const [vendasPage, setVendasPage] = useState(0);
  const [vendasHasMore, setVendasHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"fechada" | "cancelada" | "todos">("fechada");
  const [dataInicio, setDataInicio] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return formatDateInput(date);
  });
  const [dataFim, setDataFim] = useState(() => formatDateInput(new Date()));
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [profissionalFiltro, setProfissionalFiltro] = useState("");
  const [formaPagamentoFiltro, setFormaPagamentoFiltro] = useState("");
  const [itemFiltro, setItemFiltro] = useState("");
  const [valorMinimo, setValorMinimo] = useState("");
  const [valorMaximo, setValorMaximo] = useState("");

  const [detalheOpen, setDetalheOpen] = useState(false);
  const [detalheVenda, setDetalheVenda] = useState<VendaDetalhe | null>(null);
  const [vendaSelecionada, setVendaSelecionada] = useState<ComandaVenda | null>(null);

  const [reabrirModalOpen, setReabrirModalOpen] = useState(false);
  const [motivoReabertura, setMotivoReabertura] = useState("");

  const [excluirModalOpen, setExcluirModalOpen] = useState(false);
  const [motivoExclusao, setMotivoExclusao] = useState("");

  const comboSummaryDetalhe = useMemo(
    () =>
      detalheVenda
        ? groupComboTotals(
            detalheVenda.itens,
            (item) => item.descricao,
            (item) => Number(item.valor_total || 0)
          )
        : [],
    [detalheVenda]
  );
  const podeReabrirVenda = Boolean(permissoes?.vendas_reabrir);
  const podeExcluirVenda = Boolean(permissoes?.vendas_excluir);

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (idSalao && acessoCarregado && permissoes?.vendas_ver) {
      void carregarVendas(idSalao, 0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSalao, dataInicio, dataFim, statusFiltro, acessoCarregado, permissoes]);

  async function init() {
    try {
      setLoading(true);
      setErroTela("");
      setMsg("");

      if (!painelSession?.idSalao || !painelSession?.permissoes) {
        router.push("/login");
        return;
      }
      const permissoesFinal = painelSession.permissoes;

      setPermissoes(permissoesFinal);
      setAcessoCarregado(true);
      setIdSalao(painelSession.idSalao);

      if (!permissoesFinal?.vendas_ver) {
        setErroTela("Você não tem permissão para acessar a página de vendas.");
        setLoading(false);
        return;
      }

      const { data: salaoData, error: salaoError } = await supabase
        .from("saloes")
        .select("id, nome, cpf_cnpj, telefone, endereco")
        .eq("id", painelSession.idSalao)
        .maybeSingle();

      if (salaoError) {
        console.error(salaoError);
      } else {
        setSalaoInfo((salaoData as SalaoInfo) || null);
      }

      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("id_salao", painelSession.idSalao)
        .order("nome", { ascending: true });

      if (clientesError) {
        console.error(clientesError);
      } else {
        setClientesFiltro((clientesData as { id: string; nome: string }[]) || []);
      }

      await carregarVendas(painelSession.idSalao);
    } catch (error: unknown) {
      console.error(error);
      setErroTela(
        error instanceof Error ? error.message : "Erro ao carregar vendas."
      );
    } finally {
      setLoading(false);
    }
  }

  async function carregarVendas(
    salaoIdParam?: string,
    page = 0,
    append = false
  ) {
    const salaoId = salaoIdParam || idSalao;
    if (!salaoId) return;
    const dataInicioRange = getLocalDayRangeIso(dataInicio);
    const dataFimRange = getLocalDayRangeIso(dataFim);
    const from = page * VENDAS_PAGE_SIZE;
    const to = from + VENDAS_PAGE_SIZE - 1;

    setErroTela("");

    let queryComandas = supabase
      .from("comandas")
      .select(`
        id,
        numero,
        status,
        subtotal,
        desconto,
        acrescimo,
        total,
        aberta_em,
        fechada_em,
        cancelada_em,
        id_cliente,
        clientes (
          nome
        )
      `)
      .eq("id_salao", salaoId)
      .order("fechada_em", { ascending: false })
      .range(from, to);

    let queryBusca = supabase
      .from("vw_vendas_busca")
      .select("aberta_em, acrescimo, cancelada_em, cliente_nome, desconto, fechada_em, formas_pagamento, id, id_cliente, id_salao, itens_descricoes, numero, profissionais_nomes, status, subtotal, total")
      .eq("id_salao", salaoId)
      .range(from, to);

    if (statusFiltro !== "todos") {
      queryComandas = queryComandas.eq("status", statusFiltro);
      queryBusca = queryBusca.eq("status", statusFiltro);
    } else {
      queryComandas = queryComandas.in("status", ["fechada", "cancelada"]);
      queryBusca = queryBusca.in("status", ["fechada", "cancelada"]);
    }

    if (statusFiltro === "fechada") {
      queryComandas = queryComandas
        .gte("fechada_em", dataInicioRange.startIso)
        .lte("fechada_em", dataFimRange.endIso);

      queryBusca = queryBusca
        .gte("fechada_em", dataInicioRange.startIso)
        .lte("fechada_em", dataFimRange.endIso);
    }

    if (statusFiltro === "cancelada") {
      queryComandas = queryComandas
        .gte("cancelada_em", dataInicioRange.startIso)
        .lte("cancelada_em", dataFimRange.endIso);

      queryBusca = queryBusca
        .gte("cancelada_em", dataInicioRange.startIso)
        .lte("cancelada_em", dataFimRange.endIso);
    }

    if (statusFiltro === "todos") {
      queryComandas = queryComandas.or(
        `and(status.eq.fechada,fechada_em.gte.${dataInicioRange.startIso},fechada_em.lte.${dataFimRange.endIso}),and(status.eq.cancelada,cancelada_em.gte.${dataInicioRange.startIso},cancelada_em.lte.${dataFimRange.endIso})`
      );

      queryBusca = queryBusca.or(
        `and(status.eq.fechada,fechada_em.gte.${dataInicioRange.startIso},fechada_em.lte.${dataFimRange.endIso}),and(status.eq.cancelada,cancelada_em.gte.${dataInicioRange.startIso},cancelada_em.lte.${dataFimRange.endIso})`
      );
    }

    const [
      { data: comandasData, error: comandasError },
      { data: buscaData, error: buscaError },
    ] = await monitorClientOperation(
      {
        module: "vendas",
        action: "carregar_vendas",
        screen: "vendas",
        details: {
          idSalao: salaoId,
          statusFiltro,
          dataInicio,
          dataFim,
        },
        successMessage: "Vendas carregadas com sucesso.",
        errorMessage: "Falha ao carregar vendas.",
      },
      () => Promise.all([queryComandas, queryBusca])
    );

    if (comandasError) {
      console.error(comandasError);
      setErroTela("Erro ao carregar vendas.");
      return;
    }

    if (buscaError) {
      console.error(buscaError);
      setErroTela("Erro ao carregar busca avançada das vendas.");
      return;
    }

    const novasVendas = (comandasData as ComandaVenda[]) || [];
    const novasVendasBusca = (buscaData as VendaBuscaRow[]) || [];

    setVendas((prev) => (append ? [...prev, ...novasVendas] : novasVendas));
    setVendasBusca((prev) =>
      append ? [...prev, ...novasVendasBusca] : novasVendasBusca
    );
    setVendasPage(page);
    setVendasHasMore(
      novasVendas.length === VENDAS_PAGE_SIZE &&
        novasVendasBusca.length === VENDAS_PAGE_SIZE
    );
  }

  async function carregarMaisVendas() {
    if (!idSalao || loadingMore || !vendasHasMore) return;

    try {
      setLoadingMore(true);
      await carregarVendas(idSalao, vendasPage + 1, true);
    } catch (error: unknown) {
      console.error(error);
      setErroTela(
        error instanceof Error ? error.message : "Erro ao carregar mais vendas."
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function processarVenda(params: {
    acao: "detalhes" | "reabrir" | "excluir";
    idComanda: string;
    motivo?: string | null;
  }) {
    const requestBody: VendaProcessarBody = {
      idSalao,
      acao: params.acao,
      idComanda: params.idComanda,
      motivo: params.motivo || null,
    };

    const response = await monitorClientOperation(
      {
        module: "vendas",
        action: params.acao,
        route: "/api/vendas/processar",
        screen: "vendas",
        entity: "comanda",
        entityId: params.idComanda,
        details: {
          idSalao,
        },
        successMessage: `Acao de venda concluida: ${params.acao}.`,
        errorMessage: `Falha ao executar acao de venda: ${params.acao}.`,
      },
      () =>
        fetch("/api/vendas/processar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })
    );

    const result = (await response.json().catch(() => ({}))) as Partial<
      VendaProcessarResponse<Partial<VendaDetalhe>>
    > &
      VendaProcessarErrorResponse;

    if (!response.ok) {
      throw new Error(result.error || "Erro ao processar venda.");
    }

    return result as VendaProcessarResponse<Partial<VendaDetalhe>>;
  }

  async function abrirDetalhes(venda: ComandaVenda) {
    try {
      setSaving(true);
      setErroTela("");
      setVendaSelecionada(venda);

      const data = await processarVenda({
        acao: "detalhes",
        idComanda: venda.id,
      });

      setDetalheVenda({
        comanda: (data.detalhe?.comanda as ComandaVenda) || venda,
        itens: (data.detalhe?.itens as ItemVenda[]) || [],
        pagamentos: (data.detalhe?.pagamentos as Pagamento[]) || [],
        agendamentos: (data.detalhe?.agendamentos as unknown[]) || [],
        comissoes: (data.detalhe?.comissoes as unknown[]) || [],
      });

      setDetalheOpen(true);
    } catch (error: unknown) {
      console.error(error);
      setErroTela(
        error instanceof Error ? error.message : "Erro ao abrir detalhes."
      );
    } finally {
      setSaving(false);
    }
  }

  function abrirModalReabrir(venda: ComandaVenda) {
    setVendaSelecionada(venda);
    setMotivoReabertura("");
    setReabrirModalOpen(true);
  }

  function abrirModalExcluir(venda: ComandaVenda) {
    setVendaSelecionada(venda);
    setMotivoExclusao("");
    setExcluirModalOpen(true);
  }

  async function confirmarReabrirVenda() {
    if (!vendaSelecionada) return;

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const result = await processarVenda({
        acao: "reabrir",
        idComanda: vendaSelecionada.id,
        motivo: motivoReabertura || null,
      });

      const avisoEstoque = result.warning || "";

      setReabrirModalOpen(false);
      setMotivoReabertura("");
      setMsg(
        avisoEstoque
          ? `Venda #${vendaSelecionada.numero} reaberta, mas ${avisoEstoque}`
          : `Venda #${vendaSelecionada.numero} enviada para o caixa.`
      );
      await carregarVendas();

      if (!avisoEstoque) {
        if (typeof window === "undefined") {
          router.push(`/caixa?comanda_id=${vendaSelecionada.id}`);
        } else {
          window.open(
            `/caixa?comanda_id=${vendaSelecionada.id}`,
            "_blank",
            "noopener,noreferrer"
          );
        }
      }
    } catch (error: unknown) {
      console.error(error);
      setErroTela(
        error instanceof Error ? error.message : "Erro ao reabrir venda."
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmarExcluirVenda() {
    if (!vendaSelecionada) return;

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const result = await processarVenda({
        acao: "excluir",
        idComanda: vendaSelecionada.id,
        motivo: motivoExclusao || null,
      });

      const avisoEstoque = result.warning || "";

      if (avisoEstoque) {
        setExcluirModalOpen(false);
        setMotivoExclusao("");
        setDetalheOpen(false);
        setDetalheVenda(null);
        throw new Error(`Venda excluida, mas ${avisoEstoque}`);
      }

      setExcluirModalOpen(false);
      setMotivoExclusao("");
      setDetalheOpen(false);
      setDetalheVenda(null);
      setMsg(`Venda #${vendaSelecionada.numero} excluída com sucesso.`);
      await carregarVendas();
    } catch (error: unknown) {
      console.error(error);
      setErroTela(
        error instanceof Error ? error.message : "Erro ao excluir venda."
      );
    } finally {
      setSaving(false);
    }
  }

  function imprimirCupom(
    venda: ComandaVenda,
    detalhe?: VendaDetalhe | null,
    salao?: SalaoInfo | null
  ) {
    const itens = detalhe?.itens || [];
    const pagamentos = detalhe?.pagamentos || [];
    const clienteNome = getJoinedName(venda.clientes, "Sem cliente");
    const comboSummary = groupComboTotals(
      itens,
      (item) => item.descricao,
      (item) => Number(item.valor_total || 0)
    );

    const totalPago = pagamentos.reduce(
      (acc, item) => acc + Number(item.valor || 0),
      0
    );

    const troco = Math.max(totalPago - Number(venda.total || 0), 0);

    const html = `
      <html>
        <head>
          <title>Cupom - Venda #${venda.numero}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; padding: 18px; color: #111; background: #fff; }
            .cupom { width: 100%; max-width: 420px; margin: 0 auto; }
            .center { text-align: center; }
            .salao { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
            .muted { color: #666; font-size: 12px; line-height: 1.45; }
            .line { border-top: 1px dashed #999; margin: 14px 0; }
            .section-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .08em; }
            .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin: 5px 0; font-size: 13px; }
            .row strong { font-weight: 700; }
            .item { padding: 8px 0; border-bottom: 1px dashed #ddd; }
            .item:last-child { border-bottom: 0; }
            .item-title { font-size: 13px; font-weight: 700; margin-bottom: 3px; }
            .item-sub { font-size: 12px; color: #666; }
            .total-box { margin-top: 10px; border: 1px solid #111; padding: 10px 12px; }
            .total-label { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
            .total-value { font-size: 24px; font-weight: 700; margin-top: 4px; }
            .footer { margin-top: 18px; text-align: center; font-size: 12px; color: #666; line-height: 1.6; }
            @media print { body { padding: 0; } .cupom { max-width: none; width: 100%; } }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="cupom">
            <div class="center">
              <div class="salao">${salao?.nome || "Salao Premium"}</div>
              ${salao?.cpf_cnpj ? `<div class="muted">CNPJ: ${salao.cpf_cnpj}</div>` : ""}
              ${salao?.telefone ? `<div class="muted">Telefone: ${salao.telefone}</div>` : ""}
              ${salao?.endereco ? `<div class="muted">${salao.endereco}</div>` : ""}
            </div>

            <div class="line"></div>

            <div class="section-title">Dados da venda</div>

            <div class="row"><span>Comanda</span><strong>#${venda.numero}</strong></div>
            <div class="row"><span>Status</span><strong>${venda.status}</strong></div>
            <div class="row"><span>Data</span><strong>${formatDateTime(venda.fechada_em || venda.cancelada_em)}</strong></div>
            <div class="row"><span>Cliente</span><strong>${clienteNome}</strong></div>

            <div class="line"></div>

            <div class="section-title">Itens</div>

            <div>
              ${
                itens.length > 0
                  ? itens
                      .map(
                        (item) => {
                          const comboMeta = parseComboDisplayMeta(item.descricao);
                          const itemTitle = comboMeta.isComboItem
                            ? `
                                <div class="item-title">${escapeHtml(
                                  comboMeta.displayTitle
                                )}</div>
                                <div class="item-sub" style="margin-bottom:4px;">
                                  <span style="display:inline-block;border:1px solid #ddd6fe;background:#f5f3ff;color:#6d28d9;border-radius:999px;padding:1px 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Combo</span>
                                  <span style="margin-left:6px;">${escapeHtml(
                                    comboMeta.comboName
                                  )}</span>
                                </div>
                              `
                            : `<div class="item-title">${escapeHtml(
                                item.descricao
                              )}</div>`;

                          return `
                          <div class="item">
                            ${itemTitle}
                            <div class="row">
                              <span class="item-sub">${item.quantidade} x ${formatCurrency(item.valor_unitario)}</span>
                              <strong>${formatCurrency(item.valor_total)}</strong>
                            </div>
                          </div>
                        `;
                        }
                      )
                      .join("")
                  : `<div class="muted">Nenhum item encontrado.</div>`
              }
            </div>

            ${
              comboSummary.length > 0
                ? `
                    <div class="line"></div>
                    <div class="section-title">Totais por combo</div>
                    <div>
                      ${comboSummary
                        .map(
                          (combo) => `
                            <div class="item" style="padding:10px 0;">
                              <div class="row" style="margin:0;">
                                <div>
                                  <div class="item-title">${escapeHtml(
                                    combo.comboName
                                  )}</div>
                                  <div class="item-sub">${escapeHtml(
                                    `${combo.itemCount} item(ns) rateados`
                                  )}</div>
                                  <div class="item-sub" style="margin-top:3px;">${escapeHtml(
                                    combo.childLabels.join(", ")
                                  )}</div>
                                </div>
                                <strong>${formatCurrency(combo.total)}</strong>
                              </div>
                            </div>
                          `
                        )
                        .join("")}
                    </div>
                  `
                : ""
            }

            <div class="line"></div>

            <div class="section-title">Resumo</div>

            <div class="row"><span>Subtotal</span><strong>${formatCurrency(venda.subtotal)}</strong></div>
            <div class="row"><span>Desconto</span><strong>${formatCurrency(venda.desconto)}</strong></div>
            <div class="row"><span>Acréscimo</span><strong>${formatCurrency(venda.acrescimo)}</strong></div>

            <div class="total-box">
              <div class="total-label">Total da venda</div>
              <div class="total-value">${formatCurrency(venda.total)}</div>
            </div>

            <div class="line"></div>

            <div class="section-title">Pagamentos</div>

            <div>
              ${
                pagamentos.length > 0
                  ? pagamentos
                      .map(
                        (pagamento) => `
                          <div class="row">
                            <span>
                              ${pagamento.forma_pagamento}
                              ${pagamento.parcelas && pagamento.parcelas > 1 ? ` (${pagamento.parcelas}x)` : ""}
                            </span>
                            <strong>${formatCurrency(pagamento.valor)}</strong>
                          </div>
                        `
                      )
                      .join("")
                  : `<div class="muted">Nenhum pagamento encontrado.</div>`
              }
            </div>

            ${
              troco > 0
                ? `<div class="row" style="margin-top:10px;"><span>Troco</span><strong>${formatCurrency(troco)}</strong></div>`
                : ""
            }

            <div class="line"></div>

            <div class="footer">
              <div>Comprovante não fiscal</div>
              <div>Obrigado pela preferência.</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=520,height=760");
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  async function imprimirCupomCompleto(venda: ComandaVenda) {
    try {
      setSaving(true);
      setErroTela("");

      const data = await processarVenda({
        acao: "detalhes",
        idComanda: venda.id,
      });

      /* Legacy error block removed after routing detalhes through /api/vendas/processar.
      if (error.message === "__never__") {

        throw new Error(error.message || "Erro ao carregar dados para impressão.");
      }

      */
      const detalhe: VendaDetalhe = {
        comanda: (data.detalhe?.comanda as ComandaVenda) || venda,
        itens: (data.detalhe?.itens as ItemVenda[]) || [],
        pagamentos: (data.detalhe?.pagamentos as Pagamento[]) || [],
        agendamentos: (data.detalhe?.agendamentos as unknown[]) || [],
        comissoes: (data.detalhe?.comissoes as unknown[]) || [],
      };

      imprimirCupom(venda, detalhe, salaoInfo);
    } catch (error: unknown) {
      console.error(error);
      setErroTela(
        error instanceof Error ? error.message : "Erro ao imprimir cupom."
      );
    } finally {
      setSaving(false);
    }
  }

  const formasPagamentoDisponiveis = useMemo(() => {
    const values = new Set<string>();
    vendasBusca.forEach((item) => {
      (item.formas_pagamento || "")
        .split("|")
        .map((v) => v.trim())
        .filter(Boolean)
        .forEach((v) => values.add(v));
    });
    return Array.from(values).sort();
  }, [vendasBusca]);

  const profissionaisDisponiveis = useMemo(() => {
    const values = new Set<string>();
    vendasBusca.forEach((item) => {
      (item.profissionais_nomes || "")
        .split("|")
        .map((v) => v.trim())
        .filter(Boolean)
        .forEach((v) => values.add(v));
    });
    return Array.from(values).sort();
  }, [vendasBusca]);

  const vendasFiltradas = useMemo(() => {
    const term = busca.trim().toLowerCase();
    const itemTerm = itemFiltro.trim().toLowerCase();
    const profissionalTerm = profissionalFiltro.trim().toLowerCase();
    const formaTerm = formaPagamentoFiltro.trim().toLowerCase();

    const min = valorMinimo ? Number(valorMinimo.replace(",", ".")) : null;
    const max = valorMaximo ? Number(valorMaximo.replace(",", ".")) : null;

    const idsPermitidos = vendasBusca
      .filter((row) => {
        const clienteNome = String(row.cliente_nome || "").toLowerCase();
        const profissionais = String(row.profissionais_nomes || "").toLowerCase();
        const itens = String(row.itens_descricoes || "").toLowerCase();
        const formas = String(row.formas_pagamento || "").toLowerCase();
        const numero = String(row.numero);
        const total = Number(row.total || 0);

        const matchBusca =
          !term ||
          numero.includes(term) ||
          clienteNome.includes(term) ||
          profissionais.includes(term) ||
          itens.includes(term) ||
          formas.includes(term);

        const matchCliente = !clienteFiltro || row.id_cliente === clienteFiltro;
        const matchProfissional = !profissionalTerm || profissionais.includes(profissionalTerm);
        const matchForma = !formaTerm || formas.includes(formaTerm);
        const matchItem = !itemTerm || itens.includes(itemTerm);
        const matchMin = min === null || total >= min;
        const matchMax = max === null || total <= max;

        return (
          matchBusca &&
          matchCliente &&
          matchProfissional &&
          matchForma &&
          matchItem &&
          matchMin &&
          matchMax
        );
      })
      .map((row) => row.id);

    return vendas.filter((item) => idsPermitidos.includes(item.id));
  }, [
    vendas,
    vendasBusca,
    busca,
    clienteFiltro,
    profissionalFiltro,
    formaPagamentoFiltro,
    itemFiltro,
    valorMinimo,
    valorMaximo,
  ]);

  const totalVendasPeriodo = useMemo(
    () => vendasFiltradas.reduce((acc, item) => acc + Number(item.total || 0), 0),
    [vendasFiltradas]
  );

  const ticketMedio = useMemo(
    () => (vendasFiltradas.length ? totalVendasPeriodo / vendasFiltradas.length : 0),
    [vendasFiltradas, totalVendasPeriodo]
  );

  const totalClientesPeriodo = useMemo(() => {
    const ids = new Set(vendasFiltradas.map((item) => item.id_cliente).filter(Boolean));
    return ids.size;
  }, [vendasFiltradas]);

  if (loading || !acessoCarregado) {
    return (
      <AppLoading
        title="Carregando vendas"
        message="Aguarde enquanto reunimos histórico, filtros, detalhes e totais das comandas fechadas."
        fullHeight={false}
      />
    );
  }

  if (!permissoes?.vendas_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Você não tem permissão para acessar esta página.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white">
        <div className="mx-auto max-w-[1700px] space-y-4">
          <div className="rounded-[24px] border border-zinc-200 bg-white p-4 text-zinc-950 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="mt-1 text-[1.8rem] font-bold">Vendas</h1>
                <p className="mt-2 text-sm text-zinc-500">
                  Histórico de comandas fechadas, busca avançada, reabertura para o caixa, exclusão e impressão de cupom.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-right">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Resultados
                </div>
                <div className="mt-1 text-xl font-bold">{vendasFiltradas.length}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
            <KpiCard
              icon={<BadgeDollarSign size={18} />}
              label="Total vendido"
              value={formatCurrency(totalVendasPeriodo)}
            />
            <KpiCard
              icon={<Receipt size={18} />}
              label="Vendas"
              value={String(vendasFiltradas.length)}
            />
            <KpiCard
              icon={<Users size={18} />}
              label="Clientes"
              value={String(totalClientesPeriodo)}
            />
            <KpiCard
              icon={<CreditCard size={18} />}
              label="Ticket médio"
              value={formatCurrency(ticketMedio)}
            />
          </div>

          {erroTela ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {erroTela}
            </div>
          ) : null}

          {msg ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {msg}
            </div>
          ) : null}

          <div className="rounded-[24px] border border-zinc-200 bg-white p-3.5 shadow-sm">
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-5">
              <div className="xl:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  Busca avançada
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5">
                  <Search size={16} className="text-zinc-500" />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Número, cliente, profissional, item ou pagamento"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  Status
                </label>
                <select
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value as "fechada" | "cancelada" | "todos")}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
                >
                  <option value="fechada">Fechadas</option>
                  <option value="cancelada">Canceladas</option>
                  <option value="todos">Todos</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  Data inicial
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
                  />
                  <CalendarDays className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  Data final
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
                  />
                  <CalendarDays className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                </div>
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  Cliente
                </label>
                <select
                  value={clienteFiltro}
                  onChange={(e) => setClienteFiltro(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
                >
                  <option value="">Todos</option>
                  {clientesFiltro.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  Profissional
                </label>
                <select
                  value={profissionalFiltro}
                  onChange={(e) => setProfissionalFiltro(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
                >
                  <option value="">Todos</option>
                  {profissionaisDisponiveis.map((prof) => (
                    <option key={prof} value={prof}>
                      {prof}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  Forma de pagamento
                </label>
                <select
                  value={formaPagamentoFiltro}
                  onChange={(e) => setFormaPagamentoFiltro(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
                >
                  <option value="">Todas</option>
                  {formasPagamentoDisponiveis.map((forma) => (
                    <option key={forma} value={forma}>
                      {forma}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  Item vendido
                </label>
                <input
                  value={itemFiltro}
                  onChange={(e) => setItemFiltro(e.target.value)}
                  placeholder="Ex.: sobrancelha"
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  Valor mínimo
                </label>
                <input
                  value={valorMinimo}
                  onChange={(e) => setValorMinimo(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  Valor máximo
                </label>
                <input
                  value={valorMaximo}
                  onChange={(e) => setValorMaximo(e.target.value)}
                  placeholder="999,99"
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-4 py-3.5">
              <div className="text-lg font-bold text-zinc-900">Lista de vendas</div>
              <div className="mt-1 text-sm text-zinc-500">
                Consulte, imprima, reabra ou exclua vendas com segurança.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3">Comanda</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Profissional</th>
                    <th className="px-4 py-3">Pagamento</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasFiltradas.map((item) => {
                    const rowBusca = vendasBusca.find((row) => row.id === item.id);

                    return (
                      <tr key={item.id} className="border-b border-zinc-100 last:border-b-0">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-zinc-900">#{item.numero}</div>
                          <div className="text-xs text-zinc-500">
                            Subtotal: {formatCurrency(item.subtotal)}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-sm text-zinc-700">
                          {getJoinedName(item.clientes, "Sem cliente")}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusBadgeClass(item.status)}`}>
                            {item.status}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-sm text-zinc-700">
                          {formatDateTime(item.fechada_em || item.cancelada_em)}
                        </td>

                        <td className="px-4 py-3.5 text-sm font-semibold text-zinc-900">
                          {formatCurrency(item.total)}
                        </td>

                        <td className="px-4 py-3.5 text-sm text-zinc-700">
                          {rowBusca?.profissionais_nomes || "-"}
                        </td>

                        <td className="px-4 py-3.5 text-sm text-zinc-700">
                          {rowBusca?.formas_pagamento || "-"}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => abrirDetalhes(item)}
                              className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-700 transition hover:bg-zinc-100"
                              title="Ver detalhes"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => imprimirCupomCompleto(item)}
                              className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-700 transition hover:bg-zinc-100"
                              title="Imprimir cupom"
                            >
                              <Printer size={16} />
                            </button>

                            {item.status === "fechada" && podeReabrirVenda ? (
                              <button
                                type="button"
                                onClick={() => abrirModalReabrir(item)}
                                className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-amber-700 transition hover:bg-amber-100"
                                title="Mandar para o caixa"
                              >
                                <RotateCcw size={16} />
                              </button>
                            ) : null}

                            {podeExcluirVenda ? (
                              <button
                                type="button"
                                onClick={() => abrirModalExcluir(item)}
                                className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                                title="Excluir venda"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {vendasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-zinc-500">
                        Nenhuma venda encontrada para os filtros informados.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {vendasHasMore ? (
              <div className="flex justify-center border-t border-zinc-200 px-4 py-4">
                <button
                  type="button"
                  onClick={() => void carregarMaisVendas()}
                  disabled={loadingMore}
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                >
                  {loadingMore ? "Carregando..." : "Carregar mais vendas"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {detalheOpen && detalheVenda ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-[1.6rem] font-bold text-zinc-900">
                  Detalhes da venda #{detalheVenda.comanda?.numero}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Cliente: {getJoinedName(detalheVenda.comanda?.clientes, "Sem cliente")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDetalheOpen(false);
                  setDetalheVenda(null);
                }}
                className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-700 transition hover:bg-zinc-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-h-0 overflow-y-auto p-6 agenda-scroll">
                  <div className="space-y-4">
                    <div className="rounded-[20px] border border-zinc-200 bg-white">
                      <div className="border-b border-zinc-200 px-4 py-3.5">
                        <div className="flex items-center gap-2 text-lg font-bold text-zinc-900">
                          <Receipt size={18} />
                          Itens da venda
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-500">
                              <th className="px-4 py-3">Descrição</th>
                              <th className="px-4 py-3">Qtd</th>
                              <th className="px-4 py-3">Unit.</th>
                              <th className="px-4 py-3">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalheVenda.itens.map((item) => (
                              <tr key={item.id} className="border-b border-zinc-100 last:border-b-0">
                                <td className="px-4 py-3.5">
                                  <ComboItemLabel descricao={item.descricao} />
                                  <div className="text-xs uppercase text-zinc-500">{item.tipo_item}</div>
                                </td>
                                <td className="px-4 py-3.5 text-sm text-zinc-700">{item.quantidade}</td>
                                <td className="px-4 py-3.5 text-sm text-zinc-700">
                                  {formatCurrency(item.valor_unitario)}
                                </td>
                                <td className="px-4 py-3.5 text-sm font-semibold text-zinc-900">
                                  {formatCurrency(item.valor_total)}
                                </td>
                              </tr>
                            ))}

                            {detalheVenda.itens.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-10 text-center text-sm text-zinc-500">
                                  Nenhum item encontrado.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {comboSummaryDetalhe.length > 0 ? (
                      <div className="rounded-[20px] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white p-4">
                        <div className="mb-3.5 flex items-start justify-between gap-4">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">
                              Totais por combo
                            </div>
                            <div className="mt-2 text-lg font-bold text-zinc-950">
                              Quanto cada combo representou nesta venda
                            </div>
                            <p className="mt-1 text-sm text-zinc-500">
                              O total abaixo soma os serviços filhos que vieram de cada combo.
                            </p>
                          </div>
                          <div className="rounded-2xl border border-violet-200 bg-white px-3.5 py-2.5 text-right shadow-sm">
                            <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                              Combos
                            </div>
                            <div className="mt-1 text-xl font-bold text-zinc-950">
                              {comboSummaryDetalhe.length}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-2.5 md:grid-cols-2">
                          {comboSummaryDetalhe.map((combo) => (
                            <div
                              key={combo.comboName}
                              className="rounded-[20px] border border-violet-200 bg-white p-3.5 shadow-sm"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700">
                                  Combo
                                </span>
                                <span className="text-sm font-semibold text-zinc-900">
                                  {formatCurrency(combo.total)}
                                </span>
                              </div>
                              <div className="mt-2.5 text-[15px] font-bold text-zinc-950">
                                {combo.comboName}
                              </div>
                              <div className="mt-1 text-sm text-zinc-500">
                                {combo.itemCount} item(ns) rateados
                              </div>
                              <div className="mt-2.5 text-xs leading-5 text-zinc-500">
                                {combo.childLabels.join(", ")}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-[20px] border border-zinc-200 bg-white p-4">
                      <div className="mb-3.5 flex items-center gap-2 text-lg font-bold text-zinc-900">
                        <FileText size={18} />
                        Pagamentos
                      </div>

                      <div className="space-y-3">
                        {detalheVenda.pagamentos.map((pagamento) => (
                          <div
                            key={pagamento.id}
                          className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5"
                          >
                            <div>
                              <div className="font-semibold capitalize text-zinc-900">
                                {pagamento.forma_pagamento}
                              </div>
                              <div className="text-sm text-zinc-500">
                                {pagamento.parcelas && pagamento.parcelas > 1
                                  ? `${pagamento.parcelas}x`
                                  : "À vista"}
                              </div>
                            </div>

                            <div className="text-sm font-semibold text-zinc-900">
                              {formatCurrency(pagamento.valor)}
                            </div>
                          </div>
                        ))}

                        {detalheVenda.pagamentos.length === 0 ? (
                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-5 text-center text-sm text-zinc-500">
                            Nenhum pagamento encontrado.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 overflow-y-auto border-t border-zinc-200 bg-zinc-50 p-6 agenda-scroll xl:border-l xl:border-t-0">
                  <div className="space-y-5">
                    <div className="rounded-[20px] border border-zinc-200 bg-white p-4 shadow-sm">
                      <div className="mb-3.5 text-lg font-bold text-zinc-900">Resumo</div>

                      <div className="space-y-3">
                        <ResumoRow
                          label="Comanda"
                          value={`#${detalheVenda.comanda?.numero || "-"}`}
                        />
                        <ResumoRow
                          label="Cliente"
                          value={getJoinedName(detalheVenda.comanda?.clientes, "Sem cliente")}
                        />
                        <ResumoRow
                          label="Status"
                          value={detalheVenda.comanda?.status || "-"}
                        />
                        <ResumoRow
                          label="Abertura"
                          value={formatDateTime(detalheVenda.comanda?.aberta_em)}
                        />
                        <ResumoRow
                          label="Fechamento"
                          value={formatDateTime(
                            detalheVenda.comanda?.fechada_em || detalheVenda.comanda?.cancelada_em
                          )}
                        />
                        <ResumoRow
                          label="Subtotal"
                          value={formatCurrency(detalheVenda.comanda?.subtotal)}
                        />
                        <ResumoRow
                          label="Desconto"
                          value={formatCurrency(detalheVenda.comanda?.desconto)}
                        />
                        <ResumoRow
                          label="Acréscimo"
                          value={formatCurrency(detalheVenda.comanda?.acrescimo)}
                        />

                        <div className="rounded-2xl bg-zinc-900 px-4 py-3.5 text-white">
                          <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                            Total
                          </div>
                          <div className="mt-1 text-3xl font-bold">
                            {formatCurrency(detalheVenda.comanda?.total)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-zinc-200 bg-white p-4 shadow-sm">
                      <div className="mb-3.5 text-lg font-bold text-zinc-900">Ações</div>

                      <div className="grid grid-cols-1 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            imprimirCupom(
                              detalheVenda.comanda as ComandaVenda,
                              detalheVenda,
                              salaoInfo
                            )
                          }
                          className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                        >
                          <Printer size={16} />
                          Imprimir cupom
                        </button>

                        {detalheVenda.comanda?.status === "fechada" && podeReabrirVenda ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDetalheOpen(false);
                              abrirModalReabrir(detalheVenda.comanda as ComandaVenda);
                            }}
                            className="flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                          >
                            <RotateCcw size={16} />
                            Mandar para o caixa
                          </button>
                        ) : null}

                        {podeExcluirVenda ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDetalheOpen(false);
                              abrirModalExcluir(detalheVenda.comanda as ComandaVenda);
                            }}
                            className="flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            <Trash2 size={16} />
                            Excluir venda
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {reabrirModalOpen && vendaSelecionada ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-zinc-200 bg-white shadow-2xl">
            <div className="border-b border-zinc-200 px-6 py-5">
              <h2 className="text-xl font-bold text-zinc-900">Mandar venda para o caixa</h2>
              <p className="mt-1 text-sm text-zinc-500">
                A venda #{vendaSelecionada.numero} será reaberta no caixa para edição.
              </p>
            </div>

            <div className="px-6 py-5">
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                Motivo
              </label>
              <textarea
                rows={4}
                value={motivoReabertura}
                onChange={(e) => setMotivoReabertura(e.target.value)}
                placeholder="Ex.: cliente pediu ajuste, correção de pagamento..."
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setReabrirModalOpen(false)}
                disabled={saving}
                className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={confirmarReabrirVenda}
                disabled={saving}
                className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {saving ? "Reabrindo..." : "Confirmar e mandar para o caixa"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {excluirModalOpen && vendaSelecionada ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-zinc-200 bg-white shadow-2xl">
            <div className="border-b border-zinc-200 px-6 py-5">
              <h2 className="text-xl font-bold text-zinc-900">Excluir venda</h2>
              <p className="mt-1 text-sm text-zinc-500">
                A venda #{vendaSelecionada.numero} será removida junto com comissões, pagamentos, itens e agendamentos vinculados.
              </p>
            </div>

            <div className="px-6 py-5">
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                Motivo da exclusão
              </label>
              <textarea
                rows={4}
                value={motivoExclusao}
                onChange={(e) => setMotivoExclusao(e.target.value)}
                placeholder="Descreva o motivo da exclusão da venda..."
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setExcluirModalOpen(false)}
                disabled={saving}
                className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={confirmarExcluirVenda}
                disabled={saving}
                className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {saving ? "Excluindo..." : "Confirmar exclusão"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ComboItemLabel({ descricao }: { descricao: string }) {
  const comboMeta = parseComboDisplayMeta(descricao);

  return (
    <div>
      <div className="font-semibold text-zinc-900">{comboMeta.displayTitle}</div>
      {comboMeta.isComboItem ? (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700">
            Combo
          </span>
          <span className="text-xs text-zinc-500">{comboMeta.comboName}</span>
        </div>
      ) : null}
    </div>
  );
}


