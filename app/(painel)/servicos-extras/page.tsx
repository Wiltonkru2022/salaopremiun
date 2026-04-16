"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";
import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/lib/auth/permissions";

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

function formatCurrency(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function ServicosExtrasPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [busca, setBusca] = useState("");
  const [idSalao, setIdSalao] = useState("");
  const [itens, setItens] = useState<ItemExtra[]>([]);

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
      router.replace("/login");
      return null;
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from("usuarios")
      .select("id, id_salao, nivel, status")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (usuarioError || !usuario?.id || !usuario?.id_salao) {
      setErro("Não foi possível validar o usuário do sistema.");
      return null;
    }

    if (usuario.status && usuario.status !== "ativo") {
      setErro("Usuário inativo.");
      return null;
    }

    const { data: permissoesDb } = await supabase
      .from("usuarios_permissoes")
      .select("*")
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

    if (!permissoesFinal.servicos_ver) {
      router.replace("/dashboard");
      return null;
    }

    return {
      idSalao: usuario.id_salao,
      nivel: String(usuario.nivel || "").toLowerCase(),
      permissoes: permissoesFinal,
    };
  }, [router, supabase]);

  const carregarItens = useCallback(
    async (salaoId: string) => {
      const { data, error } = await supabase
        .from("itens_extras")
        .select(`
          id,
          nome,
          categoria,
          descricao,
          preco_venda,
          custo,
          controla_estoque,
          estoque_atual
        `)
        .eq("id_salao", salaoId)
        .order("nome", { ascending: true });

      if (error) throw error;

      setItens((data as ItemExtra[]) || []);
    },
    [supabase]
  );

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
      await carregarItens(salaoIdFinal);
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

    const confirmar = window.confirm("Deseja realmente excluir este serviço extra?");
    if (!confirmar) return;

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

      setItens((prev) => prev.filter((item) => item.id !== id));
      setMsg("Serviço extra excluído com sucesso.");
    } catch (e: unknown) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao excluir serviço extra.");
    } finally {
      setSavingId(null);
    }
  }

  const listaFiltrada = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return itens.filter((item) => {
      return (
        !termo ||
        item.nome?.toLowerCase().includes(termo) ||
        item.categoria?.toLowerCase().includes(termo) ||
        item.descricao?.toLowerCase().includes(termo)
      );
    });
  }, [itens, busca]);

  if (loading || !acessoCarregado) {
    return <div className="p-6 text-sm text-zinc-600">Carregando extras...</div>;
  }

  if (permissoes && !permissoes.servicos_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Você não tem permissão para acessar Serviços Extras.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-zinc-950 shadow-sm">
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Serviços Extras</h1>
              <p className="mt-2 text-sm text-zinc-500">
                Cadastre extras cobrados à parte, com preço, custo e estoque.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/servicos"
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
              >
                Ver serviços
              </Link>

              {podeGerenciar ? (
                <Link
                  href="/servicos-extras/novo"
                className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95"
                >
                  + Novo extra
                </Link>
              ) : null}
            </div>
          </div>
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

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              type="text"
              placeholder="Buscar por nome, categoria ou descrição"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
            />

            <div className="flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              Total: <strong className="ml-2 text-zinc-900">{listaFiltrada.length}</strong>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          {listaFiltrada.length === 0 ? (
            <div className="p-6 text-sm text-zinc-600">Nenhum serviço extra encontrado.</div>
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
                      Preço
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Custo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Estoque
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-200 bg-white">
                  {listaFiltrada.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-zinc-900">{item.nome}</p>
                        <p className="text-sm text-zinc-500">{item.descricao || "-"}</p>
                      </td>

                      <td className="px-4 py-4 text-sm text-zinc-700">
                        {item.categoria || "-"}
                      </td>

                      <td className="px-4 py-4 text-sm text-zinc-700">
                        {formatCurrency(item.preco_venda)}
                      </td>

                      <td className="px-4 py-4 text-sm text-zinc-700">
                        {formatCurrency(item.custo)}
                      </td>

                      <td className="px-4 py-4 text-sm text-zinc-700">
                        {item.controla_estoque
                          ? Number(item.estoque_atual ?? 0).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : "Não controla"}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          {podeGerenciar ? (
                            <>
                              <Link
                                href={`/servicos-extras/${item.id}`}
                                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                              >
                                Editar
                              </Link>

                              <button
                                type="button"
                                onClick={() => excluirItem(item.id)}
                                disabled={savingId === item.id}
                                className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
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
      </div>
    </div>
  );
}
