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
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/lib/auth/permissions";
import { getErrorMessage } from "@/lib/get-error-message";
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

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<
    "todos" | "ativo" | "inativo"
  >("todos");
  const [idSalao, setIdSalao] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto | null>(
    null
  );
  const [permissoes, setPermissoes] = useState<Permissoes | null>(null);
  const [nivel, setNivel] = useState("");
  const [acessoCarregado, setAcessoCarregado] = useState(false);

  const podeGerenciar = nivel === "admin" || nivel === "gerente";

  const carregarAcesso = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login?motivo=sessao_expirada");
      return null;
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from("usuarios")
      .select("id, id_salao, nivel, status")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (usuarioError || !usuario?.id || !usuario?.id_salao) {
      setErro("Nao foi possivel validar o usuario do sistema.");
      return null;
    }

    if (usuario.status && usuario.status !== "ativo") {
      setErro("Usuario inativo. Fale com a administracao do salao.");
      return null;
    }

    const { data: permissoesDb } = await supabase
      .from("usuarios_permissoes")
      .select("agenda_criar, agenda_editar, agenda_excluir, agenda_ver, caixa_fechar, caixa_operar, caixa_ver, clientes_criar, clientes_editar, clientes_excluir, clientes_ver, comandas_criar, comandas_editar, comandas_excluir, comandas_ver, comissoes_pagar, comissoes_ver, configuracoes_editar, configuracoes_ver, estoque_movimentar, estoque_ver, id, id_salao, id_usuario, produtos_criar, produtos_editar, produtos_excluir, produtos_ver, profissionais_criar, profissionais_editar, profissionais_excluir, profissionais_ver, relatorios_ver, servicos_criar, servicos_editar, servicos_excluir, servicos_ver, vendas_excluir, vendas_reabrir, vendas_ver")
      .eq("id_usuario", usuario.id)
      .eq("id_salao", usuario.id_salao)
      .maybeSingle();

    const permissoesFinal: Permissoes = {
      ...buildPermissoesByNivel(usuario.nivel),
      ...sanitizePermissoesDb(permissoesDb as Record<string, unknown> | null),
    };

    setPermissoes(permissoesFinal);
    setNivel(String(usuario.nivel || "").toLowerCase());
    setIdSalao(usuario.id_salao);
    setAcessoCarregado(true);

    if (!permissoesFinal.produtos_ver) {
      router.replace("/dashboard?motivo=sem_permissao");
      return null;
    }

    return {
      idSalao: usuario.id_salao,
      nivel: String(usuario.nivel || "").toLowerCase(),
      permissoes: permissoesFinal,
    };
  }, [router, supabase]);

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");
      setMsg("");

      const acesso = await carregarAcesso();
      if (!acesso) return;

      const usuarioLogado = await getUsuarioLogado();
      const salaoIdFinal = usuarioLogado?.idSalao || acesso.idSalao;

      setIdSalao(salaoIdFinal);

      const { data, error } = await supabase
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
          ].join(", ")
        )
        .eq("id_salao", salaoIdFinal)
        .order("nome", { ascending: true });

      if (error) throw error;

      setProdutos(((data ?? []) as unknown as Produto[]) || []);
    } catch (e: unknown) {
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao carregar produtos."));
    } finally {
      setLoading(false);
    }
  }, [carregarAcesso, supabase]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

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
      setErro("Voce nao tem permissao para alterar status de produtos.");
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
      setErro("Voce nao tem permissao para excluir produtos.");
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
      setMsg("Produto excluido com sucesso.");
    } catch (e: unknown) {
      console.error(e);
      setErro(getErrorMessage(e, "Erro ao excluir produto."));
    } finally {
      setSavingId(null);
    }
  }

  const listaFiltrada = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return produtos.filter((item) => {
      const ativoAtual = item.ativo ?? item.status === "ativo";

      const bateBusca =
        !termo ||
        item.nome?.toLowerCase().includes(termo) ||
        item.marca?.toLowerCase().includes(termo) ||
        item.linha?.toLowerCase().includes(termo) ||
        item.categoria?.toLowerCase().includes(termo) ||
        item.destinacao?.toLowerCase().includes(termo);

      const bateStatus =
        statusFiltro === "todos" ||
        (statusFiltro === "ativo" && ativoAtual) ||
        (statusFiltro === "inativo" && !ativoAtual);

      return bateBusca && bateStatus;
    });
  }, [produtos, busca, statusFiltro]);

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
        message="Aguarde enquanto sincronizamos catalogo, margem, preco e situacao do estoque."
        fullHeight={false}
      />
    );
  }

  if (permissoes && !permissoes.produtos_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Voce nao tem permissao para acessar Produtos.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 text-zinc-950 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Estoque e revenda
              </div>
              <h1 className="mt-2 text-2xl font-bold md:text-3xl">Produtos</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                O cadastro de produto precisa responder tres perguntas rapido:
                quanto custa, quanto vende e se o estoque esta ficando perigoso.
              </p>
            </div>

            {podeGerenciar ? (
              <Link
                href="/produtos/novo"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Novo produto
              </Link>
            ) : null}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard
            title="Catalogo ativo"
            value={`${resumo.ativos}`}
            description={`${resumo.total} produtos no filtro atual`}
            icon={Boxes}
          />
          <ResumoCard
            title="Baixo estoque"
            value={`${resumo.baixoEstoque}`}
            description="Itens que ja pedem reposicao ou revisao"
            icon={AlertTriangle}
          />
          <ResumoCard
            title="Preco medio"
            value={formatCurrency(resumo.ticketMedio)}
            description="Media de venda do catalogo filtrado"
            icon={Wallet}
          />
          <ResumoCard
            title="Margem media"
            value={`${resumo.margemMedia.toFixed(1)}%`}
            description="Leitura rapida entre custo real e venda"
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <GuideCard
            title="Custo antes de cadastro"
            text="Nao vale cadastrar so nome e preco. Custo real e o que protege sua margem na hora de revender."
          />
          <GuideCard
            title="Estoque com leitura util"
            text="Quantidade atual sozinha nao basta. O minimo ajuda a enxergar risco antes de faltar produto no atendimento."
          />
          <GuideCard
            title="Exclusao com trava"
            text="Produto com historico de estoque, uso em comanda ou consumo em servico agora pede inativacao em vez de sumir do mapa."
          />
        </div>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_220px_220px]">
            <input
              type="text"
              placeholder="Buscar por nome, marca, linha, categoria ou destinacao"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
            />

            <select
              value={statusFiltro}
              onChange={(e) =>
                setStatusFiltro(e.target.value as "todos" | "ativo" | "inativo")
              }
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Apenas ativos</option>
              <option value="inativo">Apenas inativos</option>
            </select>

            <div className="flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              Itens visiveis:
              <strong className="ml-2 text-zinc-900">{listaFiltrada.length}</strong>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {listaFiltrada.length === 0 ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
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
                  className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-zinc-950">
                          {item.nome}
                        </h2>
                        <StatusBadge ativo={ativo} />
                        {baixoEstoque ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Baixo estoque
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm text-zinc-500">
                        {[item.marca, item.linha].filter(Boolean).join(" • ") ||
                          "Sem marca ou linha informada"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                        <TagHint>{item.categoria || "Sem categoria"}</TagHint>
                        <TagHint>{item.destinacao || "Sem destinacao"}</TagHint>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <MetricBlock
                          label="Custo real"
                          value={formatCurrency(item.custo_real)}
                          detail="Base para ler margem e recompra"
                        />
                        <MetricBlock
                          label="Preco de venda"
                          value={formatCurrency(item.preco_venda)}
                          detail="Valor base para revenda ao cliente"
                        />
                        <MetricBlock
                          label="Margem estimada"
                          value={`${margem.toFixed(1)}%`}
                          detail={
                            margem <= 0
                              ? "A venda esta sem sobra clara"
                              : "Leitura rapida entre custo e venda"
                          }
                        />
                        <MetricBlock
                          label="Estoque"
                          value={`${formatQuantity(estoqueAtual)} un`}
                          detail={`Minimo esperado: ${formatQuantity(
                            estoqueMinimo
                          )} un`}
                          tone={baixoEstoque ? "warning" : "neutral"}
                        />
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 xl:w-52">
                      <Link
                        href={`/produtos/${item.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                      >
                        Editar produto
                      </Link>

                      <Link
                        href={`/produtos/${item.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                      >
                        Ver detalhe
                      </Link>

                      {podeGerenciar ? (
                        <>
                          <button
                            type="button"
                            onClick={() => alternarStatus(item)}
                            disabled={savingId === item.id}
                            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                          >
                            {ativo ? "Inativar" : "Ativar"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setProdutoParaExcluir(item)}
                            disabled={savingId === item.id}
                            className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                          >
                            Excluir
                          </button>
                        </>
                      ) : (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium text-zinc-500">
                          Somente leitura para seu perfil.
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
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
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            {title}
          </div>
          <div className="mt-2 text-2xl font-semibold text-zinc-950">{value}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{description}</p>
    </div>
  );
}

function GuideCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-700">{text}</p>
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
      className={`rounded-2xl border px-4 py-3 ${
        tone === "warning"
          ? "border-amber-200 bg-amber-50"
          : "border-zinc-200 bg-zinc-50"
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-zinc-950">{value}</div>
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
