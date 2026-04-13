"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUsuarioLogado } from "@/lib/auth/getUsuarioLogado";

type ProdutoEstoque = {
  id: string;
  nome: string;
  marca?: string | null;
  linha?: string | null;
  categoria?: string | null;
  unidade_medida?: string | null;
  estoque_atual?: number | null;
  estoque_minimo?: number | null;
  estoque_maximo?: number | null;
  data_validade?: string | null;
  lote?: string | null;
  ativo?: boolean | null;
  status?: string | null;
};

type Alerta = {
  id: string;
  id_produto: string;
  tipo: string;
  mensagem: string;
  resolvido: boolean;
};

type Permissoes = Record<string, boolean>;

export default function EstoquePage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [busca, setBusca] = useState("");
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);

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

    const permissoesFinal: Permissoes =
      permissoesDb || {
        dashboard_ver: true,
        agenda_ver: true,
        clientes_ver: true,
        profissionais_ver: true,
        servicos_ver: true,
        produtos_ver: true,
        estoque_ver: true,
        comandas_ver: true,
        vendas_ver: true,
        caixa_ver: true,
        comissoes_ver: true,
        relatorios_ver: true,
        marketing_ver: true,
        configuracoes_ver: usuario.nivel === "admin",
        assinatura_ver: usuario.nivel === "admin",
      };

    setPermissoes(permissoesFinal);
    setNivel(String(usuario.nivel || "").toLowerCase());
    setAcessoCarregado(true);

    if (!permissoesFinal.estoque_ver) {
      router.replace("/dashboard");
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

      const { data: produtosRows, error: produtosError } = await supabase
        .from("produtos")
        .select(`
          id,
          nome,
          marca,
          linha,
          categoria,
          unidade_medida,
          estoque_atual,
          estoque_minimo,
          estoque_maximo,
          data_validade,
          lote,
          ativo,
          status
        `)
        .eq("id_salao", salaoIdFinal)
        .order("nome", { ascending: true });

      if (produtosError) throw produtosError;

      const { data: alertasRows, error: alertasError } = await supabase
        .from("produtos_alertas")
        .select("id, id_produto, tipo, mensagem, resolvido")
        .eq("id_salao", salaoIdFinal)
        .eq("resolvido", false)
        .order("created_at", { ascending: false });

      if (alertasError) throw alertasError;

      setProdutos((produtosRows as ProdutoEstoque[]) || []);
      setAlertas((alertasRows as Alerta[]) || []);
    } catch (e: unknown) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao carregar estoque.");
    } finally {
      setLoading(false);
    }
  }, [carregarAcesso, supabase]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const listaFiltrada = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return produtos.filter((item) => {
      return (
        !termo ||
        item.nome?.toLowerCase().includes(termo) ||
        item.marca?.toLowerCase().includes(termo) ||
        item.linha?.toLowerCase().includes(termo) ||
        item.categoria?.toLowerCase().includes(termo) ||
        item.lote?.toLowerCase().includes(termo)
      );
    });
  }, [produtos, busca]);

  function getStatusEstoque(item: ProdutoEstoque) {
    const atual = Number(item.estoque_atual ?? 0);
    const minimo = Number(item.estoque_minimo ?? 0);

    if (atual <= 0) {
      return { texto: "Sem estoque", className: "bg-red-100 text-red-700" };
    }

    if (atual <= minimo) {
      return { texto: "Baixo estoque", className: "bg-amber-100 text-amber-700" };
    }

    return { texto: "Ok", className: "bg-emerald-100 text-emerald-700" };
  }

  function diasParaVencer(data?: string | null) {
    if (!data) return null;

    const hoje = new Date();
    const validade = new Date(`${data}T00:00:00`);
    const diff = validade.getTime() - hoje.getTime();

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  if (loading || !acessoCarregado) {
    return <div className="p-6 text-sm text-zinc-600">Carregando estoque...</div>;
  }

  if (permissoes && !permissoes.estoque_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Você não tem permissão para acessar Estoque.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 text-white shadow-xl">
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Estoque</h1>
              <p className="mt-2 text-sm text-zinc-300">
                Controle entradas, saídas, validade, lote e alertas do estoque.
              </p>
            </div>

            {podeGerenciar ? (
              <Link
                href="/estoque/movimentar"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-zinc-900 transition hover:bg-zinc-100"
              >
                + Nova movimentação
              </Link>
            ) : null}
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

        {alertas.length > 0 && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-lg font-bold text-amber-800">Alertas de estoque</h2>
            <div className="mt-3 space-y-2">
              {alertas.slice(0, 6).map((alerta) => (
                <div
                  key={alerta.id}
                  className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-amber-800"
                >
                  {alerta.mensagem}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <input
              type="text"
              placeholder="Buscar por nome, marca, linha, categoria ou lote"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900"
            />

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              Produtos: <strong className="ml-2 text-zinc-900">{listaFiltrada.length}</strong>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              Alertas: <strong className="ml-2 text-zinc-900">{alertas.length}</strong>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          {listaFiltrada.length === 0 ? (
            <div className="p-6 text-sm text-zinc-600">Nenhum produto encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Produto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Categoria
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Estoque
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Mínimo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Lote
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Validade
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Situação
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-200 bg-white">
                  {listaFiltrada.map((item) => {
                    const status = getStatusEstoque(item);
                    const dias = diasParaVencer(item.data_validade);

                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-zinc-900">{item.nome}</p>
                            <p className="text-sm text-zinc-500">
                              {[item.marca, item.linha].filter(Boolean).join(" • ") || "Sem marca"}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-700">{item.categoria || "-"}</td>

                        <td className="px-4 py-4 text-sm text-zinc-700">
                          {Number(item.estoque_atual ?? 0).toFixed(2)} {item.unidade_medida || ""}
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-700">
                          {Number(item.estoque_minimo ?? 0).toFixed(2)} {item.unidade_medida || ""}
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-700">{item.lote || "-"}</td>

                        <td className="px-4 py-4 text-sm text-zinc-700">
                          {item.data_validade ? (
                            <div>
                              <div>{item.data_validade}</div>
                              <div className="text-xs text-zinc-500">
                                {dias !== null
                                  ? dias < 0
                                    ? "Vencido"
                                    : `${dias} dia(s)`
                                  : ""}
                              </div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                          >
                            {status.texto}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}