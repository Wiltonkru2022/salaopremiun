"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePainelSession } from "@/components/layout/PainelSessionProvider";
import { usePlanoAccessSnapshot } from "@/components/plans/usePlanoAccessSnapshot";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import AppLoading from "@/components/ui/AppLoading";
import PaginationControls from "@/components/ui/PaginationControls";
import { getPlanoMinimoParaRecurso } from "@/lib/plans/catalog";
import { getAssinaturaUrl } from "@/lib/site-urls";
import { createClient } from "@/lib/supabase/client";

type ItemExtra = {
  id: string;
  nome: string;
  categoria?: string | null;
  descricao?: string | null;
  preco_venda?: number | null;
  custo?: number | null;
  controla_estoque?: boolean | null;
  estoque_atual?: number | null;
};

type Permissoes = Record<string, boolean>;

const EXTRAS_PAGE_SIZE = 10;

function formatCurrency(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatQuantidade(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function ServicosExtrasPage() {
  const supabase = createClient();
  const router = useRouter();
  const { snapshot: painelSession } = usePainelSession();
  const { planoAccess } = usePlanoAccessSnapshot(true);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [busca, setBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [totalItens, setTotalItens] = useState(0);
  const [idSalao, setIdSalao] = useState("");
  const [itens, setItens] = useState<ItemExtra[]>([]);
  const [itemParaExcluir, setItemParaExcluir] = useState<string | null>(null);
  const [permissoes, setPermissoes] = useState<Permissoes | null>(null);
  const [nivel, setNivel] = useState("");
  const [acessoCarregado, setAcessoCarregado] = useState(false);

  const podeGerenciar = nivel === "admin" || nivel === "gerente";
  const estoqueLiberado = planoAccess?.recursos?.estoque !== false;
  const estoqueUpgradeTarget = getPlanoMinimoParaRecurso("estoque");

  const carregarAcesso = useCallback(async () => {
    if (!painelSession?.idSalao || !painelSession?.permissoes) {
      router.replace("/login");
      return null;
    }
    const permissoesFinal = painelSession.permissoes as Permissoes;
    const nivelAtual = String(painelSession.nivel || "").toLowerCase();

    setPermissoes(permissoesFinal);
    setNivel(nivelAtual);
    setIdSalao(painelSession.idSalao);
    setAcessoCarregado(true);

    if (!permissoesFinal.servicos_ver) {
      router.replace("/dashboard");
      return null;
    }

    return {
      idSalao: painelSession.idSalao,
      permissoes: permissoesFinal,
    };
  }, [painelSession, router]);

  const carregarItens = useCallback(
    async (salaoId: string) => {
      const termoBusca = busca.trim();
      const from = paginaAtual * EXTRAS_PAGE_SIZE;
      const to = from + EXTRAS_PAGE_SIZE - 1;
      let query = supabase
        .from("itens_extras")
        .select(
          "id, nome, categoria, descricao, preco_venda, custo, controla_estoque, estoque_atual",
          { count: "exact" }
        )
        .eq("id_salao", salaoId)
        .order("nome", { ascending: true });

      if (termoBusca) {
        const filtro = `%${termoBusca.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
        query = query.or(
          [
            `nome.ilike.${filtro}`,
            `categoria.ilike.${filtro}`,
            `descricao.ilike.${filtro}`,
          ].join(",")
        );
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      setItens((data as ItemExtra[]) || []);
      setTotalItens(count || 0);
    },
    [busca, paginaAtual, supabase]
  );

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");
      setMsg("");

      const acesso = await carregarAcesso();
      if (!acesso) return;

      setIdSalao(acesso.idSalao);
      await carregarItens(acesso.idSalao);
    } catch (e: unknown) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao carregar itens extras.");
    } finally {
      setLoading(false);
    }
  }, [carregarAcesso, carregarItens]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  async function excluirItem(id: string) {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para excluir serviços extras.");
      return;
    }

    try {
      setSavingId(id);
      setErro("");
      setMsg("");

      const { error } = await supabase
        .from("itens_extras")
        .delete()
        .eq("id", id)
        .eq("id_salao", idSalao);

      if (error) throw error;

      await carregarItens(idSalao);
      setMsg("Serviço extra excluído com sucesso.");
    } catch (e: unknown) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao excluir serviço extra.");
    } finally {
      setSavingId(null);
    }
  }

  const listaFiltrada = useMemo(() => itens, [itens]);

  if (loading || !acessoCarregado) {
    return (
      <AppLoading
        title="Carregando serviços extras"
        message="Aguarde enquanto montamos o catálogo de extras, custos e disponibilidade."
        fullHeight={false}
      />
    );
  }

  if (permissoes && !permissoes.servicos_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Você não tem permissão para acessar Serviços extras.
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmActionModal
        open={Boolean(itemParaExcluir)}
        title="Excluir serviço extra"
        description="Este serviço extra será removido do catálogo e deixará de aparecer para novas comandas."
        confirmLabel="Excluir extra"
        tone="danger"
        loading={Boolean(savingId)}
        onClose={() => setItemParaExcluir(null)}
        onConfirm={() => {
          const id = itemParaExcluir;
          setItemParaExcluir(null);
          if (id) void excluirItem(id);
        }}
      />

      <div className="bg-white">
        <div className="mx-auto max-w-7xl space-y-4">
          <section className="rounded-[24px] border border-zinc-200 bg-white p-4 text-zinc-950 shadow-sm">
            <div className="mt-1 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">Serviços extras</h1>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {estoqueLiberado
                    ? "Cadastre extras cobrados à parte, com preço, custo e estoque."
                    : "Cadastre extras cobrados à parte, com preço e custo. O controle de estoque libera no Pro ou Premium."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/servicos"
                  className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
                >
                  Ver serviços
                </Link>

                {podeGerenciar ? (
                  <Link
                    href="/servicos-extras/novo"
                    className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-95"
                  >
                    + Novo extra
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          {!estoqueLiberado ? (
            <section className="rounded-[22px] border border-sky-200 bg-sky-50 p-3.5 text-sm text-sky-900 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-bold">Controle de estoque bloqueado no plano atual</div>
                  <p className="mt-1 leading-6 text-sky-800">
                    Os extras continuam liberados para venda, preço e custo. O acompanhamento de saldo e consumo de estoque entra quando o salão sobe para Pro ou Premium.
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

          <div className="rounded-[22px] border border-zinc-200 bg-white p-3.5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Buscar por nome, categoria ou descrição"
                value={busca}
                onChange={(e) => {
                  setPaginaAtual(0);
                  setBusca(e.target.value);
                }}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-zinc-900"
              />

              <div className="flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-600">
                Total: <strong className="ml-2 text-zinc-900">{totalItens}</strong>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[22px] border border-zinc-200 bg-white shadow-sm">
            {listaFiltrada.length === 0 ? (
              <div className="p-5 text-sm text-zinc-600">
                Nenhum serviço extra encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                        Categoria
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                        Preco
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                        Custo
                      </th>
                      {estoqueLiberado ? (
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                          Estoque
                        </th>
                      ) : null}
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600">
                        Acoes
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-200 bg-white">
                    {listaFiltrada.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-zinc-900">{item.nome}</p>
                          <p className="text-sm text-zinc-500">{item.descricao || "-"}</p>
                        </td>

                        <td className="px-4 py-3.5 text-sm text-zinc-700">
                          {item.categoria || "-"}
                        </td>

                        <td className="px-4 py-3.5 text-sm text-zinc-700">
                          {formatCurrency(item.preco_venda)}
                        </td>

                        <td className="px-4 py-3.5 text-sm text-zinc-700">
                          {formatCurrency(item.custo)}
                        </td>

                        {estoqueLiberado ? (
                          <td className="px-4 py-3.5 text-sm text-zinc-700">
                            {item.controla_estoque
                              ? `${formatQuantidade(item.estoque_atual)} un`
                              : "Não controla"}
                          </td>
                        ) : null}

                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap justify-end gap-2">
                            {podeGerenciar ? (
                              <>
                                <Link
                                  href={`/servicos-extras/${item.id}`}
                                  className="rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                                >
                                  Editar
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => setItemParaExcluir(item.id)}
                                  disabled={savingId === item.id}
                                  className="rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                                >
                                  Excluir
                                </button>
                              </>
                            ) : (
                              <span className="text-xs font-medium text-zinc-400">
                                Somente leitura
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <PaginationControls
            currentPage={paginaAtual}
            pageSize={EXTRAS_PAGE_SIZE}
            totalItems={totalItens}
            onPageChange={setPaginaAtual}
            className="pb-2"
          />
        </div>
      </div>
    </>
  );
}
