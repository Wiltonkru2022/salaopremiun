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
import { ComissaoHelpPanel } from "@/components/comissoes/ComissaoHelpPanel";

type Servico = {
  id: string;
  nome: string;
  categoria?: string | null;
  duracao_minutos?: number | null;
  pausa_minutos?: number | null;
  preco_padrao?: number | null;
  preco_variavel?: boolean | null;
  comissao_percentual_padrao?: number | null;
  status?: string | null;
  ativo?: boolean | null;
};

type Permissoes = Record<string, boolean>;

type ServicoProcessarResponse = {
  ok: boolean;
  idServico?: string | null;
  ativo?: boolean | null;
  status?: string | null;
};

type ServicoProcessarErrorResponse = {
  error?: string;
};

function formatCurrency(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function ServicosPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "ativo" | "inativo">("todos");
  const [idSalao, setIdSalao] = useState("");
  const [servicos, setServicos] = useState<Servico[]>([]);

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
        .from("servicos")
        .select(`
          id,
          nome,
          categoria,
          duracao_minutos,
          pausa_minutos,
          preco_padrao,
          preco_variavel,
          comissao_percentual_padrao,
          status,
          ativo
        `)
        .eq("id_salao", salaoIdFinal)
        .order("nome", { ascending: true });

      if (error) throw error;

      setServicos((data as Servico[]) || []);
    } catch (e: unknown) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao carregar serviços.");
    } finally {
      setLoading(false);
    }
  }, [carregarAcesso, supabase]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  async function processarServico(params: {
    acao: "salvar" | "alterar_status" | "excluir";
    servico: Record<string, unknown>;
  }) {
    const response = await fetch("/api/servicos/processar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idSalao,
        acao: params.acao,
        servico: params.servico,
      }),
    });

    const result = (await response.json().catch(() => ({}))) as Partial<
      ServicoProcessarResponse
    > &
      ServicoProcessarErrorResponse;

    if (!response.ok) {
      throw new Error(result.error || "Erro ao processar servico.");
    }

    return result as ServicoProcessarResponse;
  }

  async function alternarStatus(servico: Servico) {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para alterar status de serviços.");
      return;
    }

    try {
      setSavingId(servico.id);
      setErro("");
      setMsg("");

      const novoAtivo = !(servico.ativo ?? servico.status === "ativo");
      const novoStatus = novoAtivo ? "ativo" : "inativo";

      await processarServico({
        acao: "alterar_status",
        servico: {
          id: servico.id,
          ativo: novoAtivo,
        },
      });

      setServicos((prev) =>
        prev.map((item) =>
          item.id === servico.id
            ? { ...item, ativo: novoAtivo, status: novoStatus }
            : item
        )
      );

      setMsg(`Serviço ${novoAtivo ? "ativado" : "inativado"} com sucesso.`);
    } catch (e: unknown) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao alterar status.");
    } finally {
      setSavingId(null);
    }
  }

  async function excluirServico(id: string) {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para excluir serviços.");
      return;
    }

    const confirmar = window.confirm("Deseja realmente excluir este serviço?");
    if (!confirmar) return;

    try {
      setSavingId(id);
      setErro("");
      setMsg("");

      await processarServico({
        acao: "excluir",
        servico: {
          id,
        },
      });

      setServicos((prev) => prev.filter((item) => item.id !== id));
      setMsg("Serviço excluído com sucesso.");
    } catch (e: unknown) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao excluir serviço.");
    } finally {
      setSavingId(null);
    }
  }

  const listaFiltrada = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return servicos.filter((item) => {
      const ativoAtual = item.ativo ?? item.status === "ativo";

      const bateBusca =
        !termo ||
        item.nome?.toLowerCase().includes(termo) ||
        item.categoria?.toLowerCase().includes(termo);

      const bateStatus =
        statusFiltro === "todos" ||
        (statusFiltro === "ativo" && ativoAtual) ||
        (statusFiltro === "inativo" && !ativoAtual);

      return bateBusca && bateStatus;
    });
  }, [servicos, busca, statusFiltro]);

  if (loading || !acessoCarregado) {
    return <div className="p-6 text-sm text-zinc-600">Carregando serviços...</div>;
  }

  if (permissoes && !permissoes.servicos_ver) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Você não tem permissão para acessar Serviços.
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
              <h1 className="text-2xl font-bold md:text-3xl">Serviços</h1>
              <p className="mt-2 text-sm text-zinc-500">
                Gerencie serviços, agenda, comissão, tempo e custo.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/servicos-extras"
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
              >
                Ver serviços extras
              </Link>

              {podeGerenciar ? (
                <Link
                  href="/servicos/novo"
                className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95"
                >
                  + Novo serviço
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <ComissaoHelpPanel
          eyebrow="Comissão"
          title="A configuração principal fica dentro de cada serviço"
          description="Para o usuário final ficar menos perdido, o melhor fluxo é sempre o mesmo: defina o padrão no serviço, personalize só exceções por profissional e deixe as taxas gerais em Configurações."
          steps={[
            {
              title: "Abra o serviço",
              description: "É no cadastro do serviço que a comissão principal é definida.",
            },
            {
              title: "Use exceções com moderação",
              description:
                "Se um profissional foge do padrão, ajuste só aquele vínculo dentro do próprio serviço.",
            },
            {
              title: "Revise as taxas gerais",
              description:
                "Repasses e desconto de maquininha ficam em Configurações e impactam o financeiro inteiro do salão.",
            },
          ]}
        >
          <div className="flex flex-wrap gap-3">
            <Link
              href="/configuracoes"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Abrir Configurações
            </Link>
          </div>
        </ComissaoHelpPanel>

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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <input
              type="text"
              placeholder="Buscar por nome ou categoria"
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
              <option value="todos">Todos</option>
              <option value="ativo">Apenas ativos</option>
              <option value="inativo">Apenas inativos</option>
            </select>

            <div className="flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              Total: <strong className="ml-2 text-zinc-900">{listaFiltrada.length}</strong>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          {listaFiltrada.length === 0 ? (
            <div className="p-6 text-sm text-zinc-600">Nenhum serviço encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Serviço
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Categoria
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Duração
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Pausa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Preço
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Comissão
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-200 bg-white">
                  {listaFiltrada.map((item) => {
                    const ativo = item.ativo ?? item.status === "ativo";

                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-zinc-900">{item.nome}</p>
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-700">
                          {item.categoria || "-"}
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-700">
                          {item.duracao_minutos || 0} min
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-700">
                          {item.pausa_minutos || 0} min
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-700">
                          {item.preco_variavel
                            ? `A partir de ${formatCurrency(item.preco_padrao)}`
                            : formatCurrency(item.preco_padrao)}
                        </td>

                        <td className="px-4 py-4 text-sm text-zinc-700">
                          {Number(item.comissao_percentual_padrao ?? 0).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          %
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              ativo
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-zinc-200 text-zinc-700"
                            }`}
                          >
                            {ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            {podeGerenciar ? (
                              <>
                                <Link
                                  href={`/servicos/${item.id}`}
                                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                                >
                                  Editar
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => alternarStatus(item)}
                                  disabled={savingId === item.id}
                                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                                >
                                  {ativo ? "Inativar" : "Ativar"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => excluirServico(item.id)}
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
