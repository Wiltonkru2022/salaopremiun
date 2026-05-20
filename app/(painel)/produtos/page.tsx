"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpDown,
  Boxes,
  Wallet,
} from "lucide-react";
import AppLoading from "@/components/ui/AppLoading";
import AppModal from "@/components/ui/AppModal";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import PaginationControls from "@/components/ui/PaginationControls";
import { usePainelSession } from "@/components/layout/PainelSessionProvider";
import { usePlanoAccessSnapshot } from "@/components/plans/usePlanoAccessSnapshot";
import { getErrorMessage } from "@/lib/get-error-message";
import { getPlanoMinimoParaRecurso } from "@/lib/plans/catalog";
import { getAssinaturaUrl } from "@/lib/site-urls";
import { createClient } from "@/lib/supabase/client";
import type {
  ProdutoProcessarErrorResponse,
  ProdutoProcessarResponse,
} from "@/types/produtos";

type Produto = {
  id: string;
  nome: string;
  marca?: string | null;
  linha?: string | null;
  categoria?: string | null;
  destinacao?: string | null;
  preco_venda?: number | null;
  custo_real?: number | null;
  estoque_atual?: number | null;
  estoque_minimo?: number | null;
  status?: string | null;
  ativo?: boolean | null;
};

type Permissoes = Record<string, boolean>;
const PRODUTOS_PAGE_SIZE = 10;

