"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePainelSession } from "@/components/layout/PainelSessionProvider";
import AppLoading from "@/components/ui/AppLoading";
import AppModal from "@/components/ui/AppModal";
import { createClient } from "@/lib/supabase/client";
import {
  BadgeDollarSign,
  CalendarDays,
  CreditCard,
  Printer,
  Receipt,
  Scissors,
  Search,
  Wallet,
  ShieldAlert,
} from "lucide-react";
import { parseComboDisplayMeta } from "@/lib/combo/display";
import { getLocalDayRangeIso } from "@/lib/date/local-day-range";
import { getPlanoMinimoParaRecurso, type PlanoCobravelCodigo } from "@/lib/plans/catalog";
import { getAssinaturaUrl } from "@/lib/site-urls";

type ClienteJoin = {
  nome?: string | null;
};

type ComandaRow = {
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

type PagamentoRow = {
  id: string;
  id_comanda: string;
  forma_pagamento: string;
  valor: number | null;
  parcelas?: number | null;
  taxa_maquininha_percentual?: number | null;
  taxa_maquininha_valor?: number | null;
  observacoes?: string | null;
  pago_em?: string | null;
};

type ComissaoRow = {
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

type CaixaSessaoResumoRow = {
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

type ResumoFinanceiro = {
  faturamentoBruto: number;
  descontos: number;
  acrescimos: number;
  faturamentoLiquido: number;
  recebido: number;
  taxaMaquininha: number;
  comissaoPendente: number;
  comissaoPaga: number;
  canceladas: number;
  quantidadeVendas: number;
  ticketMedio: number;
};

type ResumoCaixa = {
  sessoesFechadas: number;
  previstoFechamento: number;
  contadoFechamento: number;
  quebraTotal: number;
  sobraTotal: number;
};

type StatusFiltro = "fechada" | "cancelada" | "todos";
type PainelLateralTab = "pagamentos" | "comissoes";
type PrintSectionKey = "vendas" | "pagamentos" | "comissoes";
type PrintSelection = Record<PrintSectionKey, boolean>;

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getJoinedName(
  value: ClienteJoin | ClienteJoin[] | null | undefined,
  fallback = "-"
) {
  const first = toArray(value)[0];
  return first?.nome || fallback;
}

function formatCurrency(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function formatDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatFormaPagamentoLabel(value: string) {
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

function getStatusBadgeClass(status: string) {
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

function KpiCard({
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

function ComboDescriptionCell({
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
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700">
            Combo
          </span>
          <span className="text-xs text-zinc-500">{comboMeta.comboName}</span>
        </div>
      ) : null}
    </div>
  );
}

export default function RelatorioFinanceiroPage() {
  const supabase = createClient();
  const { snapshot: painelSession } = usePainelSession();

  const [loading, setLoading] = useState(true);
  const [semPermissao, setSemPermissao] = useState(false);
  const [erroTela, setErroTela] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [dataInicio, setDataInicio] = useState(formatDateInput(inicioMes));
  const [dataFim, setDataFim] = useState(formatDateInput(hoje));
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("fechada");
  const [painelLateralTab, setPainelLateralTab] =
    useState<PainelLateralTab>("pagamentos");
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [relatoriosAvancados, setRelatoriosAvancados] = useState(false);
  const [printSelection, setPrintSelection] = useState<PrintSelection>({
    vendas: true,
    pagamentos: true,
    comissoes: true,
  });

  const [comandas, setComandas] = useState<ComandaRow[]>([]);
  const [pagamentos, setPagamentos] = useState<PagamentoRow[]>([]);
  const [comissoes, setComissoes] = useState<ComissaoRow[]>([]);
  const [caixaSessoes, setCaixaSessoes] = useState<CaixaSessaoResumoRow[]>([]);

  const carregarRelatorio = useCallback(
    async (salaoIdParam?: string) => {
      try {
        const salaoId = salaoIdParam || idSalao;
        if (!salaoId) return;
        const dataInicioRange = getLocalDayRangeIso(dataInicio);
        const dataFimRange = getLocalDayRangeIso(dataFim);

        setErroTela("");
        setMsg("");

        setRelatoriosAvancados(
          Boolean(painelSession?.planoRecursos?.relatorios_avancados)
        );

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
          .eq("id_salao", salaoId);

        if (statusFiltro !== "todos") {
          queryComandas = queryComandas.eq("status", statusFiltro);
        } else {
          queryComandas = queryComandas.in("status", ["fechada", "cancelada"]);
        }

        if (statusFiltro === "fechada") {
          queryComandas = queryComandas
            .gte("fechada_em", dataInicioRange.startIso)
            .lte("fechada_em", dataFimRange.endIso)
            .order("fechada_em", { ascending: false });
        } else if (statusFiltro === "cancelada") {
          queryComandas = queryComandas
            .gte("cancelada_em", dataInicioRange.startIso)
            .lte("cancelada_em", dataFimRange.endIso)
            .order("cancelada_em", { ascending: false });
        } else {
          queryComandas = queryComandas
            .or(
              [
                `and(status.eq.fechada,fechada_em.gte.${dataInicioRange.startIso},fechada_em.lte.${dataFimRange.endIso})`,
                `and(status.eq.cancelada,cancelada_em.gte.${dataInicioRange.startIso},cancelada_em.lte.${dataFimRange.endIso})`,
              ].join(",")
            )
            .order("fechada_em", { ascending: false });
        }

        const { data: comandasData, error: comandasError } = await queryComandas;

        if (comandasError) {
          console.error(comandasError);
          setErroTela("Erro ao carregar comandas do relatório.");
          return;
        }

        const listaComandas = (comandasData as ComandaRow[]) || [];
        setComandas(listaComandas);

        const { data: caixaSessoesData, error: caixaSessoesError } = await supabase
          .from("caixa_sessoes")
          .select(`
            id,
            status,
            aberto_em,
            fechado_em,
            valor_abertura,
            valor_previsto_fechamento,
            valor_fechamento_informado,
            valor_diferenca_fechamento,
            tipo_fechamento,
            observacoes
          `)
          .eq("id_salao", salaoId)
          .eq("status", "fechado")
          .gte("fechado_em", dataInicioRange.startIso)
          .lte("fechado_em", dataFimRange.endIso)
          .order("fechado_em", { ascending: false });

        if (caixaSessoesError) {
          console.error(caixaSessoesError);
          setErroTela("Erro ao carregar fechamentos do caixa.");
          return;
        }

        setCaixaSessoes((caixaSessoesData as CaixaSessaoResumoRow[]) || []);

        const idsComandas = listaComandas.map((item) => item.id);

        if (idsComandas.length === 0) {
          setPagamentos([]);
          setComissoes([]);
          return;
        }

        const [
          { data: pagamentosData, error: pagamentosError },
          { data: comissoesData, error: comissoesError },
        ] = await Promise.all([
          supabase
            .from("comanda_pagamentos")
            .select(`
              id,
              id_comanda,
              forma_pagamento,
              valor,
              parcelas,
              taxa_maquininha_percentual,
              taxa_maquininha_valor,
              observacoes,
              pago_em
            `)
            .in("id_comanda", idsComandas),

          supabase
            .from("comissoes_lancamentos")
            .select(`
              id,
              id_comanda,
              id_profissional,
              descricao,
              valor_base,
              percentual_aplicado,
              valor_comissao,
              valor_comissao_assistente,
              status,
              competencia_data,
              pago_em
            `)
            .in("id_comanda", idsComandas),
        ]);

        if (pagamentosError) {
          console.error(pagamentosError);
          setErroTela("Erro ao carregar pagamentos do relatório.");
          return;
        }

        if (comissoesError) {
          console.error(comissoesError);
          setErroTela("Erro ao carregar comissões do relatório.");
          return;
        }

        setPagamentos((pagamentosData as PagamentoRow[]) || []);
        setComissoes((comissoesData as ComissaoRow[]) || []);
      } catch (error: unknown) {
        console.error(error);
        setErroTela(
          error instanceof Error ? error.message : "Erro ao carregar relatório financeiro."
        );
      }
    },
    [supabase, idSalao, statusFiltro, dataInicio, dataFim, painelSession?.planoRecursos]
  );

  const init = useCallback(async () => {
    try {
      setLoading(true);
      setErroTela("");
      setMsg("");
      setSemPermissao(false);

      if (!painelSession?.idSalao || !painelSession?.permissoes) {
        setErroTela("Não foi possível identificar o salão do usuário.");
        return;
      }

      if (!painelSession.permissoes.relatorios_ver) {
        setSemPermissao(true);
        return;
      }

      setIdSalao(painelSession.idSalao);
      await carregarRelatorio(painelSession.idSalao);
    } catch (error: unknown) {
      console.error(error);
      setErroTela(
        error instanceof Error ? error.message : "Erro ao carregar relatório financeiro."
      );
    } finally {
      setLoading(false);
    }
  }, [carregarRelatorio, painelSession]);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (idSalao && !semPermissao) {
      void carregarRelatorio(idSalao);
    }
  }, [idSalao, semPermissao, carregarRelatorio]);

  const comandasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return comandas;

    return comandas.filter((item) => {
      const numero = String(item.numero || "");
      const cliente = getJoinedName(item.clientes, "").toLowerCase();
      return numero.includes(termo) || cliente.includes(termo);
    });
  }, [busca, comandas]);

  const idsComandasFiltradas = useMemo(
    () => comandasFiltradas.map((item) => item.id),
    [comandasFiltradas]
  );

  const pagamentosFiltrados = useMemo(() => {
    return pagamentos.filter((item) => idsComandasFiltradas.includes(item.id_comanda));
  }, [pagamentos, idsComandasFiltradas]);

  const comissoesFiltradas = useMemo(() => {
    return comissoes.filter(
      (item) => item.id_comanda && idsComandasFiltradas.includes(item.id_comanda)
    );
  }, [comissoes, idsComandasFiltradas]);

  const resumo = useMemo<ResumoFinanceiro>(() => {
    const faturamentoBruto = comandasFiltradas
      .filter((item) => item.status === "fechada")
      .reduce((acc, item) => acc + Number(item.subtotal || 0), 0);

    const descontos = comandasFiltradas
      .filter((item) => item.status === "fechada")
      .reduce((acc, item) => acc + Number(item.desconto || 0), 0);

    const acrescimos = comandasFiltradas
      .filter((item) => item.status === "fechada")
      .reduce((acc, item) => acc + Number(item.acrescimo || 0), 0);

    const faturamentoLiquido = comandasFiltradas
      .filter((item) => item.status === "fechada")
      .reduce((acc, item) => acc + Number(item.total || 0), 0);

    const recebido = pagamentosFiltrados.reduce((acc, item) => acc + Number(item.valor || 0), 0);

    const taxaMaquininha = pagamentosFiltrados.reduce(
      (acc, item) => acc + Number(item.taxa_maquininha_valor || 0),
      0
    );

    const comissaoPendente = comissoesFiltradas
      .filter((item) => item.status === "pendente")
      .reduce((acc, item) => acc + Number(item.valor_comissao || 0), 0);

    const comissaoPaga = comissoesFiltradas
      .filter((item) => item.status === "pago")
      .reduce((acc, item) => acc + Number(item.valor_comissao || 0), 0);

    const canceladas = comandasFiltradas
      .filter((item) => item.status === "cancelada")
      .reduce((acc, item) => acc + Number(item.total || 0), 0);

    const quantidadeVendas = comandasFiltradas.filter((item) => item.status === "fechada").length;

    const ticketMedio = quantidadeVendas > 0 ? faturamentoLiquido / quantidadeVendas : 0;

    return {
      faturamentoBruto,
      descontos,
      acrescimos,
      faturamentoLiquido,
      recebido,
      taxaMaquininha,
      comissaoPendente,
      comissaoPaga,
      canceladas,
      quantidadeVendas,
      ticketMedio,
    };
  }, [comandasFiltradas, pagamentosFiltrados, comissoesFiltradas]);

  const pagamentosPorForma = useMemo(() => {
    const mapa = new Map<string, { forma: string; total: number; taxa: number; qtd: number }>();

    pagamentosFiltrados.forEach((item) => {
      const chave = item.forma_pagamento || "outro";
      const atual = mapa.get(chave) || {
        forma: chave,
        total: 0,
        taxa: 0,
        qtd: 0,
      };

      atual.total += Number(item.valor || 0);
      atual.taxa += Number(item.taxa_maquininha_valor || 0);
      atual.qtd += 1;

      mapa.set(chave, atual);
    });

    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }, [pagamentosFiltrados]);

  const resumoCaixa = useMemo<ResumoCaixa>(() => {
    const previstoFechamento = caixaSessoes.reduce(
      (acc, item) => acc + Number(item.valor_previsto_fechamento || 0),
      0
    );

    const contadoFechamento = caixaSessoes.reduce(
      (acc, item) => acc + Number(item.valor_fechamento_informado || 0),
      0
    );

    const quebraTotal = caixaSessoes
      .filter((item) => item.tipo_fechamento === "quebra")
      .reduce(
        (acc, item) => acc + Math.abs(Number(item.valor_diferenca_fechamento || 0)),
        0
      );

    const sobraTotal = caixaSessoes
      .filter((item) => item.tipo_fechamento === "sobra")
      .reduce(
        (acc, item) => acc + Math.abs(Number(item.valor_diferenca_fechamento || 0)),
        0
      );

    return {
      sessoesFechadas: caixaSessoes.length,
      previstoFechamento,
      contadoFechamento,
      quebraTotal,
      sobraTotal,
    };
  }, [caixaSessoes]);

  const resumoComissoes = useMemo(() => {
    const pendentes = comissoesFiltradas.filter((item) => item.status === "pendente");
    const pagas = comissoesFiltradas.filter((item) => item.status === "pago");

    return {
      totalLancamentos: comissoesFiltradas.length,
      pendentes: pendentes.length,
      pagas: pagas.length,
      valorPendente: pendentes.reduce(
        (acc, item) => acc + Number(item.valor_comissao || 0),
        0
      ),
      valorPago: pagas.reduce((acc, item) => acc + Number(item.valor_comissao || 0), 0),
    };
  }, [comissoesFiltradas]);

  const totalSecoesSelecionadas = useMemo(
    () => Object.values(printSelection).filter(Boolean).length,
    [printSelection]
  );

  const togglePrintSelection = useCallback((key: PrintSectionKey) => {
    setPrintSelection((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }, []);

  const marcarTodasSecoes = useCallback(() => {
    setPrintSelection({
      vendas: true,
      pagamentos: true,
      comissoes: true,
    });
  }, []);

  const imprimirRelatorio = useCallback(() => {
    const sections = Object.entries(printSelection)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);

    if (sections.length === 0) {
      setMsg("Selecione ao menos uma parte do relatório para imprimir.");
      return;
    }

    setMsg("");
    setPrintModalOpen(false);

    const periodLabel = `Período de ${dataInicio} até ${dataFim}`;
    const generatedAt = new Date().toLocaleString("pt-BR");

    const vendasRows =
      comandasFiltradas.length > 0
        ? comandasFiltradas
            .map(
              (item) => `
                <tr>
                  <td>#${escapeHtml(String(item.numero))}</td>
                  <td>${escapeHtml(getJoinedName(item.clientes, "Sem cliente"))}</td>
                  <td>${escapeHtml(item.status || "-")}</td>
                  <td>${escapeHtml(
                    formatDateTime(item.fechada_em || item.cancelada_em || item.aberta_em)
                  )}</td>
                  <td>${escapeHtml(formatCurrency(item.subtotal))}</td>
                  <td>${escapeHtml(formatCurrency(item.desconto))}</td>
                  <td>${escapeHtml(formatCurrency(item.acrescimo))}</td>
                  <td>${escapeHtml(formatCurrency(item.total))}</td>
                </tr>
              `
            )
            .join("")
        : `
          <tr>
            <td colspan="8" class="empty">Nenhuma venda encontrada no período.</td>
          </tr>
        `;

    const pagamentosRows =
      pagamentosPorForma.length > 0
        ? pagamentosPorForma
            .map(
              (item) => `
                <tr>
                  <td>${escapeHtml(formatFormaPagamentoLabel(item.forma))}</td>
                  <td>${escapeHtml(String(item.qtd))}</td>
                  <td>${escapeHtml(formatCurrency(item.taxa))}</td>
                  <td>${escapeHtml(formatCurrency(item.total))}</td>
                </tr>
              `
            )
            .join("")
        : `
          <tr>
            <td colspan="4" class="empty">Nenhum pagamento encontrado.</td>
          </tr>
        `;

    const comissoesRows =
      comissoesFiltradas.length > 0
        ? comissoesFiltradas
            .map(
              (item) => `
                <tr>
                  <td>${escapeHtml(parseComboDisplayMeta(item.descricao).displayTitle)}</td>
                  <td>${escapeHtml(formatCurrency(item.valor_base))}</td>
                  <td>${escapeHtml(
                    `${Number(item.percentual_aplicado || 0).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}%`
                  )}</td>
                  <td>${escapeHtml(formatCurrency(item.valor_comissao))}</td>
                  <td>${escapeHtml(item.status || "-")}</td>
                </tr>
              `
            )
            .join("")
        : `
          <tr>
            <td colspan="5" class="empty">Nenhuma comissão encontrada.</td>
          </tr>
        `;

    const sectionBlocks = [
      printSelection.vendas
        ? `
          <section class="report-card">
            <div class="section-head">
              <h2>Vendas do período</h2>
              <p>Lista de comandas conforme os filtros atuais.</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Comanda</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Subtotal</th>
                  <th>Desconto</th>
                  <th>Acréscimo</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>${vendasRows}</tbody>
            </table>
          </section>
        `
        : "",
      printSelection.pagamentos
        ? `
          <section class="report-card">
            <div class="section-head">
              <h2>Pagamentos por forma</h2>
              <p>Total recebido agrupado por forma de pagamento.</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Forma</th>
                  <th>Pagamentos</th>
                  <th>Taxa</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>${pagamentosRows}</tbody>
            </table>
          </section>
        `
        : "",
      printSelection.comissoes
        ? `
          <section class="report-card">
            <div class="section-head">
              <h2>Comissões do período</h2>
              <p>Resumo das comissoes ligadas as vendas filtradas.</p>
            </div>
            <div class="summary-grid">
              <div class="summary-card">
                <span>Lançamentos</span>
                <strong>${escapeHtml(String(resumoComissoes.totalLancamentos))}</strong>
              </div>
              <div class="summary-card">
                <span>Pendentes</span>
                <strong>${escapeHtml(formatCurrency(resumoComissoes.valorPendente))}</strong>
              </div>
              <div class="summary-card">
                <span>Pagas</span>
                <strong>${escapeHtml(formatCurrency(resumoComissoes.valorPago))}</strong>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Base</th>
                  <th>%</th>
                  <th>Comissão</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${comissoesRows}</tbody>
            </table>
          </section>
        `
        : "",
    ]
      .filter(Boolean)
      .join("");

    const reportHtml = `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Relatório financeiro</title>
          <style>
            :root {
              color-scheme: light;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              background: #f4f4f5;
              color: #18181b;
              font-family: Inter, Arial, Helvetica, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page {
              width: 100%;
              max-width: 1080px;
              margin: 0 auto;
              padding: 32px 24px 40px;
            }
            .report-header {
              border: 1px solid #e4e4e7;
              border-radius: 24px;
              background: #ffffff;
              padding: 24px;
              margin-bottom: 20px;
            }
            .eyebrow {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: #71717a;
            }
            h1 {
              margin: 10px 0 0;
              font-size: 30px;
              line-height: 1.1;
            }
            .subtitle {
              margin-top: 10px;
              font-size: 14px;
              color: #52525b;
            }
            .meta {
              margin-top: 4px;
              font-size: 12px;
              color: #71717a;
            }
            .report-card {
              border: 1px solid #e4e4e7;
              border-radius: 24px;
              background: #ffffff;
              padding: 20px;
              margin-bottom: 18px;
              break-inside: avoid;
            }
            .section-head h2 {
              margin: 0;
              font-size: 20px;
            }
            .section-head p {
              margin: 6px 0 0;
              font-size: 13px;
              color: #71717a;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
              margin: 18px 0;
            }
            .summary-card {
              border: 1px solid #e4e4e7;
              border-radius: 18px;
              background: #fafafa;
              padding: 14px 16px;
            }
            .summary-card span {
              display: block;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: #71717a;
            }
            .summary-card strong {
              display: block;
              margin-top: 8px;
              font-size: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 18px;
            }
            th {
              background: #fafafa;
              color: #71717a;
              font-size: 11px;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              text-align: left;
              padding: 11px 12px;
              border-bottom: 1px solid #e4e4e7;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #f0f0f0;
              font-size: 13px;
              vertical-align: top;
            }
            tbody tr:last-child td {
              border-bottom: none;
            }
            .empty {
              text-align: center;
              color: #71717a;
              padding: 22px 12px;
            }
            @media print {
              body {
                background: #ffffff;
              }
              .page {
                max-width: none;
                padding: 0;
              }
              .report-header,
              .report-card,
              .summary-card {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <main class="page">
            <header class="report-header">
              <div class="eyebrow">Relatório financeiro</div>
              <h1>Resumo do período</h1>
              <div class="subtitle">${escapeHtml(periodLabel)}</div>
              <div class="meta">Gerado em ${escapeHtml(generatedAt)}</div>
            </header>
            ${sectionBlocks}
          </main>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    document.body.appendChild(iframe);

    const printDocument =
      iframe.contentWindow?.document || iframe.contentDocument || null;

    if (!printDocument || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      setMsg("Não foi possível montar o relatório para impressão.");
      return;
    }

    printDocument.open();
    printDocument.write(reportHtml);
    printDocument.close();

    const cleanup = () => {
      window.setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 300);
    };

    iframe.onload = () => {
      window.setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        cleanup();
      }, 250);
    };
  }, [
    comandasFiltradas,
    pagamentosPorForma,
    comissoesFiltradas,
    resumoComissoes,
    printSelection,
    dataInicio,
    dataFim,
  ]);

  if (loading) {
    return (
      <AppLoading
        title="Carregando relatorio financeiro"
        message="Aguarde enquanto cruzamos vendas, pagamentos, taxas e comissoes do periodo."
        fullHeight={false}
      />
    );
  }

  if (semPermissao) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <ShieldAlert size={22} />
            </div>

            <div>
              <h1 className="text-xl font-bold text-amber-900">Sem permissão</h1>
              <p className="mt-2 text-sm text-amber-800">
                Seu usuário não tem acesso para visualizar o relatório financeiro.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-4 text-zinc-950 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Visao do periodo
              </div>
              <h1 className="mt-1 text-[1.95rem] font-bold tracking-[-0.04em] md:text-[2.1rem]">
                Relatorio financeiro
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Vendas, recebimentos, comissoes e fechamento de caixa em blocos mais diretos.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                <Printer size={16} />
                Imprimir
              </button>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Vendas fechadas
                </div>
                <div className="mt-1 text-2xl font-bold">{resumo.quantidadeVendas}</div>
              </div>
            </div>
          </div>
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

        <div className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                Buscar
              </label>

              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <Search size={16} className="text-zinc-500" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Número da comanda ou cliente"
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
                onChange={(e) => setStatusFiltro(e.target.value as StatusFiltro)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
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
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                />
                <CalendarDays
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={16}
                />
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
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                />
                <CalendarDays
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={16}
                />
              </div>
            </div>
          </div>
        </div>

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">Vendas e recebimentos</h2>
            <p className="text-sm text-zinc-500">
              Leitura rapida do que entrou no periodo filtrado.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
          <KpiCard
            icon={<BadgeDollarSign size={18} />}
            label="Faturamento bruto"
            value={formatCurrency(resumo.faturamentoBruto)}
          />
          <KpiCard
            icon={<Receipt size={18} />}
            label="Faturamento líquido"
            value={formatCurrency(resumo.faturamentoLiquido)}
            helper={
              relatoriosAvancados
                ? `Ticket médio: ${formatCurrency(resumo.ticketMedio)}`
                : "Leitura básica do período"
            }
          />
          <KpiCard
            icon={<Wallet size={18} />}
            label="Recebido"
            value={formatCurrency(resumo.recebido)}
          />
          <KpiCard
            icon={<CreditCard size={18} />}
            label="Taxa maquininha"
            value={formatCurrency(resumo.taxaMaquininha)}
          />
          <KpiCard
            icon={<Scissors size={18} />}
            label="Comissão pendente"
            value={formatCurrency(resumo.comissaoPendente)}
            helper={`Paga: ${formatCurrency(resumo.comissaoPaga)}`}
          />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          <KpiCard
            icon={<Receipt size={18} />}
            label="Descontos"
            value={formatCurrency(resumo.descontos)}
          />
          <KpiCard
            icon={<Receipt size={18} />}
            label="Acréscimos"
            value={formatCurrency(resumo.acrescimos)}
          />
          <KpiCard
            icon={<Receipt size={18} />}
            label="Canceladas"
            value={
              relatoriosAvancados ? formatCurrency(resumo.canceladas) : "Upgrade"
            }
          />
          <KpiCard
            icon={<Receipt size={18} />}
            label="Quantidade de vendas"
            value={String(resumo.quantidadeVendas)}
          />
          </div>
        </section>

        {relatoriosAvancados ? (
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-950">Fechamento de caixa</h2>
              <p className="text-sm text-zinc-500">
                Diferença entre previsto, contado, sobra e quebra.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
            <KpiCard
              icon={<Wallet size={18} />}
              label="Fechamentos de caixa"
              value={String(resumoCaixa.sessoesFechadas)}
            />
            <KpiCard
              icon={<Receipt size={18} />}
              label="Previsto no fechamento"
              value={formatCurrency(resumoCaixa.previstoFechamento)}
            />
            <KpiCard
              icon={<BadgeDollarSign size={18} />}
              label="Contado no fechamento"
              value={formatCurrency(resumoCaixa.contadoFechamento)}
            />
            <KpiCard
              icon={<ShieldAlert size={18} />}
              label="Quebra de caixa"
              value={formatCurrency(resumoCaixa.quebraTotal)}
            />
            <KpiCard
              icon={<CreditCard size={18} />}
              label="Sobra de caixa"
              value={formatCurrency(resumoCaixa.sobraTotal)}
            />
            </div>
          </section>
        ) : (
          <UpgradePanel
            title="Relatório avançado"
            description="Fechamento de caixa com quebra, sobra e leitura mais gerencial entra no Pro ou Premium."
          />
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-5 py-4">
              <div className="text-lg font-bold text-zinc-900">Vendas do período</div>
              <div className="mt-1 text-sm text-zinc-500">
                Lista de comandas conforme os filtros atuais.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-3.5 py-3">Comanda</th>
                    <th className="px-3.5 py-3">Cliente</th>
                    <th className="px-3.5 py-3">Status</th>
                    <th className="px-3.5 py-3">Data</th>
                    <th className="px-3.5 py-3">Subtotal</th>
                    <th className="px-3.5 py-3">Desc.</th>
                    <th className="px-3.5 py-3">Acrésc.</th>
                    <th className="px-3.5 py-3">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {comandasFiltradas.map((item) => (
                    <tr key={item.id} className="border-b border-zinc-100 last:border-b-0">
                      <td className="px-3.5 py-4 whitespace-nowrap font-semibold text-zinc-900">
                        #{item.numero}
                      </td>
                      <td className="min-w-[120px] max-w-[180px] px-3.5 py-4 text-sm text-zinc-700 break-words">
                        {getJoinedName(item.clientes, "Sem cliente")}
                      </td>
                      <td className="px-3.5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${getStatusBadgeClass(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-4 whitespace-nowrap text-sm text-zinc-700">
                        {formatDateTime(item.fechada_em || item.cancelada_em || item.aberta_em)}
                      </td>
                      <td className="px-3.5 py-4 whitespace-nowrap text-sm text-zinc-700">
                        {formatCurrency(item.subtotal)}
                      </td>
                      <td className="px-3.5 py-4 whitespace-nowrap text-sm text-zinc-700">
                        {formatCurrency(item.desconto)}
                      </td>
                      <td className="px-3.5 py-4 whitespace-nowrap text-sm text-zinc-700">
                        {formatCurrency(item.acrescimo)}
                      </td>
                      <td className="px-3.5 py-4 whitespace-nowrap text-sm font-semibold text-zinc-900">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}

                  {comandasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-sm text-zinc-500">
                        Nenhuma venda encontrada no período.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

            <div className="space-y-5">
            <div className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-zinc-900">Painel lateral</div>
                  <div className="mt-1 text-sm text-zinc-500">
                    Pagamentos e comissões em uma leitura mais curta.
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-1">
                  <button
                    type="button"
                    onClick={() => setPainelLateralTab("pagamentos")}
                    className={`rounded-[12px] px-3 py-1.5 text-xs font-semibold ${
                      painelLateralTab === "pagamentos"
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-700"
                    }`}
                  >
                    Pagamentos
                  </button>
                  <button
                    type="button"
                    onClick={() => setPainelLateralTab("comissoes")}
                    className={`rounded-[12px] px-3 py-1.5 text-xs font-semibold ${
                      painelLateralTab === "comissoes"
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-700"
                    }`}
                  >
                    Comissões
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm ${
                painelLateralTab === "pagamentos" ? "block" : "hidden"
              }`}
            >
              <div className="border-b border-zinc-200 px-5 py-4">
                <div className="text-lg font-bold text-zinc-900">Pagamentos por forma</div>
                <div className="mt-1 text-sm text-zinc-500">
                  Total recebido agrupado por forma de pagamento.
                </div>
              </div>

              <div className="divide-y divide-zinc-100">
                {pagamentosPorForma.map((item) => (
                  <div key={item.forma} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <div className="font-semibold capitalize text-zinc-900">{item.forma}</div>
                      <div className="text-xs text-zinc-500">
                        {item.qtd} pagamento(s) â€¢ Taxa: {formatCurrency(item.taxa)}
                      </div>
                    </div>

                    <div className="text-sm font-bold text-zinc-900">{formatCurrency(item.total)}</div>
                  </div>
                ))}

                {pagamentosPorForma.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-zinc-500">
                    Nenhum pagamento encontrado.
                  </div>
                ) : null}
              </div>
            </div>

            <div
              className={`overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm ${
                painelLateralTab === "comissoes" ? "block" : "hidden"
              }`}
            >
              <div className="border-b border-zinc-200 px-5 py-4">
                <div className="text-lg font-bold text-zinc-900">Comissões do período</div>
                <div className="mt-1 text-sm text-zinc-500">
                  Resumo das comissoes ligadas as vendas filtradas.
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 border-b border-zinc-200 px-5 py-4 sm:grid-cols-3">
                <ResumoLateralCard
                  label="Lancamentos"
                  value={String(resumoComissoes.totalLancamentos)}
                  helper="Comissoes no filtro atual"
                />
                <ResumoLateralCard
                  label="Pendentes"
                  value={formatCurrency(resumoComissoes.valorPendente)}
                  helper={`${resumoComissoes.pendentes} lancamento(s)`}
                />
                <ResumoLateralCard
                  label="Pagas"
                  value={formatCurrency(resumoComissoes.valorPago)}
                  helper={`${resumoComissoes.pagas} lancamento(s)`}
                />
              </div>

              {relatoriosAvancados ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-500">
                        <th className="px-5 py-3">Descrição</th>
                        <th className="px-5 py-3">Base</th>
                        <th className="px-5 py-3">% </th>
                        <th className="px-5 py-3">Comissão</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {comissoesFiltradas.slice(0, 8).map((item) => (
                        <tr key={item.id} className="border-b border-zinc-100 last:border-b-0">
                          <td className="px-5 py-4">
                            <ComboDescriptionCell descricao={item.descricao} />
                          </td>
                          <td className="px-5 py-4 text-sm text-zinc-700">
                            {formatCurrency(item.valor_base)}
                          </td>
                          <td className="px-5 py-4 text-sm text-zinc-700">
                            {Number(item.percentual_aplicado || 0).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            %
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-zinc-900">
                            {formatCurrency(item.valor_comissao)}
                          </td>
                          <td className="px-5 py-4 text-sm text-zinc-700">{item.status || "-"}</td>
                        </tr>
                      ))}

                      {comissoesFiltradas.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-sm text-zinc-500">
                            Nenhuma comissão encontrada.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-5">
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
                    <div className="text-sm font-semibold text-zinc-900">
                      Detalhamento premium das comissões
                    </div>
                    <div className="mt-1 text-sm leading-6 text-zinc-500">
                      A tabela detalhada de comissões do período fica liberada no
                      Pro ou Premium. No Básico, você continua com o resumo
                      financeiro e a leitura essencial das vendas.
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href="/comparar-planos"
                        className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                      >
                        Comparar planos
                      </a>
                      <a
                        href={getAssinaturaUrl(`/assinatura?plano=${getPlanoMinimoParaRecurso("relatorios_avancados")}`)}
                        className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                      >
                        Fazer upgrade
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AppModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Imprimir relatório"
        description="Escolha o que vai sair na impressão deste período."
        maxWidthClassName="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPrintModalOpen(false)}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={imprimirRelatorio}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              <Printer size={16} />
              Imprimir agora
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Período
            </div>
            <div className="mt-2 text-sm font-medium text-zinc-900">
              De {dataInicio} até {dataFim}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <PrintOptionCard
              checked={printSelection.vendas}
              title="Vendas do período"
              description="Tabela principal das comandas filtradas."
              onToggle={() => togglePrintSelection("vendas")}
            />
            <PrintOptionCard
              checked={printSelection.pagamentos}
              title="Pagamentos por forma"
              description="Resumo por Pix, dinheiro, cartão e outros."
              onToggle={() => togglePrintSelection("pagamentos")}
            />
            <PrintOptionCard
              checked={printSelection.comissoes}
              title="Comissões do período"
              description="Resumo e tabela curta das comissões filtradas."
              onToggle={() => togglePrintSelection("comissoes")}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
            <div>
              <div className="text-sm font-semibold text-zinc-900">
                {totalSecoesSelecionadas} parte(s) selecionada(s)
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Você pode imprimir tudo ou só o que fizer sentido agora.
              </div>
            </div>

            <button
              type="button"
              onClick={marcarTodasSecoes}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Imprimir tudo
            </button>
          </div>
        </div>
      </AppModal>
    </div>
  );
}

function ResumoLateralCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </div>
      <div className="mt-2 text-xl font-bold text-zinc-950">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{helper}</div>
    </div>
  );
}

function PrintOptionCard({
  checked,
  title,
  description,
  onToggle,
}: {
  checked: boolean;
  title: string;
  description: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-[22px] border p-4 text-left transition ${
        checked
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className={`mt-2 text-xs leading-5 ${checked ? "text-zinc-300" : "text-zinc-500"}`}>
            {description}
          </div>
        </div>

        <span
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold ${
            checked
              ? "border-white/30 bg-white/10 text-white"
              : "border-zinc-300 bg-zinc-50 text-zinc-500"
          }`}
        >
          {checked ? "âœ“" : ""}
        </span>
      </div>
    </button>
  );
}

function UpgradePanel({
  title,
  description,
  plan = getPlanoMinimoParaRecurso("relatorios_avancados"),
}: {
  title: string;
  description: string;
  plan?: PlanoCobravelCodigo;
}) {
  return (
    <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
        {description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="/comparar-planos"
          className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
        >
          Comparar planos
        </a>
        <a
          href={getAssinaturaUrl(`/assinatura?plano=${plan}`)}
          className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Fazer upgrade
        </a>
      </div>
    </section>
  );
}







