"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppLoading from "@/components/ui/AppLoading";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import { hasPermission } from "@/lib/auth/permissions";
import type { UserNivel } from "@/lib/permissions";
import {
  BadgeDollarSign,
  CalendarDays,
  CreditCard,
  Receipt,
  Scissors,
  Search,
  Wallet,
  ShieldAlert,
} from "lucide-react";
import { parseComboDisplayMeta } from "@/lib/combo/display";

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

type StatusFiltro = "fechada" | "cancelada" | "todos";

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

  const [comandas, setComandas] = useState<ComandaRow[]>([]);
  const [pagamentos, setPagamentos] = useState<PagamentoRow[]>([]);
  const [comissoes, setComissoes] = useState<ComissaoRow[]>([]);

  const carregarRelatorio = useCallback(
    async (salaoIdParam?: string) => {
      try {
        const salaoId = salaoIdParam || idSalao;
        if (!salaoId) return;

        setErroTela("");
        setMsg("");

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
            .gte("fechada_em", `${dataInicio}T00:00:00`)
            .lte("fechada_em", `${dataFim}T23:59:59`)
            .order("fechada_em", { ascending: false });
        } else if (statusFiltro === "cancelada") {
          queryComandas = queryComandas
            .gte("cancelada_em", `${dataInicio}T00:00:00`)
            .lte("cancelada_em", `${dataFim}T23:59:59`)
            .order("cancelada_em", { ascending: false });
        } else {
          queryComandas = queryComandas.order("fechada_em", { ascending: false });
        }

        const { data: comandasData, error: comandasError } = await queryComandas;

        if (comandasError) {
          console.error(comandasError);
          setErroTela("Erro ao carregar comandas do relatório.");
          return;
        }

        const listaComandas = (comandasData as ComandaRow[]) || [];
        setComandas(listaComandas);

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
    [supabase, idSalao, statusFiltro, dataInicio, dataFim]
  );

  const init = useCallback(async () => {
    try {
      setLoading(true);
      setErroTela("");
      setMsg("");
      setSemPermissao(false);

      const usuario = await getUsuarioLogado();

      if (!usuario?.idSalao) {
        setErroTela("Não foi possível identificar o salão do usuário.");
        return;
      }

      const nivelUsuario = usuario?.perfil?.nivel as UserNivel | undefined;

      if (!hasPermission(nivelUsuario, "relatorios_ver")) {
        setSemPermissao(true);
        return;
      }

      setIdSalao(usuario.idSalao);
      await carregarRelatorio(usuario.idSalao);
    } catch (error: unknown) {
      console.error(error);
      setErroTela(
        error instanceof Error ? error.message : "Erro ao carregar relatório financeiro."
      );
    } finally {
      setLoading(false);
    }
  }, [carregarRelatorio]);

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
        <div className="rounded-[32px] border border-zinc-200 bg-white p-6 text-zinc-950 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="mt-2 text-3xl font-bold">Relatório Financeiro</h1>
              <p className="mt-2 text-sm text-zinc-500">
                Acompanhe faturamento, recebimentos, taxas da maquininha, comissões e vendas do salão.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Vendas fechadas
              </div>
              <div className="mt-1 text-2xl font-bold">{resumo.quantidadeVendas}</div>
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

        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
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

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <KpiCard
            icon={<BadgeDollarSign size={18} />}
            label="Faturamento bruto"
            value={formatCurrency(resumo.faturamentoBruto)}
          />
          <KpiCard
            icon={<Receipt size={18} />}
            label="Faturamento líquido"
            value={formatCurrency(resumo.faturamentoLiquido)}
            helper={`Ticket médio: ${formatCurrency(resumo.ticketMedio)}`}
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

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
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
            value={formatCurrency(resumo.canceladas)}
          />
          <KpiCard
            icon={<Receipt size={18} />}
            label="Quantidade de vendas"
            value={String(resumo.quantidadeVendas)}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-5 py-4">
              <div className="text-lg font-bold text-zinc-900">Vendas do período</div>
              <div className="mt-1 text-sm text-zinc-500">
                Lista de comandas conforme os filtros atuais.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-5 py-3">Comanda</th>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Data</th>
                    <th className="px-5 py-3">Subtotal</th>
                    <th className="px-5 py-3">Desconto</th>
                    <th className="px-5 py-3">Acréscimo</th>
                    <th className="px-5 py-3">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {comandasFiltradas.map((item) => (
                    <tr key={item.id} className="border-b border-zinc-100 last:border-b-0">
                      <td className="px-5 py-4 font-semibold text-zinc-900">#{item.numero}</td>
                      <td className="px-5 py-4 text-sm text-zinc-700">
                        {getJoinedName(item.clientes, "Sem cliente")}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusBadgeClass(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-700">
                        {formatDateTime(item.fechada_em || item.cancelada_em || item.aberta_em)}
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-700">
                        {formatCurrency(item.subtotal)}
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-700">
                        {formatCurrency(item.desconto)}
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-700">
                        {formatCurrency(item.acrescimo)}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-zinc-900">
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
            <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
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
                        {item.qtd} pagamento(s) • Taxa: {formatCurrency(item.taxa)}
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

            <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 px-5 py-4">
                <div className="text-lg font-bold text-zinc-900">Comissões do período</div>
                <div className="mt-1 text-sm text-zinc-500">
                  Resumo das comissões ligadas às vendas filtradas.
                </div>
              </div>

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
                    {comissoesFiltradas.slice(0, 20).map((item) => (
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