function formatCurrency(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatQuantity(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getMargemPercentual(produto: Produto) {
  const custo = Number(produto.custo_real || 0);
  const venda = Number(produto.preco_venda || 0);
  if (venda <= 0) return 0;
  return Number((((venda - custo) / venda) * 100).toFixed(1));
}

export default function ProdutosPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { snapshot: painelSession } = usePainelSession();
  const { planoAccess } = usePlanoAccessSnapshot(true);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<
    "todos" | "ativo" | "inativo"
  >("todos");
  const [idSalao, setIdSalao] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosPage, setProdutosPage] = useState(0);
  const [produtosHasMore, setProdutosHasMore] = useState(false);
  const [produtosTotal, setProdutosTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto | null>(
    null
  );
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [permissoes, setPermissoes] = useState<Permissoes | null>(null);
  const [nivel, setNivel] = useState("");
  const [acessoCarregado, setAcessoCarregado] = useState(false);

  const podeGerenciar = nivel === "admin" || nivel === "gerente";
  const estoqueLiberado = planoAccess?.recursos?.estoque !== false;
  const estoqueUpgradeTarget = getPlanoMinimoParaRecurso("estoque");

  const carregarAcesso = useCallback(async () => {
    if (!painelSession?.idSalao || !painelSession?.permissoes) {
      router.replace("/login?motivo=sessao_expirada");
      return null;
    }
    const permissoesFinal = painelSession.permissoes as Permissoes;
    const nivelAtual = String(painelSession.nivel || "").toLowerCase();

    setPermissoes(permissoesFinal);
    setNivel(nivelAtual);
    setIdSalao(painelSession.idSalao);
    setAcessoCarregado(true);

    if (!permissoesFinal.produtos_ver) {
      router.replace("/dashboard?motivo=sem_permissao");
      return null;
    }

    if (painelSession.planoRecursos?.produtos === false) {
      router.replace("/meu-plano?motivo=recurso_produtos_bloqueado");
      return null;
    }

    return {
      idSalao: painelSession.idSalao,
      nivel: nivelAtual,
      permissoes: permissoesFinal,
    };
  }, [painelSession, router]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setBuscaAplicada(busca.trim());
    }, 300);

    return () => window.clearTimeout(handle);
  }, [busca]);

  const carregarProdutos = useCallback(
    async (salaoId: string, page = 0, append = false) => {
      const from = page * PRODUTOS_PAGE_SIZE;
      const to = from + PRODUTOS_PAGE_SIZE - 1;

      let query = supabase
        .from("produtos")
        .select(
          [
            "id",
            "nome",
            "marca",
            "linha",
            "categoria",
            "destinacao",
            "preco_venda",
            "custo_real",
            "estoque_atual",
            "estoque_minimo",
            "status",
            "ativo",
          ].join(", "),
          { count: "exact" }
        )
        .eq("id_salao", salaoId)
        .order("nome", { ascending: true });

      if (statusFiltro !== "todos") {
        query = query.eq("status", statusFiltro);
      }

      if (buscaAplicada) {
        query = query.or(
          [
            `nome.ilike.%${buscaAplicada}%`,
            `marca.ilike.%${buscaAplicada}%`,
            `linha.ilike.%${buscaAplicada}%`,
            `categoria.ilike.%${buscaAplicada}%`,
            `destinacao.ilike.%${buscaAplicada}%`,
          ].join(",")
        );
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      const rows = ((data ?? []) as unknown as Produto[]) || [];
      setProdutos((prev) => (append ? [...prev, ...rows] : rows));
      setProdutosPage(page);
      setProdutosTotal(count ?? (append ? from + rows.length : rows.length));
      setProdutosHasMore((count ?? 0) > to + 1);
    },
    [supabase, statusFiltro, buscaAplicada]
  );

  const bootstrap = useCallback(async () => {
    const shouldShowInitialLoading = !acessoCarregado || !idSalao;

    try {
      if (shouldShowInitialLoading) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setErro("");
      setMsg("");

      const acesso = await carregarAcesso();
      if (!acesso) return;

      setIdSalao(acesso.idSalao);
      await carregarProdutos(acesso.idSalao, 0, false);
    } catch (e: unknown) {
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao carregar produtos."));
    } finally {
      if (shouldShowInitialLoading) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [acessoCarregado, carregarAcesso, carregarProdutos, idSalao]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  async function mudarPaginaProdutos(page: number) {
    if (!idSalao || loadingMore || page < 0) return;

    try {
      setLoadingMore(true);
      setErro("");
      await carregarProdutos(idSalao, page, false);
    } catch (e: unknown) {
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao carregar produtos."));
    } finally {
      setLoadingMore(false);
    }
  }

  async function processarProduto(params: {
    acao: "salvar" | "alterar_status" | "excluir";
    produto: Record<string, unknown>;
  }) {
    const response = await fetch("/api/produtos/processar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idSalao,
        acao: params.acao,
        produto: params.produto,
      }),
    });

    const result = (await response.json().catch(() => ({}))) as Partial<
      ProdutoProcessarResponse
    > &
      ProdutoProcessarErrorResponse;

    if (!response.ok) {
      throw new Error(result.error || "Erro ao processar produto.");
    }

    return result as ProdutoProcessarResponse;
  }

  async function alternarStatus(produto: Produto) {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para alterar status de produtos.");
      return;
    }

    try {
      setSavingId(produto.id);
      setErro("");
      setMsg("");

      const novoAtivo = !(produto.ativo ?? produto.status === "ativo");
      const novoStatus = novoAtivo ? "ativo" : "inativo";

      await processarProduto({
        acao: "alterar_status",
        produto: {
          id: produto.id,
          ativo: novoAtivo,
        },
      });

      setProdutos((prev) =>
        prev.map((item) =>
          item.id === produto.id
            ? { ...item, ativo: novoAtivo, status: novoStatus }
            : item
        )
      );

      setMsg(`Produto ${novoAtivo ? "ativado" : "inativado"} com sucesso.`);
    } catch (e: unknown) {
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao alterar status do produto."));
    } finally {
      setSavingId(null);
    }
  }

  async function excluirProduto(id: string) {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para excluir produtos.");
      return;
    }

    try {
      setSavingId(id);
      setErro("");
      setMsg("");

      await processarProduto({
        acao: "excluir",
        produto: { id },
      });

      setProdutos((prev) => prev.filter((item) => item.id !== id));
      setProdutoParaExcluir(null);
      setMsg("Produto excluído com sucesso.");
    } catch (e: unknown) {
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao excluir produto."));
    } finally {
      setSavingId(null);
    }
  }

  const listaFiltrada = useMemo(() => produtos, [produtos]);

  const resumo = useMemo(() => {
    const ativos = listaFiltrada.filter(
      (item) => item.ativo ?? item.status === "ativo"
    );
    const baixoEstoque = listaFiltrada.filter(
      (item) =>
        Number(item.estoque_atual ?? 0) <= Number(item.estoque_minimo ?? 0)
    );
    const ticketMedio =
      listaFiltrada.length > 0
        ? listaFiltrada.reduce(
            (acc, item) => acc + Number(item.preco_venda || 0),
            0
          ) / listaFiltrada.length
        : 0;
    const margemMedia =
      listaFiltrada.length > 0
        ? listaFiltrada.reduce((acc, item) => acc + getMargemPercentual(item), 0) /
          listaFiltrada.length
        : 0;

    return {
      total: listaFiltrada.length,
      ativos: ativos.length,
      baixoEstoque: baixoEstoque.length,
      ticketMedio,
      margemMedia,
    };
  }, [listaFiltrada]);

  if (loading || !acessoCarregado) {
    return (
      <AppLoading
        title="Carregando produtos"
        message="Aguarde enquanto sincronizamos catálogo, margem, preço e situação do estoque."
        fullHeight={false}
      />
    );
  }

  if (permissoes && !permissoes.produtos_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Você não tem permissão para acessar Produtos.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-[24px] border border-zinc-200 bg-white p-4 text-zinc-950 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                {estoqueLiberado ? "Estoque e revenda" : "Revenda e margem"}
              </div>
              <h1 className="mt-2 text-2xl font-bold md:text-3xl">Produtos</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                {estoqueLiberado
                  ? "O cadastro de produto precisa responder três perguntas rápido: quanto custa, quanto vende e se o estoque está ficando perigoso."
                  : "O cadastro de produto segue liberado para revenda, custo e margem. O controle de estoque entra quando o salão sobe para Pro ou Premium."}
              </p>
            </div>

            {podeGerenciar ? (
              <Link
                href="/produtos/novo"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Novo produto
              </Link>
            ) : null}
          </div>
        </section>

        {!estoqueLiberado ? (
          <section className="rounded-[22px] border border-sky-200 bg-sky-50 p-3.5 text-sm text-sky-900 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-bold">Estoque bloqueado no plano atual</div>
                <p className="mt-1 leading-6 text-sky-800">
                  Seus produtos continuam prontos para cadastro, preço e custo. A leitura de baixo estoque, movimentações e reposição libera no Pro ou Premium.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/comparar-planos"
                  className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-white px-4 py-2 font-bold text-sky-900 transition hover:bg-sky-100"
                >
                  Comparar planos
                </Link>
                <Link
                  href={getAssinaturaUrl(`/assinatura?plano=${estoqueUpgradeTarget}`)}
                  className="inline-flex items-center justify-center rounded-full bg-sky-900 px-4 py-2 font-bold text-white transition hover:opacity-95"
                >
                  Fazer upgrade
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <div
          className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${estoqueLiberado ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}
        >
          <ResumoCard
            title="Catálogo ativo"
            value={`${resumo.ativos}`}
            description={`${resumo.total} produtos no filtro atual`}
            icon={Boxes}
          />
          {estoqueLiberado ? (
            <ResumoCard
              title="Baixo estoque"
              value={`${resumo.baixoEstoque}`}
              description="Itens que já pedem reposicao ou revisao"
              icon={AlertTriangle}
            />
          ) : null}
          <ResumoCard
            title="Preço medio"
            value={formatCurrency(resumo.ticketMedio)}
            description="Media de venda do catálogo filtrado"
            icon={Wallet}
          />
          <ResumoCard
            title="Margem media"
            value={`${resumo.margemMedia.toFixed(1)}%`}
            description="Leitura rápida entre custo real e venda"
            icon={ArrowUpDown}
          />
        </div>

        {erro ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        ) : null}

        {msg ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {msg}
          </div>
        ) : null}

        <div
          className={`grid grid-cols-1 gap-3 ${estoqueLiberado ? "md:grid-cols-3" : "md:grid-cols-2"}`}
        >
          <GuideCard
            title="Custo antes de cadastro"
            text="Não vale cadastrar só nome e preço. Custo real é o que protege sua margem na hora de revender."
          />
          {estoqueLiberado ? (
            <GuideCard
              title="Estoque com leitura util"
              text="Quantidade atual sozinha não basta. O mínimo ajuda a enxergar risco antes de faltar produto no atendimento."
            />
          ) : null}
          <GuideCard
            title="Exclusao com trava"
            text="Produto com histórico de estoque, uso em comanda ou consumo em serviço agora pede inativacao em vez de sumir do mapa."
          />
        </div>

        <section className="rounded-[22px] border border-zinc-200 bg-white p-3.5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_220px_220px]">
            <input
              type="text"
              placeholder="Buscar por nome, marca, linha, categoria ou destinacao"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-zinc-900"
            />

            <select
              value={statusFiltro}
              onChange={(e) =>
                setStatusFiltro(e.target.value as "todos" | "ativo" | "inativo")
              }
              className="w-full rounded-2xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-zinc-900"
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Apenas ativos</option>
              <option value="inativo">Apenas inativos</option>
            </select>

            <div className="flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-600">
              Itens visiveis:
              <strong className="ml-2 text-zinc-900">{produtosTotal || listaFiltrada.length}</strong>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {listaFiltrada.length === 0 ? (
            <div className="rounded-[22px] border border-zinc-200 bg-white p-5 text-sm text-zinc-600 shadow-sm">
              Nenhum produto encontrado com esse filtro.
            </div>
          ) : (
            listaFiltrada.map((item) => {
              const ativo = item.ativo ?? item.status === "ativo";
              const estoqueAtual = Number(item.estoque_atual ?? 0);
              const estoqueMinimo = Number(item.estoque_minimo ?? 0);
              const baixoEstoque = estoqueAtual <= estoqueMinimo;
              const margem = getMargemPercentual(item);

              return (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setProdutoSelecionado(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setProdutoSelecionado(item);
                    }
                  }}
                  className="cursor-pointer rounded-[22px] border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 focus:border-zinc-400 focus:outline-none"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[1rem] font-semibold text-zinc-950">
                          {item.nome}
                        </h2>
                        <StatusBadge ativo={ativo} />
                        {estoqueLiberado && baixoEstoque ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Baixo estoque
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm text-zinc-500">
                        {[item.marca, item.linha].filter(Boolean).join(" • ") ||
                          "Sem marca ou linha informada"}
                      </p>

                      <div className="hidden flex-wrap gap-2 text-xs text-zinc-500">
                        <TagHint>{item.categoria || "Sem categoria"}</TagHint>
                        <TagHint>{item.destinacao || "Sem destinação"}</TagHint>
                      </div>

                      <div
                        className={`hidden grid-cols-1 gap-2.5 md:grid-cols-2 ${estoqueLiberado ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}
                      >
                        <MetricBlock
                          label="Custo real"
                          value={formatCurrency(item.custo_real)}
                          detail="Base para ler margem e recompra"
                        />
                        <MetricBlock
                          label="Preço de venda"
                          value={formatCurrency(item.preco_venda)}
                          detail="Valor base para revenda ao cliente"
                        />
                        <MetricBlock
                          label="Margem estimada"
                          value={`${margem.toFixed(1)}%`}
                          detail={
                            margem <= 0
                              ? "A venda está sem sobra clara"
                              : "Leitura rápida entre custo e venda"
                          }
                        />
                        {estoqueLiberado ? (
                          <MetricBlock
                            label="Estoque"
                            value={`${formatQuantity(estoqueAtual)} un`}
                            detail={`Minimo esperado: ${formatQuantity(
                              estoqueMinimo
                            )} un`}
                            tone={baixoEstoque ? "warning" : "neutral"}
                          />
                        ) : null}
                      </div>
                    </div>

                    <div className="hidden shrink-0 flex-col gap-2 xl:w-48">
                      <Link
                        href={`/produtos/${item.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                      >
                        Editar produto
                      </Link>

                      <Link
                        href={`/produtos/${item.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                      >
                        Ver detalhe
                      </Link>

                      {podeGerenciar ? (
                        <>
                          <button
                            type="button"
                            onClick={() => alternarStatus(item)}
                            disabled={savingId === item.id}
                            className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                          >
                            {ativo ? "Inativar" : "Ativar"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setProdutoParaExcluir(item)}
                            disabled={savingId === item.id}
                            className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                          >
                            Excluir
                          </button>
                        </>
                      ) : (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-medium text-zinc-500">
                          Somente leitura para seu perfil.
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
          <PaginationControls
            currentPage={produtosPage}
            pageSize={PRODUTOS_PAGE_SIZE}
            totalItems={produtosTotal}
            hasMore={produtosHasMore}
            onPageChange={(page) => void mudarPaginaProdutos(page)}
            className={loadingMore ? "opacity-60" : ""}
          />
        </section>
      </div>

      <ConfirmActionModal
        open={Boolean(produtoParaExcluir)}
        title="Excluir produto"
        description={`Confirme a exclusao de ${
          produtoParaExcluir?.nome || "este produto"
        }.`}
        confirmLabel="Excluir produto"
        tone="danger"
        loading={Boolean(produtoParaExcluir && savingId === produtoParaExcluir.id)}
        onClose={() => {
          if (!savingId) setProdutoParaExcluir(null);
        }}
        onConfirm={() => {
          if (produtoParaExcluir) void excluirProduto(produtoParaExcluir.id);
        }}
      />

      <AppModal
        open={Boolean(produtoSelecionado)}
        onClose={() => setProdutoSelecionado(null)}
        title={produtoSelecionado?.nome || "Produto"}
        description="Estoque, custo, margem e movimentações do produto."
        maxWidthClassName="max-w-5xl"
        footer={
          produtoSelecionado ? (
            <>
              <button
                type="button"
                onClick={() => setProdutoSelecionado(null)}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Fechar
              </button>
              {estoqueLiberado ? (
                <Link
                  href="/estoque/movimentar"
                  className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                >
                  Movimentar estoque
                </Link>
              ) : null}
              {podeGerenciar ? (
                <>
                  <button
                    type="button"
                    onClick={() => void alternarStatus(produtoSelecionado)}
                    disabled={savingId === produtoSelecionado.id}
                    className="rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                  >
                    {(produtoSelecionado.ativo ?? produtoSelecionado.status === "ativo") ? "Inativar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setProdutoParaExcluir(produtoSelecionado)}
                    disabled={savingId === produtoSelecionado.id}
                    className="rounded-2xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                  >
                    Excluir
                  </button>
                </>
              ) : null}
              <Link
                href={`/produtos/${produtoSelecionado.id}`}
                className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Abrir produto
              </Link>
            </>
          ) : null
        }
      >
        {produtoSelecionado ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricBlock label="Custo real" value={formatCurrency(produtoSelecionado.custo_real)} detail="Base para ler margem e recompra" />
            <MetricBlock label="Preço de venda" value={formatCurrency(produtoSelecionado.preco_venda)} detail="Valor base para revenda" />
            <MetricBlock label="Margem estimada" value={`${getMargemPercentual(produtoSelecionado).toFixed(1)}%`} detail="Diferença entre custo e venda" />
            <MetricBlock
              label="Estoque"
              value={`${formatQuantity(produtoSelecionado.estoque_atual)} un`}
              detail={`Mínimo esperado: ${formatQuantity(produtoSelecionado.estoque_minimo)} un`}
              tone={Number(produtoSelecionado.estoque_atual ?? 0) <= Number(produtoSelecionado.estoque_minimo ?? 0) ? "warning" : "neutral"}
            />
          </div>
        ) : null}
      </AppModal>
    </div>
  );
}

function ResumoCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Boxes;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            {title}
          </div>
          <div className="mt-1.5 text-xl font-semibold text-zinc-950">{value}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-1.5 text-zinc-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-sm leading-5 text-zinc-600">{description}</p>
    </div>
  );
}

function GuideCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
        {title}
      </div>
      <p className="mt-1.5 text-sm leading-5 text-zinc-700">{text}</p>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div
      className={`rounded-2xl border px-3.5 py-2.5 ${
        tone === "warning"
          ? "border-amber-200 bg-amber-50"
          : "border-zinc-200 bg-zinc-50"
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </div>
      <div className="mt-1.5 text-[15px] font-semibold text-zinc-950">{value}</div>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
    </div>
  );
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        ativo ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"
      }`}
    >
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

function TagHint({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1">
      {children}
    </span>
  );
}
